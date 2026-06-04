import { resolve } from "jsr:@std/path@1";
import { readJsonLines } from "../sys/files.ts";

export type AgyHistoryEntry = {
  display: string;
  timestamp: number;
};

export type AgyWarning = {
  source: string;
  message: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function loadHistoryByConversation(historyFile: string | undefined): Promise<{
  history: Map<string, AgyHistoryEntry>;
  warnings: AgyWarning[];
}> {
  const history = new Map<string, AgyHistoryEntry>();
  const warnings: AgyWarning[] = [];
  if (!historyFile) return { history, warnings };

  try {
    for await (const line of readJsonLines(historyFile)) {
      if (line.error) {
        warnings.push({ source: historyFile, message: `line ${line.line}: ${line.error}` });
        continue;
      }
      const entry = line.value;
      if (!isObject(entry)) continue;
      if (typeof entry.conversationId !== "string" || !entry.conversationId.trim()) continue;
      const timestamp = typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp)
        ? entry.timestamp
        : 0;
      const display = typeof entry.display === "string" ? entry.display : "";
      const previous = history.get(entry.conversationId);
      if (!previous || timestamp >= previous.timestamp) {
        history.set(entry.conversationId, { display, timestamp });
      }
    }
  } catch (error) {
    warnings.push({
      source: historyFile,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { history, warnings };
}

export async function loadProjectMap(projectsFile: string | undefined): Promise<{
  projects: Map<string, string>;
  warnings: AgyWarning[];
}> {
  const projects = new Map<string, string>();
  const warnings: AgyWarning[] = [];
  if (!projectsFile) return { projects, warnings };

  let parsed: unknown;
  try {
    parsed = JSON.parse(await Deno.readTextFile(projectsFile));
  } catch (error) {
    warnings.push({
      source: projectsFile,
      message: error instanceof Error ? error.message : String(error),
    });
    return { projects, warnings };
  }

  if (!isObject(parsed)) {
    warnings.push({ source: projectsFile, message: "projects.json is not an object" });
    return { projects, warnings };
  }

  for (const [workspace, conversationId] of Object.entries(parsed)) {
    if (typeof workspace !== "string" || typeof conversationId !== "string") continue;
    if (!workspace.trim() || !conversationId.trim()) continue;
    projects.set(resolve(workspace), conversationId.trim());
  }

  return { projects, warnings };
}
