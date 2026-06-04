import { join } from "jsr:@std/path@1";
import type {
  BuildCommandInput,
  ModelInfo,
  RankSessionsInput,
  RankSessionsResult,
  ResolveModelInput,
  SessionOptsInput,
} from "../agent.ts";
import { resolvePreferredModel } from "../core/model.ts";
import { scoreSession, type SessionCandidate } from "../core/scoring.ts";
import { MAX_SESSION_FILES, SESSION_TEXT_BYTE_LIMIT } from "../core/limits.ts";
import { readJsonLines } from "../sys/files.ts";
import { encodeClaudeProjectPath, homeDir } from "../sys/paths.ts";
import type { ChildCommand } from "../sys/process.ts";

export const id = "claude" as const;
export const displayName = "Claude";
export const cliBin = "claude";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function sessionOpts({ repoRoot, home = homeDir() }: SessionOptsInput) {
  return { sessionsDir: join(home, ".claude", "projects", encodeClaudeProjectPath(repoRoot)) };
}

export function resolveModel(
  { cliModel, env, config }: ResolveModelInput = {},
): Promise<ModelInfo> {
  const { preferred, source } = resolvePreferredModel({ agentId: id, cliModel, env, config });
  return Promise.resolve({ preferred, actual: preferred, source, modelKnown: undefined });
}

export function promptIdentity({ preferred, actual }: ModelInfo): string {
  const name = preferred ?? actual;
  return name
    ? `You are ${name} acting as an independent second brain.`
    : "You are Claude acting as an independent second brain.";
}

export function sessionName({ mode, stamp }: { mode: string; stamp: string }): string {
  return `ask-cli-claude-${mode}-${stamp}`;
}

function contentText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content.map((part) => {
    if (!isObject(part)) return "";
    if (part.type === "tool_result") return "";
    if (typeof part.text === "string") return part.text;
    if (part.type === "tool_use" && isObject(part.input)) {
      return JSON.stringify(part.input).slice(0, 2_000);
    }
    return "";
  }).filter(Boolean).join("\n");
}

async function summarizeSession(filePath: string): Promise<{
  id: string;
  lastTimestamp: Date;
  text: string;
  warnings: string[];
}> {
  let sessionId = filePath.split(/[\\/]/).at(-1)?.replace(/\.jsonl$/, "") ?? filePath;
  let lastTimestamp: Date | undefined;
  const fragments: string[] = [];
  const warnings: string[] = [];

  for await (const line of readJsonLines(filePath)) {
    if (line.error) {
      warnings.push(`line ${line.line}: ${line.error}`);
      continue;
    }
    const entry = line.value;
    if (!isObject(entry)) continue;

    if (typeof entry.sessionId === "string" && entry.sessionId.trim()) {
      sessionId = entry.sessionId.trim();
    }
    if (typeof entry.timestamp === "string") {
      const ts = new Date(entry.timestamp);
      if (!Number.isNaN(ts.valueOf()) && (!lastTimestamp || ts > lastTimestamp)) {
        lastTimestamp = ts;
      }
    }
    if (typeof entry.summary === "string") fragments.push(entry.summary);
    if (typeof entry.gitBranch === "string") fragments.push(entry.gitBranch);
    if (isObject(entry.message)) {
      if (entry.message.role === "tool_result") continue;
      fragments.push(String(entry.message.role ?? ""));
      fragments.push(contentText(entry.message.content));
    }
  }

  const stats = await Deno.stat(filePath);
  const text = fragments.filter(Boolean).join("\n").slice(-SESSION_TEXT_BYTE_LIMIT);
  return {
    id: sessionId,
    lastTimestamp: lastTimestamp ?? stats.mtime ?? new Date(0),
    text,
    warnings,
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function rankSessions(
  { sessionsDir, query, now = new Date() }: RankSessionsInput,
): Promise<RankSessionsResult> {
  if (typeof sessionsDir !== "string" || !(await exists(sessionsDir))) {
    return { ok: true, candidates: [], warnings: [] };
  }

  const candidates: SessionCandidate[] = [];
  const warnings = [];
  let scanned = 0;
  for await (const entry of Deno.readDir(sessionsDir)) {
    if (!entry.isFile || !entry.name.endsWith(".jsonl")) continue;
    if (scanned >= MAX_SESSION_FILES) {
      warnings.push({
        source: sessionsDir,
        message: `Session scan capped at ${MAX_SESSION_FILES} files`,
      });
      break;
    }
    scanned += 1;
    const filePath = join(sessionsDir, entry.name);
    const summary = await summarizeSession(filePath);
    warnings.push(...summary.warnings.map((message) => ({ source: filePath, message })));
    candidates.push({
      id: summary.id,
      lastTimestamp: summary.lastTimestamp,
      text: summary.text,
      trusted: true,
      ...scoreSession(summary, query, now),
    });
  }

  candidates.sort((a, b) =>
    b.score - a.score || b.lastTimestamp.getTime() - a.lastTimestamp.getTime()
  );
  return { ok: true, candidates, warnings };
}

export function buildCommand({
  prompt,
  sessionId,
  model,
  name,
  newSessionId,
  cwd,
  permissionMode = "plan",
  forkSession = true,
}: BuildCommandInput): ChildCommand {
  const args = ["-p"];
  if (model) args.push("--model", model);
  args.push("--permission-mode", permissionMode);
  if (name) args.push("--name", name);
  if (sessionId) {
    args.push("--resume", sessionId);
    if (forkSession) args.push("--fork-session");
  } else if (newSessionId) {
    args.push("--session-id", newSessionId);
  }
  args.push(prompt);
  return { bin: cliBin, args, cwd };
}
