import { parseArgs } from "@std/cli/parse-args";
import { DEFAULT_THRESHOLD } from "../core/limits.ts";

export const AGENT_IDS = ["claude", "agy", "pi"] as const;
export const MODES = ["ask", "plan", "adversarial", "review", "sessions"] as const;

export type AgentId = typeof AGENT_IDS[number];
export type Mode = typeof MODES[number];

export type ParsedCliArgs =
  | { kind: "help"; error: string | undefined }
  | {
    kind: "run";
    agent: AgentId;
    mode: Mode;
    positional: string[];
    base: string;
    head: string;
    fresh: boolean;
    threshold: number;
    model?: string;
    configFile?: string;
    resume?: string;
    sandbox: boolean;
    noSandbox: boolean;
    extra: string;
    cwd?: string;
    dryRun: boolean;
  };

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

function help(error?: string): ParsedCliArgs {
  return { kind: "help", error };
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

  const parsed = parseArgs(rest, {
    boolean: ["fresh", "sandbox", "no-sandbox", "dry-run", "help"],
    string: ["resume", "threshold", "model", "config", "base", "head", "extra", "cwd"],
    default: {
      base: "HEAD~1",
      head: "HEAD",
      fresh: false,
      sandbox: false,
      "no-sandbox": false,
      "dry-run": false,
      help: false,
    },
    alias: { h: "help" },
    stopEarly: false,
    unknown: (arg) => !arg.startsWith("-"),
  });

  if (parsed.help === true) return help();

  const thresholdRaw = stringValue(parsed.threshold, "--threshold");
  const threshold = thresholdRaw === undefined ? DEFAULT_THRESHOLD : Number(thresholdRaw);
  if (!Number.isFinite(threshold)) throw new Error("--threshold must be a number");

  const resume = stringValue(parsed.resume, "--resume");
  const fresh = parsed.fresh === true;
  if (resume && fresh) throw new Error("--resume and --fresh are mutually exclusive");

  return {
    kind: "run",
    agent: agentRaw,
    mode: modeRaw,
    positional: parsed._.map(String),
    base: stringValue(parsed.base, "--base") ?? "HEAD~1",
    head: stringValue(parsed.head, "--head") ?? "HEAD",
    fresh,
    threshold,
    model: stringValue(parsed.model, "--model"),
    configFile: stringValue(parsed.config, "--config"),
    resume,
    sandbox: parsed.sandbox === true,
    noSandbox: parsed["no-sandbox"] === true,
    extra: stringValue(parsed.extra, "--extra") ?? "",
    cwd: stringValue(parsed.cwd, "--cwd"),
    dryRun: parsed["dry-run"] === true,
  };
}
