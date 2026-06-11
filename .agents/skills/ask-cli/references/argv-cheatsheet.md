# argv Cheatsheet

Per-CLI argv construction. The `ask-cli` wrapper always builds the argv
shape below; this is the audit reference for maintainers.

## claude

```text
claude -p --permission-mode plan [--model <name>] [--name <label>]
        (--resume <id> --fork-session | --session-id <uuid>)
        <prompt>
```

Invariants enforced by the wrapper:

- `-p` and `--permission-mode plan` are always first. The plan permission
  mode is the only documented read-only mode for headless claude
  invocations; without it, the model can write files in the working
  directory.
- `--resume <id>` is always followed immediately by `--fork-session`.
  Without `--fork-session`, claude extends the prior session with the
  new prompt — the prior session's transcript stays in the conversation
  history, but a new "leaf" is appended. With `--fork-session`, the
  prior session is left untouched and a new session is created.
- `--model` is appended only if the caller supplied it. It is honored
  by claude; the wrapper does not validate that the model name is one
  claude supports.

## agy (Antigravity)

```text
agy -p (--conversation <id>) <prompt>
```

Invariants enforced by the wrapper:

- `--model` is **rejected** by the wrapper before invoking the child CLI.
  Agy does not have a headless `--model` flag. The actual model is read
  from `~/.gemini/antigravity-cli/settings.json`; if the caller's
  `--model` (or env var or config) disagrees with the configured model,
  the wrapper emits a stderr warning and the child CLI is invoked
  without `--model`. Antigravity is multi-model — the configured model
  may be Gemini, Claude Sonnet/Opus with Thinking, GPT-OSS, or another
  model exposed by Antigravity. The wrapper treats it as an opaque
  configured model string.
- `--conversation <id>` is passed only if `--resume` is set. There is
  no `--fork-session` equivalent for agy; resuming a conversation
  extends it. The wrapper does not silently resume, so this is
  caller-driven.
- Agy has no documented read-only mode. Read-only behavior depends on
  the model and prompt framing, not on CLI flags.

## pi

```text
pi -p --tools read,grep,find,ls [--model <name>] [--name <label>]
   (--session <id> | --session-id <uuid>)
   <prompt>
```

Invariants enforced by the wrapper:

- `-p` and `--tools read,grep,find,ls` are always first. Pi's only
  documented read-only mechanism is the `--tools` allowlist; without
  it, the model can run shell commands, edit files, and make network
  calls.
- `--session <id>` is passed only if `--resume` is set. Pi has no
  `--fork-session` equivalent; resuming extends the session.
- `--model` is appended only if the caller supplied it. The wrapper
  does not validate that the model is one of the enabled models in
  `~/.pi/agent/settings.json`.

## What the wrapper does not pass

- `--continue` / `-c` — rejected.
- `--model` for agy — rejected.
- `--permission-mode` other than `plan` for claude — not settable by
  caller.
- `--tools` other than `read,grep,find,ls` for pi — not settable by
  caller.
- Any flag the wrapper does not know about — passed through `parseArgs`
  with `unknown: (arg) => !arg.startsWith("-")`, which means only
  positional arguments are accepted after the agent and mode.

## Why these invariants matter

The wrapper's job is to make the unsafe invocations physically
impossible, not just discouraged. A calling agent that obeys the
SKILL.md cannot:

- Resume the most recent session globally (`--continue` is rejected).
- Extend the prior session without forking (`--fork-session` is forced).
- Use a write-capable model (`--permission-mode plan` / `--tools`
  are forced).
- Set agy's model from the CLI (rejected; only settings.json works).

This is the single most important reason the wrapper exists.
