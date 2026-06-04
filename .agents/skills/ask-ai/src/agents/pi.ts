import { join } from "@std/path";
import type {
  BuildCommandInput,
  ModelInfo,
  RankSessionsInput,
  RankSessionsResult,
  ResolveModelInput,
  SessionOptsInput,
} from "../agent.ts";
import { MAX_SESSION_FILES, SESSION_TEXT_BYTE_LIMIT } from "../core/limits.ts";
import { resolvePreferredModel } from "../core/model.ts";
import { scoreSession, type SessionCandidate } from "../core/scoring.ts";
import { readJsonLines } from "../sys/files.ts";
import { encodePiProjectPath, homeDir } from "../sys/paths.ts";
import type { ChildCommand } from "../sys/process.ts";

export const id = "pi" as const;
export const displayName = "Pi";
export const cliBin = "pi";

const READ_ONLY_TOOLS = "read,grep,find,ls";

type JsonObject = Record<string, unknown>;

export type PiSettings = {
  defaultProvider?: string;
  defaultModel?: string;
  defaultThinkingLevel?: string;
  enabledModels: string[];
};

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function sessionOpts({ repoRoot, home = homeDir() }: SessionOptsInput) {
  return {
    sessionsDir: join(home, ".pi", "agent", "sessions", encodePiProjectPath(repoRoot)),
    settingsFile: join(home, ".pi", "agent", "settings.json"),
    repoRoot,
  };
}

export async function loadSettings(settingsFile: string | undefined): Promise<PiSettings> {
  if (!settingsFile) return { enabledModels: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(await Deno.readTextFile(settingsFile));
  } catch {
    return { enabledModels: [] };
  }
  if (!isObject(parsed)) return { enabledModels: [] };

  return {
    defaultProvider: nonBlank(parsed.defaultProvider),
    defaultModel: nonBlank(parsed.defaultModel),
    defaultThinkingLevel: nonBlank(parsed.defaultThinkingLevel),
    enabledModels: Array.isArray(parsed.enabledModels)
      ? parsed.enabledModels.filter((value): value is string =>
        typeof value === "string" && value.trim() !== ""
      )
        .map((value) => value.trim())
      : [],
  };
}

function configuredDefaultModel(settings: PiSettings): string | undefined {
  if (!settings.defaultModel) return undefined;
  const base = settings.defaultModel.includes("/") || !settings.defaultProvider
    ? settings.defaultModel
    : `${settings.defaultProvider}/${settings.defaultModel}`;
  return settings.defaultThinkingLevel ? `${base}:${settings.defaultThinkingLevel}` : base;
}

function modelBase(model: string): string {
  return model.split(":")[0];
}

function knownModel(actual: string | undefined, enabledModels: string[]): boolean | undefined {
  if (!actual || enabledModels.length === 0) return undefined;
  return enabledModels.includes(actual) || enabledModels.includes(modelBase(actual));
}

export async function resolveModel({
  cliModel,
  env,
  config,
  settingsFile,
}: ResolveModelInput = {}): Promise<ModelInfo> {
  const settings = await loadSettings(settingsFile);
  const { preferred, source } = resolvePreferredModel({ agentId: id, cliModel, env, config });
  const actual = preferred ?? configuredDefaultModel(settings);
  return { preferred, actual, source, modelKnown: knownModel(actual, settings.enabledModels) };
}

export function promptIdentity({ preferred, actual }: ModelInfo): string {
  const name = actual ?? preferred;
  return name
    ? `You are ${name} acting as an independent second brain.`
    : "You are Pi acting as an independent second brain.";
}

export function sessionName({ mode, stamp }: { mode: string; stamp: string }): string {
  return `ask-ai-pi-${mode}-${stamp}`;
}

function contentText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content.map((part) => {
    if (!isObject(part)) return "";
    if (typeof part.text === "string") return part.text;
    if (typeof part.thinking === "string") return part.thinking;
    if (part.type === "toolCall") {
      const name = typeof part.name === "string" ? part.name : "";
      const args = isObject(part.arguments) ? JSON.stringify(part.arguments).slice(0, 2_000) : "";
      return `${name}\n${args}`.trim();
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

    if (typeof entry.timestamp === "string") {
      const ts = new Date(entry.timestamp);
      if (!Number.isNaN(ts.valueOf()) && (!lastTimestamp || ts > lastTimestamp)) {
        lastTimestamp = ts;
      }
    }

    if (entry.type === "session") {
      const idValue = nonBlank(entry.id);
      if (idValue) sessionId = idValue;
      const cwd = nonBlank(entry.cwd);
      const name = nonBlank(entry.name);
      if (cwd) fragments.push(cwd);
      if (name) fragments.push(name);
    } else if (entry.type === "model_change") {
      fragments.push(String(entry.provider ?? ""));
      fragments.push(String(entry.modelId ?? ""));
    } else if (entry.type === "thinking_level_change") {
      fragments.push(String(entry.thinkingLevel ?? ""));
    }

    if (isObject(entry.message) && entry.message.role !== "toolResult") {
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
}: BuildCommandInput): ChildCommand {
  const args = ["-p", "--tools", READ_ONLY_TOOLS];
  if (model) args.push("--model", model);
  if (name) args.push("--name", name);
  if (sessionId) args.push("--session", sessionId);
  else if (newSessionId) args.push("--session-id", newSessionId);
  args.push(prompt);
  return { bin: cliBin, args, cwd };
}
