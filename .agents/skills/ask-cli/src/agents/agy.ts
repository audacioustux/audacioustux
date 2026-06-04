import { join, resolve } from "jsr:@std/path@1";
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
import { homeDir } from "../sys/paths.ts";
import type { ChildCommand } from "../sys/process.ts";
import { loadHistoryByConversation, loadProjectMap } from "../storage/agy.ts";

export const id = "agy" as const;
export const displayName = "Antigravity (agy)";
export const cliBin = "agy";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function sessionOpts({ repoRoot, home = homeDir() }: SessionOptsInput) {
  const root = join(home, ".gemini", "antigravity-cli");
  return {
    settingsFile: join(root, "settings.json"),
    historyFile: join(root, "history.jsonl"),
    projectsFile: join(root, "cache", "projects.json"),
    repoRoot: resolve(repoRoot),
  };
}

export async function loadActualModel(
  settingsFile: string | undefined,
): Promise<string | undefined> {
  if (!settingsFile) return undefined;
  try {
    const parsed = JSON.parse(await Deno.readTextFile(settingsFile));
    if (isObject(parsed) && typeof parsed.model === "string" && parsed.model.trim()) {
      return parsed.model.trim();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function resolveModel({
  cliModel,
  env,
  config,
  settingsFile,
}: ResolveModelInput = {}): Promise<ModelInfo> {
  const { preferred, source } = resolvePreferredModel({ agentId: id, cliModel, env, config });
  const actual = await loadActualModel(settingsFile);
  return { preferred, actual, source, modelKnown: undefined };
}

export function promptIdentity({ preferred, actual }: ModelInfo): string {
  const name = actual ?? preferred;
  return name
    ? `You are ${name} acting as an independent second brain.`
    : "You are Antigravity (agy) acting as an independent second brain.";
}

export function sessionName({ mode, stamp }: { mode: string; stamp: string }): string {
  return `ask-cli-agy-${mode}-${stamp}`;
}

export async function rankSessions({
  historyFile,
  projectsFile,
  repoRoot,
  query,
  now = new Date(),
}: RankSessionsInput): Promise<RankSessionsResult> {
  const [historyResult, projectResult] = await Promise.all([
    loadHistoryByConversation(typeof historyFile === "string" ? historyFile : undefined),
    loadProjectMap(typeof projectsFile === "string" ? projectsFile : undefined),
  ]);
  const warnings = [...historyResult.warnings, ...projectResult.warnings];
  const scopedConversation = typeof repoRoot === "string"
    ? projectResult.projects.get(resolve(repoRoot))
    : undefined;
  if (!scopedConversation) {
    warnings.push({
      source: typeof projectsFile === "string" ? projectsFile : "agy projects",
      message: "No scoped agy conversation mapping for repo; candidates are untrusted",
    });
  }

  const candidates: SessionCandidate[] = [];
  for (const [conversationId, entry] of historyResult.history.entries()) {
    const trusted = scopedConversation !== undefined && conversationId === scopedConversation;
    const session = {
      id: conversationId,
      text: entry.display,
      lastTimestamp: new Date(entry.timestamp || 0),
      trusted,
      warnings: trusted ? [] : ["Not scoped to current repo"],
      ...scoreSession(
        { text: entry.display, lastTimestamp: new Date(entry.timestamp || 0) },
        query,
        now,
      ),
    } satisfies SessionCandidate;
    candidates.push(session);
  }

  candidates.sort((a, b) =>
    b.score - a.score || b.lastTimestamp.getTime() - a.lastTimestamp.getTime()
  );
  return { ok: true, candidates, warnings };
}

export function buildCommand({ prompt, sessionId, cwd }: BuildCommandInput): ChildCommand {
  const args = ["-p"];
  if (sessionId) args.push("--conversation", sessionId);
  args.push(prompt);
  return { bin: cliBin, args, cwd };
}
