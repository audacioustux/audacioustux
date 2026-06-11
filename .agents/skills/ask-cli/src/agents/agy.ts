import { resolve } from "jsr:@std/path@1";
import type { ChildCommand } from "../sys/process.ts";

export const id = "agy" as const;
export const displayName = "Antigravity (agy)";
export const cliBin = "agy";

// Agy has no reliable --model flag in headless mode. The wrapper reads
// ~/.gemini/antigravity-cli/settings.json to detect when the agent
// requested a model that agy is not actually configured for and emits a
// stderr warning. The user must edit settings.json to change the model.
const AGY_SETTINGS_FILE = "~/.gemini/antigravity-cli/settings.json";

export type AgyActualModel = { actual: string | undefined };

export type BuildAgyInput = {
  prompt: string;
  resume?: string;
  cwd: string;
};

export function buildCommand(input: BuildAgyInput): ChildCommand {
  const args = ["-p"];
  if (input.resume) args.push("--conversation", input.resume);
  args.push(input.prompt);
  return { bin: cliBin, args, cwd: resolve(input.cwd) };
}

export function promptIdentity(_model?: string): string {
  return "You are Antigravity (agy) acting as an independent second-brain reviewer.";
}

export function sessionName({ mode, stamp }: { mode: string; stamp: string }): string {
  return `ask-cli-agy-${mode}-${stamp}`;
}

// Reads the actual model configured for agy. Used by the orchestrator to
// emit a stderr warning when the user-requested model differs from what
// agy will actually use. The caller controls the path expansion so this
// can be tested without a real home directory.
export async function loadAgyActualModel(
  settingsFilePath: string,
): Promise<AgyActualModel> {
  try {
    const raw = await Deno.readTextFile(settingsFilePath);
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "model" in parsed) {
      const m = (parsed as Record<string, unknown>).model;
      if (typeof m === "string" && m.trim()) return { actual: m.trim() };
    }
  } catch {
    // Missing or malformed settings file is normal; agy is the source of truth.
  }
  return { actual: undefined };
}

export const SETTINGS_PATH_HINT = AGY_SETTINGS_FILE;
