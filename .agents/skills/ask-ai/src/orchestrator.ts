import { resolve } from "@std/path";
import type { Agent, AskAiConfig, ModelInfo } from "./agent.ts";
import type { ParsedCliArgs } from "./cli/args.ts";
import { defaultConfigFile, loadConfig as loadConfigDefault } from "./core/config.ts";
import {
  DIFF_BODY_BYTE_LIMIT,
  DIFF_STAT_BYTE_LIMIT,
  SUBJECT_FILE_BYTE_LIMIT,
} from "./core/limits.ts";
import { buildPrompt, buildSearchQuery } from "./core/prompts.ts";
import { selectSession, serializeCandidate, type SessionCandidate } from "./core/scoring.ts";
import { readTextFileBounded } from "./sys/files.ts";
import { findRepoRoot as findRepoRootDefault } from "./sys/paths.ts";
import { type GitOutput, gitOutput as gitOutputDefault } from "./sys/git.ts";
import { type CommandRunner, runChildInherit } from "./sys/process.ts";

export type RunCliArgs = Extract<ParsedCliArgs, { kind: "run" }>;

type SubjectRead = {
  text: string;
  resolvedPath: string;
  truncated: boolean;
};

export type AskAiDeps = {
  agents: Record<string, Agent>;
  now: () => Date;
  randomUUID: () => string;
  runChild: CommandRunner;
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
  currentCwd: () => string;
  env: () => Record<string, string | undefined>;
  findRepoRoot: (cwd: string) => Promise<string>;
  loadConfig: (configFile: string) => Promise<AskAiConfig>;
  gitOutput: (args: string[], cwd: string, maxBytes: number) => Promise<GitOutput>;
  readSubjectFile: (
    subject: string,
    invocationCwd: string,
    repoRoot: string,
  ) => Promise<SubjectRead>;
  mkdir: (path: string) => Promise<void>;
};

type SelectedSession = SessionCandidate | { id: string; score: "explicit" };

export function createDefaultDeps(agents: Record<string, Agent>): AskAiDeps {
  return {
    agents,
    now: () => new Date(),
    randomUUID: () => crypto.randomUUID(),
    runChild: runChildInherit,
    writeStdout: (text) => Deno.stdout.writeSync(new TextEncoder().encode(text)),
    writeStderr: (text) => Deno.stderr.writeSync(new TextEncoder().encode(text)),
    currentCwd: () => Deno.cwd(),
    env: () => ({
      ASK_AI_MODEL_CLAUDE: Deno.env.get("ASK_AI_MODEL_CLAUDE"),
      ASK_AI_MODEL_AGY: Deno.env.get("ASK_AI_MODEL_AGY"),
      ASK_AI_MODEL_PI: Deno.env.get("ASK_AI_MODEL_PI"),
      HOME: Deno.env.get("HOME"),
      PATH: Deno.env.get("PATH"),
      USERPROFILE: Deno.env.get("USERPROFILE"),
    }),
    findRepoRoot: findRepoRootDefault,
    loadConfig: loadConfigDefault,
    gitOutput: gitOutputDefault,
    readSubjectFile: readSubjectFileDefault,
    mkdir: async (path) => {
      await Deno.mkdir(path, { recursive: true });
    },
  };
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
      const read = await readTextFileBounded(candidate, SUBJECT_FILE_BYTE_LIMIT);
      return { text: read.text, resolvedPath: candidate, truncated: read.truncated };
    } catch {
      // Try next candidate.
    }
  }
  return { text: "", resolvedPath: "", truncated: false };
}

function selectedForSummary(selected: SelectedSession | undefined) {
  if (!selected) return undefined;
  return { id: selected.id, score: selected.score };
}

function candidatesForSummary(candidates: SessionCandidate[]) {
  return candidates.slice(0, 5).map(serializeCandidate);
}

function candidateListForSessions(candidates: SessionCandidate[]) {
  return candidates.slice(0, 10).map(serializeCandidate);
}

async function promptForReview({
  agent,
  args,
  repoRoot,
  modelInfo,
  deps,
}: {
  agent: Agent;
  args: RunCliArgs;
  repoRoot: string;
  modelInfo: ModelInfo;
  deps: AskAiDeps;
}): Promise<{ prompt: string; query: string }> {
  const range = `${args.base}..${args.head}`;
  const stat = await deps.gitOutput(
    ["diff", "--stat", range, "--"],
    repoRoot,
    DIFF_STAT_BYTE_LIMIT,
  );
  if (stat.status !== 0) throw new Error(`git diff --stat failed: ${stat.stderr}`);
  const diff = await deps.gitOutput(
    ["diff", "--no-ext-diff", "--find-renames", "--function-context", range, "--"],
    repoRoot,
    DIFF_BODY_BYTE_LIMIT,
  );
  if (diff.status !== 0) throw new Error(`git diff failed: ${diff.stderr}`);

  const statText = stat.stdout + (stat.truncated ? "\n[ask-ai: diff stat truncated]" : "");
  const diffText = diff.stdout + (diff.truncated ? "\n[ask-ai: diff truncated]" : "");
  const identity = agent.promptIdentity(modelInfo);
  return {
    prompt: buildPrompt({
      mode: "review",
      base: args.base,
      head: args.head,
      diff: `## Diff stat\n${statText}\n\n## Diff\n${diffText}`,
      extra: args.extra,
      identity,
    }),
    query: buildSearchQuery({
      mode: "review",
      subject: `${args.base} ${args.head}`,
      extra: args.extra,
      diffStat: statText,
    }),
  };
}

