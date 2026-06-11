import { parseCliArgs } from "./cli/args.ts";
import { createDefaultDeps, runAskAi } from "./orchestrator.ts";
import * as claude from "./agents/claude.ts";
import * as agy from "./agents/agy.ts";
import * as pi from "./agents/pi.ts";
import type { Agent } from "./agent.ts";

const SKILL_NAME = "ask-cli";

export function usage(): string {
  return `Usage:
  ask-cli <agent> <mode> [subject...]

Modes:
  ask          General second opinion or follow-up question
  plan         Plan completeness and sequencing critique
  adversarial  Strongest-objection review of design/spec/approach
  review       Read-only committed-range diff review (use --base/--head)
  sessions     Show ranked candidate sessions without invoking the CLI

Agents:
  claude       Wraps the claude CLI (Anthropic)
  agy          Wraps the agy CLI (Antigravity / Gemini)
  pi           Wraps the pi CLI (Pi coding agent)

Options:
  --model <name>       Override model for this run when supported.
  --config <path>      Path to config.json (default: <skill-dir>/config.json).
  --resume <id>        Force a specific session/conversation id.
  --fresh              Skip session scan; start a new thread.
  --threshold <n>      Minimum relevance score for reuse.
  --base <ref>         Base ref for review mode (default: HEAD~1).
  --head <ref>         Head ref for review mode (default: HEAD).
  --extra "..."        Additional focus instructions for the reviewer.
  --cwd <path>         Override invocation cwd.
  --dry-run            Print selected session, model, prompt metadata, and redacted CLI args; do not invoke.
  --help               Show this help.
`;
}

const agents: Record<string, Agent> = { claude, agy, pi };

if (import.meta.main) {
  try {
    const parsed = parseCliArgs(Deno.args);
    if (parsed.kind === "help") {
      if (parsed.error) {
        Deno.stderr.writeSync(new TextEncoder().encode(`${SKILL_NAME}: ${parsed.error}\n`));
      }
      Deno.stdout.writeSync(new TextEncoder().encode(usage()));
      Deno.exitCode = parsed.error ? 1 : 0;
    } else {
      Deno.exitCode = await runAskAi(parsed, createDefaultDeps(agents));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Deno.stderr.writeSync(new TextEncoder().encode(`${SKILL_NAME}: ${message}\n`));
    Deno.exitCode = 1;
  }
}
