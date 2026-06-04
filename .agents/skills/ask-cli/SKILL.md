---
name: ask-cli
description: Use when the user asks to ask Claude, ask Gemini/agy, ask Pi, get a second opinion, run adversarial review, critique a plan, challenge architecture, review code, or use the claude/agy/pi CLI with relevant prior session context.
---

# ask-cli

## Overview

Invoke an independent AI reviewer as a second brain with relevance-scoped session reuse:

- **claude** via the `claude` CLI
- **agy** via the Antigravity `agy` CLI
- **pi** via the Pi coding-agent `pi` CLI

The implementation is Deno-native TypeScript. Use the bundled executable wrapper `ask-cli`; it runs `deno run` with the permissions required to read local session stores, read the current repo, read model/config environment variables, run `git`, and invoke the selected child CLI.

## Hard Rules

- Use the bundled helper (`ask-cli`); do not hand-roll `claude`/`agy`/`pi` commands unless the helper is broken.
- Never use `claude --continue`, `agy --continue`/`-c`, or `pi --continue`/`-c` for this workflow. They resume the latest session, which may be unrelated.
- Treat review modes as **best-effort constrained**, not magically sandboxed:
  - `claude` is invoked with `--permission-mode plan`.
  - `pi` is invoked with `--tools read,grep,find,ls`.
  - `agy` has no reliable mechanical read-only flag in the observed CLI; ask-cli uses prompt constraints and safe metadata reuse only.
- Deno permissions constrain the ask-cli wrapper process. They do **not** sandbox spawned child CLIs.
- Treat model output as critique, not truth. Verify findings before changing code.

## Agents

| | **claude** | **agy** | **pi** |
|---|---|---|---|
| CLI | `claude` | `agy` | `pi` |
| Models | Any model the `claude` CLI supports | Actual model from agy settings | Any enabled Pi model (`provider/model[:thinking]`) |
| Default model | Claude's own default | `~/.gemini/antigravity-cli/settings.json` → `model` | `~/.pi/agent/settings.json` → `defaultProvider/defaultModel/defaultThinkingLevel` |
| Session storage | `~/.claude/projects/<encoded-cwd>/*.jsonl` | Safe metadata from `history.jsonl` + `cache/projects.json` | `~/.pi/agent/sessions/<encoded-cwd>/*.jsonl` |
| Session resume | `--resume <id>` + `--fork-session` | `--conversation <id>` | `--session <id>` |
| New session id | `--session-id <uuid>` | CLI-created | `--session-id <uuid>` |
| Mechanical constraints | `--permission-mode plan` | none observed | `--tools read,grep,find,ls` |
| Model in prompt | Preferred model name | Actual model from settings | Actual override or configured default |

## Model Selection

| Priority | Source | Scope |
|---|---|---|
| 1 | `ask-cli <agent> ask --model <name> "..."` | Per-run |
| 2 | `$ASK_AI_MODEL_CLAUDE` / `$ASK_AI_MODEL_AGY` / `$ASK_AI_MODEL_PI` | Per-shell |
| 3 | `<skill>/config.json` → `agents.<agent>.model` | Per-project |
| 4 | CLI's own configured default | Fallback |

**For claude:** `--model` is passed to `claude --model <name>`.

**For agy:** `--model` is a preference hint only. The actual model is read from `~/.gemini/antigravity-cli/settings.json`. If preferred and actual differ during invocation, ask-cli prints a warning.

**For pi:** `--model` is real and is passed to `pi --model <provider/model[:thinking]>`. Without an override, ask-cli reads `~/.pi/agent/settings.json` to report the configured default while letting Pi use its own configuration.

Copy `config.example.json` to `config.json` to set persistent defaults.

## Quick Reference

```bash
ask-cli claude ask "What am I missing?"
ask-cli agy plan docs/superpowers/plans/foo.md
ask-cli pi adversarial docs/superpowers/specs/foo.md
ask-cli claude review --base HEAD~1 --head HEAD
ask-cli pi sessions "beam quic transport"
ask-cli claude ask --model opus "is this safe?"
ask-cli pi ask --model zai/glm-5.1:xhigh "challenge this plan"
```

| Option | Use |
|---|---|
| `--dry-run` | Show selected session, model, warnings, and CLI args without invoking |
| `--model <name>` | Preferred model override for this run |
| `--config <path>` | Override `config.json` path |
| `--resume <id>` | Force a specific session/conversation id |
| `--fresh` | Skip session scan; start a new thread |
| `--threshold <n>` | Minimum relevance score for reuse (default: 12) |
| `--base <ref>` | Base ref for review mode (default: HEAD~1) |
| `--head <ref>` | Head ref for review mode (default: HEAD) |
| `--extra "..."` | Additional focus instructions for the reviewer |
| `--cwd <path>` | Override invocation cwd |

## Modes

| Mode | Use when | Example |
|---|---|---|
| `ask` | General second opinion or follow-up question | `ask "Is this API sound?"` |
| `plan` | Plan completeness and sequencing critique | `plan docs/.../plan.md` |
| `adversarial` | Strongest-objection review of design/spec/approach | `adversarial docs/.../design.md` |
| `review` | Committed-range diff review | `review --base main --head HEAD` |
| `sessions` | Show ranked candidate sessions without invoking an agent | `sessions "auth websocket handoff"` |

## Agy Session Reuse Limitation

Agy's opaque conversation DB/protobuf contents are not scraped by default. ask-cli only uses structured, scoped metadata from `history.jsonl` and `cache/projects.json`. If the current repo cannot be mapped confidently, candidates are marked untrusted and are not auto-selected.

## Verification

```bash
cd .agents/skills/ask-cli
deno task verify
./ask-cli claude ask "dry run?" --fresh --dry-run
./ask-cli agy ask "dry run?" --fresh --dry-run
./ask-cli pi ask "dry run?" --fresh --dry-run
```