async function promptForSubject({
  agent,
  args,
  invocationCwd,
  repoRoot,
  modelInfo,
  deps,
}: {
  agent: Agent;
  args: RunCliArgs;
  invocationCwd: string;
  repoRoot: string;
  modelInfo: ModelInfo;
  deps: AskAiDeps;
}): Promise<{ prompt: string; query: string }> {
  const subject = args.positional.join(" ").trim();
  if (!subject && args.mode !== "sessions") {
    throw new Error(`${args.mode} mode requires a question, file path, or description`);
  }
  const subjectFile = await deps.readSubjectFile(subject, invocationCwd, repoRoot);
  const displaySubject = subjectFile.resolvedPath
    ? `${subject} (${subjectFile.resolvedPath})`
    : subject;
  const subjectText = subjectFile.truncated
    ? `${subjectFile.text}\n\n[ask-ai: target file content truncated]`
    : subjectFile.text;
  const promptMode = args.mode === "sessions" ? "ask" : args.mode;
  const identity = agent.promptIdentity(modelInfo);
  return {
    prompt: buildPrompt({
      mode: promptMode,
      subject: displaySubject,
      subjectText,
      extra: args.extra,
      identity,
    }),
    query: buildSearchQuery({
      mode: args.mode,
      subject,
      subjectText,
      extra: args.extra,
    }),
  };
}

export async function runAskAi(args: RunCliArgs, deps: AskAiDeps): Promise<number> {
  const agent = deps.agents[args.agent];
  if (!agent) throw new Error(`Unknown agent: ${args.agent}`);

  const configFile = args.configFile ?? defaultConfigFile(import.meta.url);
  const config = await deps.loadConfig(configFile);
  const invocationCwd = args.cwd ? resolve(args.cwd) : deps.currentCwd();
  const repoRoot = await deps.findRepoRoot(invocationCwd);
  const sessionOpts = agent.sessionOpts({ repoRoot });
  const modelInfo = await agent.resolveModel({
    cliModel: args.model,
    env: deps.env(),
    config,
    settingsFile: typeof sessionOpts.settingsFile === "string"
      ? sessionOpts.settingsFile
      : undefined,
  });

  const { prompt, query } = args.mode === "review"
    ? await promptForReview({ agent, args, repoRoot, modelInfo, deps })
    : await promptForSubject({ agent, args, invocationCwd, repoRoot, modelInfo, deps });

  let ranked: SessionCandidate[] = [];
  let selected: SelectedSession | undefined;
  const warnings = [];
  if (args.resume) {
    selected = { id: args.resume, score: "explicit" };
  } else if (!args.fresh) {
    const result = await agent.rankSessions({ ...sessionOpts, query });
    warnings.push(...result.warnings);
    if (result.ok) {
      ranked = result.candidates;
      selected = selectSession(ranked, { threshold: args.threshold });
    }
  }

  if (args.mode === "sessions") {
    deps.writeStdout(
      JSON.stringify(
        {
          agent: agent.id,
          sessions: candidateListForSessions(ranked),
          warnings,
        },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }

  const stamp = deps.now().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const command = agent.buildCommand({
    prompt,
    sessionId: selected?.id,
    model: modelInfo.preferred,
    name: agent.sessionName({ mode: args.mode, stamp }),
    newSessionId: selected ? undefined : deps.randomUUID(),
    cwd: repoRoot,
    sandbox: args.sandbox,
    noSandbox: args.noSandbox,
    forkSession: true,
  });

  const summary = {
    agent: agent.id,
    agentBin: agent.cliBin,
    configFile,
    preferred: modelInfo.preferred,
    actual: modelInfo.actual,
    source: modelInfo.source,
    modelKnown: modelInfo.modelKnown,
    selectedSession: selectedForSummary(selected),
    topCandidates: candidatesForSummary(ranked),
    warnings,
    command: [command.bin, ...command.args],
  };

  if (args.dryRun) {
    deps.writeStdout(JSON.stringify(summary, null, 2) + "\n");
    return 0;
  }

  if (
    agent.id === "agy" && modelInfo.preferred && modelInfo.actual &&
    modelInfo.preferred !== modelInfo.actual
  ) {
    deps.writeStderr(
      `ask-ai: note — requested model "${modelInfo.preferred}" differs from agy's configured model "${modelInfo.actual}" (source: settings.json). ` +
        `agy will use "${modelInfo.actual}". To change it, edit ~/.gemini/antigravity-cli/settings.json.\n`,
    );
  }

  const modelLabel = modelInfo.preferred ?? modelInfo.actual ?? "(CLI default)";
  deps.writeStderr(`ask-ai: model=${modelLabel} (source: ${modelInfo.source})\n`);
  deps.writeStderr(
    `ask-ai: ${
      selected ? `using session ${selected.id} (score ${selected.score})` : "creating a new session"
    }\n`,
  );

  return await deps.runChild(command);
}
