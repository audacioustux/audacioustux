import { resolve } from "jsr:@std/path@1";
import type { ChildCommand } from "../sys/process.ts";

export const id = "pi" as const;
export const displayName = "Pi";
export const cliBin = "pi";

// Pi has no --permission-mode. --tools is the only documented read-only
// mechanism for headless invocations. Limiting to read-only tools prevents
// the model from editing files, running shell commands, or making network
// calls during a review.
const READ_ONLY_TOOLS = "read,grep,find,ls";

export type BuildPiInput = {
  prompt: string;
  resume?: string;
  model?: string;
  name?: string;
  newSessionId?: string;
  cwd: string;
};

export function buildCommand(input: BuildPiInput): ChildCommand {
  const args = ["-p", "--tools", READ_ONLY_TOOLS];
  if (input.model) args.push("--model", input.model);
  if (input.name) args.push("--name", input.name);
  if (input.resume) args.push("--session", input.resume);
  else if (input.newSessionId) args.push("--session-id", input.newSessionId);
  args.push(input.prompt);
  return { bin: cliBin, args, cwd: resolve(input.cwd) };
}

export function promptIdentity(_model?: string): string {
  return "You are Pi acting as an independent second-brain reviewer.";
}

export function sessionName({ mode, stamp }: { mode: string; stamp: string }): string {
  return `ask-cli-pi-${mode}-${stamp}`;
}
