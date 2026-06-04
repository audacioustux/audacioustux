import { basename, dirname, fromFileUrl, join } from "jsr:@std/path@1";

export type AskAiConfig = {
  agents: Record<string, { model: string }>;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function defaultConfigFile(moduleUrl: URL | string = import.meta.url): string {
  const filePath = fromFileUrl(moduleUrl);
  const moduleDir = dirname(filePath);
  const skillDir = basename(moduleDir) === "src" ? dirname(moduleDir) : moduleDir;
  return join(skillDir, "config.json");
}

export async function loadConfig(configFile: string | undefined): Promise<AskAiConfig> {
  if (!configFile) return { agents: {} };
  let raw: string;
  try {
    raw = await Deno.readTextFile(configFile);
  } catch {
    return { agents: {} };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { agents: {} };
  }

  if (!isObject(parsed) || !isObject(parsed.agents)) return { agents: {} };

  const agents: AskAiConfig["agents"] = {};
  for (const [name, value] of Object.entries(parsed.agents)) {
    if (!isObject(value)) continue;
    if (typeof value.model !== "string" || !value.model.trim()) continue;
    agents[name] = { model: value.model.trim() };
  }

  return { agents };
}
