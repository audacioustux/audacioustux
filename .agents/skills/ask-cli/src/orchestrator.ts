import { isAbsolute, relative, resolve } from "jsr:@std/path@1";
import { defaultConfigFile, loadConfig as loadConfigDefault } from "./core/config.ts";
import { loadAgyActualModel } from "./agents/agy.ts";
import * as claude from "./agents/claude.ts";
import * as agy from "./agents/agy.ts";
import * as pi from "./agents/pi.ts";
import { readTextFileBounded } from "./sys/files.ts";
import { type GitOutput, gitOutput as gitOutputDefault } from "./sys/git.ts";
import {
  expandHome as expandHomeDefault,
  findRepoRoot as findRepoRootDefault,
} from "./sys/paths.ts";
import { type CommandRunner, runChildInherit } from "./sys/process.ts";
import type { RunCliArgs } from "./cli/args.ts";

type AgentId = "claude" | "agy" | "pi";
type AgentModule = {
  buildCommand: (input: {
    prompt: string;
    resume?: string;
    model?: string;
    name?: string;
    newSessionId?: string;
    cwd: string;
  }) => { bin: string; args: string[]; cwd: string };
  promptIdentity: (model?: string) => string;
  sessionName: (input: { mode: string; stamp: string }) => string;
};
const AGENT_MODULES: Record<AgentId, AgentModule> = {
  claude: claude as unknown as AgentModule,
  agy: agy as unknown as AgentModule,
  pi: pi as unknown as AgentModule,
};

const SUBJECT_FILE_BYTE_LIMIT = 20_000;
const DIFF_STAT_BYTE_LIMIT = 64_000;
const DIFF_BODY_BYTE_LIMIT = 1_000_000;

const REVIEW_RULES = [
  "Use any resumed session/conversation history only as optional background; ignore it if it is unrelated.",
  "Do not edit files. Do not implement fixes. Do not run destructive commands.",
  "Be direct, skeptical, and specific. Prefer concrete risks and actionable changes over generic advice.",
].join("\n");

function defaultWriteStderr(text: string): void {
  Deno.stderr.writeSync(new TextEncoder().encode(text));
}

type SubjectRead = {
  text: string;
  resolvedPath: string;
  truncated: boolean;
};

export type RunDeps = {
  loadConfig: (configFile: string) => Promise<{ agents: Record<string, { model?: string }> }>;
  gitOutput: (args: string[], cwd: string, maxBytes: number) => Promise<GitOutput>;
  readSubjectFile: (
    subject: string,
    invocationCwd: string,
    repoRoot: string,
  ) => Promise<SubjectRead>;
  findRepoRoot: (cwd: string) => Promise<string>;
  loadAgyActualModel: (settingsFile: string) => Promise<{ actual: string | undefined }>;
  expandHome: (path: string) => string;
  now: () => Date;
  randomUUID: () => string;
  runChild: CommandRunner;
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
  currentCwd: () => string;
  env: () => Record<string, string | undefined>;
};

