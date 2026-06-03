---
name: ask-ai
description: Use when the user asks to ask Claude, ask Gemini/agy, get a second opinion, run adversarial review, critique a plan, challenge architecture, review code, or use the claude/agy CLI with relevant prior session context.
---

# ask-ai

## Overview

Invoke an independent AI reviewer — Claude (via the `claude` CLI) or Gemini/Claude/GPT-OSS (via the `agy` CLI) — as a second brain with relevance-scoped session reuse. One skill, two agents, per-agent model + config overrides.

Follows the pi-subagents agent pattern: default model = CLI's own default; override via `config.json`, `$ASK_AI_MODEL_<AGENT>` env var, or `--model` flag.

## Hard Rules

- Use the bundled helpers (`ask-ai.mjs`); do not hand-roll `claude`/`agy` commands unless the helper is broken.
- Never use `claude --continue` or `agy --continue`/`-c` for this workflow. They resume the latest session, which may be unrelated.
- Review modes are read-only: do not edit files, implement fixes, or run destructive commands.
- Treat model output as critique, not truth. Verify findings before changing code.

## Agents

| | **claude** | **agy** |
|---|---|---|
| CLI | `claude` | `agy` |
| Models | Any model the `claude` CLI supports (pass via `--model`) | Any model in agy's `settings.json` (Gemini, Claude, GPT-OSS — 8+ known) |
| Default model | Claude's own default (no `--model` flag) | Whatever's in `~/.gemini/antigravity-cli/settings.json` |
| Session storage | `~/.claude/projects/<encoded-cwd>/*.jsonl` | `~/.gemini/antigravity-cli/conversations/*.{db,pb}` + `history.jsonl` |
| Session resume | `--resume <id>` + `--fork-session` (branches by default) | `--conversation <id>` (continues, no fork) |
| Read-only safety | `--permission-mode plan` (hard-coded) | Prompt-enforced; opt-in `--sandbox` for extra caution |
| Model in prompt | Uses `preferred` model name | Uses `actual` model name from settings.json |

## Model Selection

| Priority | Source | Scope |
|---|---|---|
| 1 (highest) | `ask-ai <agent> ask --model <name> "..."` | Per-run |
| 2 | `$ASK_AI_MODEL_CLAUDE` / `$ASK_AI_MODEL_AGY` | Per-shell |
| 3 | `<skill>/config.json` → `agents.<agent>.model` | Per-project |
| 4 (default) | CLI's own default | Fallback |

**For claude:** the model is passed to `claude --model <name>`. Setting it changes what claude runs.

**For agy:** the model is read from `~/.gemini/antigravity-cli/settings.json`. `--model` is a hint only — agy's actual model is whatever's in that file. If `preferred` ≠ `actual`, the skill prints a one-line stderr warning and continues with `actual`.

Copy `config.example.json` to `config.json` to set persistent defaults.

## Quick Reference

```bash
ask-ai claude ask "What am I missing?"
ask-ai agy plan docs/superpowers/plans/foo.md
ask-ai claude adversarial docs/superpowers/specs/foo.md
ask-ai claude review --base HEAD~1 --head HEAD
ask-ai agy sessions "beam quic transport"
ask-ai --model sonnet claude ask "is this safe?"
```

| Option | Use |
|---|---|
| `--dry-run` | Show selected session, model, and CLI args without invoking |
| `--model <name>` | Override model for this run (see resolution order above) |
| `--config <path>` | Override `config.json` path |
| `--resume <id>` | Force a specific session/conversation id |
| `--fresh` | Skip session scan; start a new thread |
| `--threshold <n>` | Minimum relevance score for reuse (default: 12) |
| `--sandbox` | (agy only) pass `--sandbox` to agy |
| `--base <ref>` | Base ref for review mode (default: HEAD~1) |
| `--head <ref>` | Head ref for review mode (default: HEAD) |
| `--extra "..."` | Additional focus instructions for the reviewer |

## Mode Guide

| Mode | Use when | Example |
|---|---|---|
| `ask` | General second opinion or follow-up question | `ask "Is this Rust API sound?"` |
| `plan` | Plan completeness and sequencing critique | `plan docs/.../plan.md` |
| `adversarial` | Strongest-objection review of design/spec/approach | `adversarial docs/.../design.md` |
| `review` | Read-only committed-range diff review | `review --base main --head HEAD` |

## Common Mistakes

| Mistake | Correct action |
|---|---|
| `claude --continue -p ...` / `agy --continue -p ...` | Use helper; it avoids latest-session drift |
| Reusing a barely related session | Use `--fresh` or raise `--threshold` |
| Letting the reviewer edit code | Keep prompt-enforced read-only rules; use `--sandbox` for agy |
| Applying feedback blindly | Check evidence in code/tests first |
| Expecting `--model` to change agy's model | Edit `~/.gemini/antigravity-cli/settings.json` instead |

## Verification

After edits, run the full test suite:

```bash
node --test shared.test.mjs agents/claude.test.mjs agents/agy.test.mjs ask-ai.test.mjs
```

Dry-run each agent:

```bash
node ask-ai.mjs claude ask "dry run?" --dry-run
node ask-ai.mjs agy ask "dry run?" --dry-run
```

Both dry-runs should show `command` starting with the agent's binary, with the model resolved from config or settings.json.
