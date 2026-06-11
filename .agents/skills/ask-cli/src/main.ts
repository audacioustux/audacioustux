import { parseCliArgs } from "./cli/args.ts";
import { createDefaultDeps, runAskAi } from "./orchestrator.ts";

const SKILL_NAME = "ask-cli";

export function usage(): string {
  return `Usage:
  ask-cli <agent> <mode> [subject...]

Agents:
  claude       Wraps the claude CLI (Anthropic)
  agy          Wraps the agy CLI (Antigravity / Gemini)
  pi           Wraps the pi CLI (Pi coding agent)

Modes:
  ask          General second opinion or follow-up question
  plan         Plan completeness and sequencing critique
  adversarial  Strongest-objection review of design/spec/approach
  review       Read-only committed-range diff review (use --base/--head)

Options:
  --model <name>       Override model for this run when supported (not agy).
  --config <path>      Path to config.json (default: <skill-dir>/config.json).
  --resume <id>        Resume a known session id; --fork-session is forced.
  --fresh              Explicitly start a new thread.
  --base <ref>         Base ref for review mode (default: HEAD~1).
  --head <ref>         Head ref for review mode (default: HEAD).
  --extra "..."        Additional focus instructions for the reviewer.
  --cwd <path>         Override invocation cwd.
  --dry-run            Print redacted argv shape; do not invoke the child CLI.
  --help               Show this help.

Safety:
  -claude/agy/pi --continue and -c are rejected to prevent resuming the wrong session.
  -claude always gets --permission-mode plan; pi always gets --tools read,grep,find,ls.
  -claude --resume always adds --fork-session. (Pi has no fork equivalent.)
  -agy --model is rejected; agy uses ~/.gemini/antigravity-cli/settings.json.
  -Subject file paths must resolve inside the repo root.
`;
}

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
      Deno.exitCode = await runAskAi(parsed, createDefaultDeps());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Deno.stderr.writeSync(new TextEncoder().encode(`${SKILL_NAME}: ${message}\n`));
    Deno.exitCode = 1;
  }
}