export function createDefaultDeps(
  writeStderr: (text: string) => void = defaultWriteStderr,
): RunDeps {
  return {
    loadConfig: async (configFile) => {
      // I6: distinguish "missing file" (normal) from "malformed file"
      // (the user has a config and we ignored it). We re-implement the
      // swallow-and-warn here so the warning goes to the wrapper's
      // stderr instead of being silently dropped.
      const result = await loadConfigDefault(configFile);
      if (!configFile) return result;
      let stat: Deno.FileInfo | undefined;
      try {
        stat = await Deno.stat(configFile);
      } catch {
        return result;
      }
      if (!stat.isFile) return result;
      // File exists; try to read and parse. If anything goes wrong,
      // log to stderr.
      try {
        const raw = await Deno.readTextFile(configFile);
        const parsed: unknown = JSON.parse(raw);
        if (
          !parsed || typeof parsed !== "object" || !("agents" in parsed) ||
          !parsed.agents || typeof parsed.agents !== "object"
        ) {
          writeStderr(
            `ask-cli: config.json at ${configFile} has no agents block; ignoring it\n`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeStderr(
          `ask-cli: config.json at ${configFile} could not be read (${message}); ignoring it\n`,
        );
      }
      return result;
    },
    gitOutput: gitOutputDefault,
    readSubjectFile: readSubjectFileDefault,
    findRepoRoot: findRepoRootDefault,
    loadAgyActualModel,
    expandHome: expandHomeDefault,
    now: () => new Date(),
    randomUUID: () => crypto.randomUUID(),
    runChild: runChildInherit,
    writeStdout: (text) => Deno.stdout.writeSync(new TextEncoder().encode(text)),
    writeStderr,
    currentCwd: () => Deno.cwd(),
    env: () => ({
      ASK_AI_MODEL_CLAUDE: Deno.env.get("ASK_AI_MODEL_CLAUDE"),
      ASK_AI_MODEL_AGY: Deno.env.get("ASK_AI_MODEL_AGY"),
      ASK_AI_MODEL_PI: Deno.env.get("ASK_AI_MODEL_PI"),
    }),
  };
}

function ensureInsideRepo(repoRoot: string, candidate: string, realCandidate: string): void {
  const realRoot = Deno.realPathSync(repoRoot);
  const rel = relative(realRoot, realCandidate);
  const inside = rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  if (!inside) {
    throw new Error(
      `subject path "${candidate}" resolves outside the repo root (${repoRoot}); ` +
        `refusing to read it. Move the file inside the repo or pass it as a question.`,
    );
  }
}

async function readSubjectFileDefault(
  subject: string,
  invocationCwd: string,
  repoRoot: string,
): Promise<SubjectRead> {
  if (!subject) return { text: "", resolvedPath: "", truncated: false };
  for (const candidate of [resolve(invocationCwd, subject), resolve(repoRoot, subject)]) {
    try {
      const stats = await Deno.stat(candidate);
      if (!stats.isFile) continue;
      const realCandidate = await Deno.realPath(candidate);
      ensureInsideRepo(repoRoot, candidate, realCandidate);
      const read = await readTextFileBounded(realCandidate, SUBJECT_FILE_BYTE_LIMIT);
      return { text: read.text, resolvedPath: realCandidate, truncated: read.truncated };
    } catch (error) {
      if (error instanceof Error && error.message.includes("outside the repo root")) throw error;
      // Try next candidate.
    }
  }
  return { text: "", resolvedPath: "", truncated: false };
}

function resolveModel(
  agent: AgentId,
  cliModel: string | undefined,
  env: Record<string, string | undefined>,
  config: { agents: Record<string, { model?: string }> },
): { preferred: string | undefined; source: "cli" | "env" | "config" | "default" } {
  if (cliModel && cliModel.trim()) return { preferred: cliModel.trim(), source: "cli" };
  const envKey = `ASK_AI_MODEL_${agent.toUpperCase()}`;
  const fromEnv = env[envKey]?.trim();
  if (fromEnv) return { preferred: fromEnv, source: "env" };
  const fromConfig = config.agents[agent]?.model?.trim();
  if (fromConfig) return { preferred: fromConfig, source: "config" };
  return { preferred: undefined, source: "default" };
}

function buildPromptText(
  mode: RunCliArgs["mode"],
  subject: string,
  subjectText: string,
  extra: string,
  base: string,
  head: string,
  diff: string,
  identity: string,
): string {
  const target = subjectText
    ? `${subject}\n\nTarget file contents (bounded):\n\`\`\`text\n${subjectText}\n\`\`\``
    : subject;
  const suffix = extra ? `\n\nAdditional instructions:\n${extra}` : "";
  switch (mode) {
    case "ask":
      return `${identity}\n\n${REVIEW_RULES}\n\nQuestion or task:\n${target}${suffix}`;
    case "plan":
      return `${identity}\n\n${REVIEW_RULES}\n\nReview this plan for correctness, missing steps, unclear assumptions, sequencing risk, test coverage, and overengineering:\n${target}${suffix}`;
    case "adversarial":
      return `${identity}\n\n${REVIEW_RULES}\n\nPerform an adversarial review of this target. Attack assumptions, hidden coupling, failure modes, security/operability risks, and weak tests. Return the strongest objections first, then suggested changes:\n${target}${suffix}`;
    case "review":
      return `${identity}\n\n${REVIEW_RULES}\n\nPerform a read-only adversarial code review for ${base}..${head}. Return findings by severity with evidence and a merge verdict.\n\nDiff:\n${diff}${suffix}`;
  }
  throw new Error(`Unsupported mode: ${mode}`);
}

function buildCommand(
  agent: AgentId,
  args: RunCliArgs,
  prompt: string,
  resume: string | undefined,
  newSessionId: string,
  repoRoot: string,
  modelPreferred: string | undefined,
) {
  const mod = AGENT_MODULES[agent];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return mod.buildCommand({
    prompt,
    resume,
    model: modelPreferred,
    name: mod.sessionName({ mode: args.mode, stamp }),
    newSessionId,
    cwd: repoRoot,
  });
}

function commandForSummary(
  command: { bin: string; args: string[] },
  prompt: string,
): string[] {
  return [
    command.bin,
    ...command.args.map((arg) =>
      arg === prompt ? `[prompt redacted: ${prompt.length} chars]` : arg
    ),
  ];
}

function redactedPromptMeta(prompt: string) {
  return { redacted: true, chars: prompt.length };
}

export async function runAskAi(args: RunCliArgs, deps: RunDeps): Promise<number> {
  if (args.mode === "review") {
    if (args.positional.length > 0) {
      throw new Error("review mode does not take a positional subject; use --base/--head");
    }
  } else {
    if (args.positional.join(" ").trim() === "") {
      throw new Error(`${args.mode} mode requires a question, file path, or description`);
    }
  }

  const configFile = args.configFile ?? defaultConfigFile(import.meta.url);
  const config = await deps.loadConfig(configFile);
  const invocationCwd = args.cwd ? resolve(args.cwd) : deps.currentCwd();
  const repoRoot = await deps.findRepoRoot(invocationCwd);
  const env = deps.env();
  const model = resolveModel(args.agent, args.model, env, config);

  // Agy has no --model flag. Reject when the caller explicitly passed
  // --model (source: "cli"). When the preferred model came from env or
  // config we still proceed but emit a stderr warning after the
  // invocation, because the user may have set the env var for all
  // agents and not realized agy ignores it.
  if (args.agent === "agy" && model.preferred && model.source === "cli") {
    throw new Error(
      `--model is not supported by agy; agy uses the model configured in ` +
        `${agy.SETTINGS_PATH_HINT}. Edit that file or drop --model.`,
    );
  }

  // Agy model-mismatch warning: read the actual configured model so the
  // dry-run summary and stderr are honest about which model will run.
  let agyActualModel: string | undefined;
  if (args.agent === "agy") {
    const settingsFile = deps.expandHome(agy.SETTINGS_PATH_HINT);
    agyActualModel = (await deps.loadAgyActualModel(settingsFile)).actual;
  }

  let prompt: string;
  let promptMeta: Record<string, unknown> = {};
  if (args.mode === "review") {
    const range = `${args.base}..${args.head}`;
    const stat = await deps.gitOutput(
      ["diff", "--stat", range, "--"],
      repoRoot,
      DIFF_STAT_BYTE_LIMIT,
    );
    if (stat.status !== 0 && !stat.stdoutTruncated) {
      throw new Error(`git diff --stat failed: ${stat.stderr}`);
    }
    const diff = await deps.gitOutput(
      ["diff", "--no-ext-diff", "--find-renames", "--function-context", range, "--"],
      repoRoot,
      DIFF_BODY_BYTE_LIMIT,
    );
    if (diff.status !== 0 && !diff.stdoutTruncated) {
      throw new Error(`git diff failed: ${diff.stderr}`);
    }
    const statText = stat.stdout + (stat.truncated ? "\n[ask-cli: diff stat truncated]" : "");
    const diffText = diff.stdout + (diff.truncated ? "\n[ask-cli: diff truncated]" : "");
    prompt = buildPromptText(
      args.mode,
      `${args.base}..${args.head}`,
      "",
      args.extra,
      args.base,
      args.head,
      `## Diff stat\n${statText}\n\n## Diff\n${diffText}`,
      AGENT_MODULES[args.agent].promptIdentity(model.preferred),
    );
    promptMeta = { diffTruncated: diff.truncated, diffStatTruncated: stat.truncated };
  } else {
    const subject = args.positional.join(" ").trim();
    let subjectFile: SubjectRead = { text: "", resolvedPath: "", truncated: false };
    // I2: --dry-run must not read the subject file from disk. The
    // summary uses the raw subject path; the actual file is read only
    // when we are about to invoke the child CLI.
    if (!args.dryRun) {
      subjectFile = await deps.readSubjectFile(subject, invocationCwd, repoRoot);
    }
    const displaySubject = subjectFile.resolvedPath
      ? `${subject} (${subjectFile.resolvedPath})`
      : subject;
    const subjectText = subjectFile.truncated
      ? `${subjectFile.text}\n\n[ask-cli: target file content truncated]`
      : subjectFile.text;
    prompt = buildPromptText(
      args.mode,
      displaySubject,
      subjectText,
      args.extra,
      args.base,
      args.head,
      "",
      AGENT_MODULES[args.agent].promptIdentity(model.preferred),
    );
    promptMeta = {
      subjectTruncated: subjectFile.truncated,
      targetResolvedPath: subjectFile.resolvedPath || undefined,
    };
  }

  // I-Agy-2: --fresh used to mean "no newSessionId", which let the child
  // CLI fall back to its own default (potentially auto-resuming). The
  // intent of --fresh is a brand-new thread, so we always generate one
  // unless --resume is set.
  const newSessionId = args.resume ? undefined : deps.randomUUID();
  const command = buildCommand(
    args.agent,
    args,
    prompt,
    args.resume,
    newSessionId ?? "",
    repoRoot,
    model.preferred,
  );

  const summary = {
    agent: args.agent,
    configFile,
    model: {
      preferred: model.preferred,
      actual: agyActualModel,
      source: model.source,
    },
    resume: args.resume,
    fresh: args.fresh,
    newSessionId: args.resume ? null : newSessionId,
    prompt: { ...redactedPromptMeta(prompt), ...promptMeta },
    command: commandForSummary(command, prompt),
  };

  // I1: agy model-mismatch warning fires regardless of --dry-run so the
  // agent sees the discrepancy even when it never actually invokes agy.
  if (args.agent === "agy" && model.preferred && model.preferred !== agyActualModel) {
    const actual = agyActualModel ? `model "${agyActualModel}"` : "its configured/default model";
    deps.writeStderr(
      `ask-cli: agy will use ${actual} (from ${agy.SETTINGS_PATH_HINT}); ` +
        `you requested "${model.preferred}" but agy does not accept --model.\n`,
    );
  }

  if (args.dryRun) {
    deps.writeStdout(JSON.stringify(summary, null, 2) + "\n");
    return 0;
  }

  // I-Agy-1: the agent must be able to discover the new session id so it
  // can resume later. Print it to stderr (stdout is reserved for the
  // dry-run summary, which is also where it would have been available).
  if (newSessionId) {
    deps.writeStderr(`ask-cli: new session id = ${newSessionId}\n`);
  }

  return await deps.runChild(command);
}
