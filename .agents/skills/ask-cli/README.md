# ask-cli skill

`ask-cli` is a small Deno/TypeScript wrapper plus agent skill for asking an
independent AI CLI for a second opinion while reusing only relevant prior session
context.

Supported child CLIs:

- `claude`
- `agy` / Antigravity
- `pi`

It is intentionally narrow: review prompts, bounded file/diff context, model
selection, and relevance-scored session reuse. It is not a sandbox or a generic
agent framework.

## Requirements

- Deno 2.x, preferably 2.6.10 or newer
- `git`
- `readlink` for symlinked wrapper installs
- At least one supported child CLI installed and authenticated: `claude`, `agy`,
  or `pi`
- Optional: existing local session stores for relevance-scoped resume

No package install step is required. Deno downloads the locked imports on first
run, so first execution may need network access unless your Deno cache is already
warm.

## Install

Clone this repository and put the wrapper on your `PATH`:

```bash
git clone https://github.com/audacioustux/audacioustux.git
cd audacioustux/.agents/skills/ask-cli
chmod +x ask-cli
mkdir -p ~/.local/bin
ln -s "$PWD/ask-cli" ~/.local/bin/ask-cli
```

Install the skill directory wherever your coding agent loads skills from. Common
options are:

```bash
# Claude Code
mkdir -p ~/.claude/skills
ln -s "$PWD" ~/.claude/skills/ask-cli

# Project-local agents that read .agents/skills
mkdir -p /path/to/project/.agents/skills
ln -s "$PWD" /path/to/project/.agents/skills/ask-cli
```

If your agent uses a different skill directory, copy or symlink this whole
`ask-cli` directory there. Keep `SKILL.md`, `ask-cli`, `src/`, `fixtures/`,
`config.example.json`, `deno.json`, and `deno.lock` together.

## Configure models

Per-run `--model` overrides have highest priority. For persistent local defaults,
copy the example config and edit it for your installed CLIs:

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

Agy does not currently expose a reliable model override flag in this workflow;
`--model` is treated as a preference hint and ask-cli reports the configured agy
model it observes.

## Usage

By default, ask-cli scans local session history and may resume a prior session it
scores as relevant. Use `--fresh` when you do not want prior local context reused.
Start with `--fresh --dry-run` if you want to inspect the redacted command shape
before invoking a child CLI.

```bash
ask-cli claude ask "What am I missing?" --fresh
ask-cli agy plan docs/plans/change.md --fresh
ask-cli pi adversarial docs/specs/change.md --fresh
ask-cli claude review --base "$(git merge-base main HEAD)" --head HEAD --fresh
ask-cli pi sessions "auth websocket handoff"
ask-cli claude ask --model opus "is this safe?" --fresh
ask-cli pi ask --model provider/model:thinking "challenge this plan" --fresh
```

Modes:

| Mode | Purpose |
|---|---|
| `ask` | General second opinion or follow-up question |
| `plan` | Plan completeness, sequencing, assumptions, and test critique |
| `adversarial` | Strongest-objection review of a design/spec/approach |
| `review` | Read-only committed-range diff review using `git diff base..head` |
| `sessions` | Show ranked session candidates without invoking a child CLI |

Useful flags:

| Flag | Purpose |
|---|---|
| `--fresh` | Skip session scanning and start a new thread |
| `--dry-run` | Print selected session/model/prompt metadata/redacted command shape without invoking the child CLI |
| `--config <path>` | Use a config file outside the skill directory |
| `--resume <id>` | Force a specific session/conversation id |
| `--threshold <n>` | Minimum relevance score for automatic reuse |
| `--extra "..."` | Add reviewer focus instructions |
| `--cwd <path>` | Run as if invoked from another repository path |

`review` mode reviews committed refs only and uses `git diff <base>..<head>`.
For branch reviews, pass the merge base or exact ancestor as `--base` to avoid
including unrelated upstream changes. For uncommitted work, commit to a throwaway
branch first or save `git diff` to a file and use `adversarial`/`ask`.

## Privacy and security

- ask-cli runs with broad local read access so it can read session stores,
  target files, and repository diffs.
- ask-cli may read local Claude, agy, and Pi session metadata/transcripts to rank
  relevance for the current repository.
- If a session is selected, the child CLI may receive or resume prior
  conversation context judged relevant by best-effort scoring.
- Prompt payloads may include bounded target file contents or bounded `git diff`
  output.
- `--fresh` avoids automatic session reuse.
- `--dry-run` shows the selected session, model, prompt metadata, warnings, and
  redacted command shape before anything is sent to a child CLI.
- Deno permissions constrain only the wrapper process. They are not a
  data-loss-prevention boundary, and spawned child CLIs are not sandboxed by
  ask-cli.
- Child CLIs run with their normal process privileges and environment behavior.
- Treat child model output as critique, not truth. Verify findings before
  changing code.
- Do not use this on secrets or proprietary data unless the selected child CLI and
  model are approved for that data.

## License

MIT. See the repository [LICENSE](../../../LICENSE).

## Verify

From this directory:

```bash
deno task verify
./ask-cli claude ask "dry run?" --fresh --dry-run
./ask-cli agy ask "dry run?" --fresh --dry-run
./ask-cli pi ask "dry run?" --fresh --dry-run
```

See [TESTING.md](./TESTING.md) for details about fixtures, permissions, and
installed-copy checks inside another Deno workspace.

## Troubleshooting

| Symptom | Check |
|---|---|
| `deno: command not found` | Install Deno 2.x and ensure it is on `PATH` |
| Child CLI not found | Install/authenticate `claude`, `agy`, or `pi`; the wrapper can only invoke installed CLIs |
| No session is reused | Run `sessions "query terms"`, lower `--threshold`, or use `--resume <id>` |
| Wrong model | Check `--model`, env vars, `config.json`, then the child CLI's own settings |
| Concerned about prior context | Use `--fresh --dry-run` first, then run without `--dry-run` if the command looks safe |
