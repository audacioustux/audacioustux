---
name: ask-cli
description: >
  Invoke an independent AI CLI (claude, agy, pi) as a constrained second brain for
  adversarial review, plan critique, code review, architecture challenges, or general
  second opinions. Use when the user asks to "ask claude", "ask agy", "ask pi", wants
  a second opinion, adversarial critique, or explicitly requests an external reviewer.
---

# ask-cli

## Overview

`ask-cli` is a thin Deno wrapper that invokes `claude`, `agy`, or `pi` as a read-only
second brain. The wrapper exists to enforce a small number of safety invariants the
calling agent must not be able to forget:

- `--continue` / `-c` are **rejected**. They resume the most recent session globally
  and bypass repo scoping. Use `--resume <id>` instead.
- For `claude`, `--permission-mode plan` is always added. Read-only by default.
- For `pi`, `--tools read,grep,find,ls` is always added. Read-only by default.
- For `claude`, `--resume <id>` always adds `--fork-session` so the prior session
  is not extended. **Pi has no `--fork-session` equivalent**: resuming a pi session
  extends the prior conversation. Avoid `pi --resume` unless the prior conversation
  is the one you intend to continue.
- For `agy`, `--model` is rejected. Agy's model is configured in
  `~/.gemini/antigravity-cli/settings.json`. If the env var
  `ASK_AI_MODEL_AGY` or `config.json` set a different model, the wrapper
  prints a stderr warning naming the configured model so the discrepancy
  is visible.

Everything else is delegated to the calling agent. Session discovery, scoring,
JSONL parsing, and prior-session reuse are not part of this skill — call the
child CLI directly when you need that.

## Hard Rules

- Use the bundled `ask-cli` wrapper. Do not hand-roll `claude -p`, `agy -p`, or `pi -p`.
- Never pass `--continue` or `-c`. They are rejected; this is intentional.
- `--resume` requires a session id you obtained from this skill or from the child CLI
  directly. Do not guess.

## Quick Reference

```bash
ask-cli claude ask "What am I missing?"
ask-cli pi plan docs/plans/change.md
ask-cli claude adversarial docs/specs/change.md
ask-cli claude review --base main --head HEAD
ask-cli agy ask "is this safe?" --fresh
ask-cli pi ask "follow up" --resume <id>
```

| Mode | Use when |
|---|---|
| `ask` | General second opinion or follow-up question |
| `plan` | Plan completeness, sequencing, assumptions critique |
| `adversarial` | Strongest-objection review of design/spec/approach |
| `review` | Read-only committed-range diff review (`git diff base..head`) |

| Flag | Purpose |
|---|---|
| `--resume <id>` | Resume a known session. For claude, `--fork-session` is forced; for pi, no fork equivalent (resuming extends the prior session) |
| `--fresh` | Start a new session explicitly |
| `--dry-run` | Print redacted argv shape; do not invoke the child CLI |
| `--model <name>` | Override model when supported (not agy) |
| `--base <ref>` / `--head <ref>` | Review mode refs (default: `HEAD~1`..`HEAD`) |
| `--extra "..."` | Additional reviewer focus |
| `--cwd <path>` | Override invocation cwd |

## Model Selection

Priority: `--model` flag → env var (`ASK_AI_MODEL_CLAUDE` etc.) → `config.json` → child
CLI default. For agy, the model is read from `~/.gemini/antigravity-cli/settings.json`
and `--model` is rejected.

Copy `config.example.json` to `config.json` for persistent local defaults. Do not
commit personal `config.json` files.

## Privacy and security

- `--dry-run` prints the redacted argv without invoking the child CLI.
- Subject file reads are bounded to 20 KB. `git diff` is bounded to 1 MB; oversize
  output is truncated with a SIGTERM kill and marked in the prompt.
- The wrapper does not read session stores. It does not pass session context unless
  the caller supplies `--resume <id>`.
- Child CLIs run with their normal process privileges. `--permission-mode plan` and
  `--tools read,grep,find,ls` constrain the model, not the wrapper.
- Treat child model output as critique, not truth. Verify findings before changing code.

## What this skill does NOT do (intentionally)

To keep the wrapper auditable, the following are not features of this skill:

- Session JSONL discovery or relevance scoring
- Auto-resume based on heuristic scoring
- A `sessions` mode
- A `sessions --fresh` warning
- Auto-detection of "I meant the current repo"
- Pinned sessions by topic/tag

If you need any of these, call the child CLI directly. The wrapper is the
safety contract, not a workflow.

## Verification

```bash
cd skills/.apm/skills/ask-cli
deno task verify
./ask-cli pi ask "dry run?" --dry-run
```

See [TESTING.md](./TESTING.md) for fixtures and installed-copy checks.
