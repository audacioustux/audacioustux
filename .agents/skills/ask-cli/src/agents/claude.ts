import { resolve } from "jsr:@std/path@1";
import type { ChildCommand } from "../sys/process.ts";

export const id = "claude" as const;
export const displayName = "Claude";
export const cliBin = "claude";

// Permission mode forced on every invocation. Without this, claude can write
// files in the working directory. Plan mode is the only read-only mode
// documented for headless invocations.
const PERMISSION_MODE = "plan";

export type BuildClaudeInput = {
  prompt: string;
  resume?: string;
  model?: string;
  name?: string;
  newSessionId?: string;
  cwd: string;
};

export function buildCommand(input: BuildClaudeInput): ChildCommand {
  const args = ["-p", "--permission-mode", PERMISSION_MODE];
  if (input.model) args.push("--model", input.model);
  if (input.name) args.push("--name", input.name);
  if (input.resume) {
    // --fork-session is mandatory on resume. Without it, claude would
    // permanently extend the prior session with the new prompt.
    args.push("--resume", input.resume, "--fork-session");
  } else if (input.newSessionId) {
    args.push("--session-id", input.newSessionId);
  }
  args.push(input.prompt);
  return { bin: cliBin, args, cwd: resolve(input.cwd) };
}

export function promptIdentity(_model?: string): string {
  return "You are Claude acting as an independent second-brain reviewer.";
}

export function sessionName({ mode, stamp }: { mode: string; stamp: string }): string {
  return `ask-cli-claude-${mode}-${stamp}`;
}
