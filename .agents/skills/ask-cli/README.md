# ask-cli skill

`ask-cli` is a small Deno/TypeScript wrapper plus agent skill for asking an
independent AI CLI for a second opinion while enforcing a small set of
safety invariants.

Supported child CLIs:

- `claude`
- `agy` / Antigravity
- `pi`

The wrapper is intentionally narrow: it constructs the right argv for the
child CLI, applies read-only flags the model needs, and refuses
`--continue` / `-c`. It does not parse session JSONL, does not rank
sessions, and does not auto-resume.

## Requirements

- Deno 2.x, preferably 2.6.10 or newer
- `git`
- `readlink` for symlinked wrapper installs
- At least one supported child CLI installed and authenticated

No package install step is required. Deno downloads the locked imports on
first run, so first execution may need network access unless your Deno
cache is already warm.

## Install

The skill lives at `skills/.apm/skills/ask-cli/` inside this repo. Put the
wrapper on your `PATH`:

```bash
cd skills/.apm/skills/ask-cli
chmod +x ask-cli
mkdir -p ~/.local/bin
ln -s "$PWD/ask-cli" ~/.local/bin/ask-cli
```

Or symlink the skill directory into your coding agent's skill loader.

Keep `SKILL.md`, `ask-cli`, `src/`, `config.example.json`, `deno.json`, and
`deno.lock` together.

## Configure models

Per-run `--model` overrides have the highest priority. For persistent local
defaults, copy the example config and edit it for your installed CLIs:

```bash
cp config.example.json config.json
```

`config.json` is local machine configuration and should not be committed.

Model precedence:

1. `ask-cli <agent> ask --model <name> "..."`
2. Environment variable: `ASK_AI_MODEL_CLAUDE`, `ASK_AI_MODEL_AGY`, or
   `ASK_AI_MODEL_PI`
3. `config.json`
4. The child CLI's own configured default

Agy does not accept `--model`; its model is configured in
`~/.gemini/antigravity-cli/settings.json`.

## Usage

```bash
ask-cli claude ask "What am I missing?"
ask-cli pi plan docs/plans/change.md
ask-cli claude adversarial docs/specs/change.md
ask-cli claude review --base main --head HEAD
ask-cli agy ask "is this safe?"
ask-cli pi ask "follow up on prior context" --resume <id>
```

Modes:

| Mode | Purpose |
|---|---|
| `ask` | General second opinion or follow-up question |
| `plan` | Plan completeness, sequencing, assumptions, and test critique |
| `adversarial` | Strongest-objection review of design/spec/approach |
| `review` | Read-only committed-range diff review using `git diff base..head` |

Useful flags:

| Flag | Purpose |
|---|---|
| `--resume <id>` | Resume a known session. For claude, `--fork-session` is forced; for pi, no fork equivalent |
| `--fresh` | Explicitly start a new session |
| `--dry-run` | Print redacted argv shape; do not invoke the child CLI |
| `--model <name>` | Override model (rejected for agy) |
| `--config <path>` | Use a config file outside the skill directory |
| `--extra "..."` | Additional reviewer focus instructions |
| `--cwd <path>` | Run as if invoked from another repository path |
| `--base <ref>` / `--head <ref>` | Review mode refs (default `HEAD~1`..`HEAD`) |

## Safety contract (enforced in code)

The wrapper rejects or forces the following:

- `--continue` and `-c` are **rejected**. They resume the most recent
  session globally, ignoring the current repo. Use `--resume <id>`.
- `claude` always gets `--permission-mode plan`.
- `pi` always gets `--tools read,grep,find,ls`.
- `claude --resume` always adds `--fork-session`. Pi has no fork equivalent — resuming a pi session extends the prior conversation.
- `agy --model` is rejected; agy uses the model configured in
  `~/.gemini/antigravity-cli/settings.json`.

These are checked at parse time, so a calling agent that obeys the SKILL.md
cannot accidentally bypass them.

## Privacy and security

- `--dry-run` shows the argv that would be invoked, with the prompt
  redacted by value.
- Subject file reads are bounded to 20 KB. `git diff` is bounded to 1 MB
  and 64 KB for the stat; oversize output is truncated with a SIGTERM
  kill and the truncation is marked in the prompt.
- The wrapper does not read session stores, parse JSONL, or rank sessions.
- Child CLIs run with their normal process privileges. The wrapper does
  not sandbox them.
- Treat child model output as critique, not truth. Verify findings before
  changing code.
- Do not use this on secrets or proprietary data unless the selected
  child CLI and model are approved for that data.

## License

MIT. Copyright © 2026 Tanjim Hossain. This skill is MIT licensed
regardless of the host repository's license.

## Verify

From this directory:

```bash
deno task verify
./ask-cli pi ask "dry run?" --dry-run
```

See [TESTING.md](./TESTING.md) for details.

## Troubleshooting

| Symptom | Check |
|---|---|
| `deno: command not found` | Install Deno 2.x and ensure it is on `PATH` |
| Child CLI not found | Install/authenticate `claude`, `agy`, or `pi` |
| `--continue` rejected | Use `--resume <id>` with a session id you obtained earlier |
| Wrong model | Check `--model`, env vars, `config.json`, then the child CLI's own settings |
