import { parseArgs } from "jsr:@std/cli@1/parse-args";

export const AGENT_IDS = ["claude", "agy", "pi"] as const;
export const MODES = ["ask", "plan", "adversarial", "review"] as const;

export type AgentId = typeof AGENT_IDS[number];
export type Mode = typeof MODES[number];

export type RunCliArgs = {
  kind: "run";
  agent: AgentId;
  mode: Mode;
  positional: string[];
  base: string;
  head: string;
  fresh: boolean;
  resume?: string;
  model?: string;
  configFile?: string;
  extra: string;
  cwd?: string;
  dryRun: boolean;
};

export type ParsedCliArgs =
  | { kind: "help"; error: string | undefined }
  | RunCliArgs;

function isAgent(value: string): value is AgentId {
  return (AGENT_IDS as readonly string[]).includes(value);
}

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

function stringValue(value: unknown, flag: string): string | undefined {
  if (value === undefined || value === false) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${flag} requires a non-empty value`);
  }
  return value.trim();
}

function gitRefValue(value: unknown, flag: string): string | undefined {
  const ref = stringValue(value, flag);
  if (ref && ref.startsWith("-")) {
    throw new Error(`${flag} must be a git ref, not an option`);
  }
  return ref;
}

function help(error?: string): ParsedCliArgs {
  return { kind: "help", error };
}

// Resumable flags that would bypass --fork-session or repo scoping.
// Rejected hard: --continue / -c resume the most recent session globally,
// ignoring the current repo. This is the single most important safety rule.
function rejectResumeShortcut(rest: string[]): void {
  for (const arg of rest) {
    if (arg === "--continue" || arg === "-c") {
      throw new Error(
        "--continue/-c is not allowed; it resumes the most recent session globally. " +
          "Use --resume <id> with a session id you obtained from this skill.",
      );
    }
  }
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const [agentRaw, modeRaw, ...rest] = argv;
  if (!agentRaw || agentRaw === "--help" || agentRaw === "-h") return help();
  if (!isAgent(agentRaw)) {
    return help(`Unknown agent: ${agentRaw}. Known: ${AGENT_IDS.join(", ")}`);
  }
  if (!modeRaw || modeRaw === "--help" || modeRaw === "-h") return help();
  if (!isMode(modeRaw)) {
    return help(`Unknown mode: ${modeRaw}. Known: ${MODES.join(", ")}`);
  }

  rejectResumeShortcut(rest);

  const parsed = parseArgs(rest, {
    boolean: ["fresh", "dry-run", "help"],
    string: ["resume", "model", "config", "base", "head", "extra", "cwd"],
    default: {
      base: "HEAD~1",
      head: "HEAD",
      fresh: false,
      "dry-run": false,
      help: false,
    },
    alias: { h: "help" },
    stopEarly: false,
    unknown: (arg) => !arg.startsWith("-"),
  });

  if (parsed.help === true) return help();

  const resume = stringValue(parsed.resume, "--resume");
  const fresh = parsed.fresh === true;
  if (resume && fresh) throw new Error("--resume and --fresh are mutually exclusive");

  return {
    kind: "run",
    agent: agentRaw,
    mode: modeRaw,
    positional: parsed._.map(String),
    base: gitRefValue(parsed.base, "--base") ?? "HEAD~1",
    head: gitRefValue(parsed.head, "--head") ?? "HEAD",
    fresh,
    resume,
    model: stringValue(parsed.model, "--model"),
    configFile: stringValue(parsed.config, "--config"),
    extra: stringValue(parsed.extra, "--extra") ?? "",
    cwd: stringValue(parsed.cwd, "--cwd"),
    dryRun: parsed["dry-run"] === true,
  };
}
