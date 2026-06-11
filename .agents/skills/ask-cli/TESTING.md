# ask-cli Skill Testing

## Runtime

`ask-cli` is a Deno-native TypeScript skill. Use Deno 2.6.10 or newer
stable Deno 2.x.

## Test Layout

```text
ask-cli/
├── deno.json
├── src/
│   ├── cli/args_test.ts          # CLI parsing and safety rejections
│   ├── core/config_test.ts       # config.json loading
│   ├── sys/files_test.ts         # bounded file reads
│   ├── sys/git_test.ts           # bounded git subprocess
│   ├── sys/paths_test.ts         # ~ expansion and repo-root resolution
│   └── orchestrator_test.ts      # safety contract: --permission-mode,
│                                 # --tools, --fork-session, agy --model rejection
└── config.example.json
```

## Full Verification

Run from the skill directory:

```bash
cd skills/.apm/skills/ask-cli
deno task verify
```

This runs `deno fmt --check`, lockfile resolution, lint, type check, and
the test suite with the same flags the wrapper uses at runtime.

Expected result: all checks pass, lockfile resolution is frozen, all
tests pass.

### Installed inside another Deno workspace

Some host repos define a root `deno.json` workspace. In that case, Deno
rejects nested `deno task` configs that are not workspace members. The
`ask-cli` wrapper is protected by `--no-config`, so runtime use still
works. For installed-copy checks inside such a host repo, run:

```bash
deno lint --no-config src
deno check --no-config src/main.ts
deno test --no-config src --allow-read --allow-write=/tmp --allow-env --allow-run=git
```

Use the standalone source repo for `deno task verify` and configured
formatting checks.

## Dry-Run Smoke Tests

These do not invoke child CLIs beyond constructing dry-run argv:

```bash
./ask-cli claude ask "dry run?" --dry-run
./ask-cli agy ask "dry run?" --dry-run
./ask-cli pi ask "dry run?" --dry-run
```

Dry-run output redacts the prompt payload and reports the prompt
metadata (length, truncation flags).

Expected command shapes:

- `claude`: starts with `claude -p --permission-mode plan`.
- `agy`: starts with `agy -p` and never includes `--model`.
- `pi`: starts with `pi -p --tools read,grep,find,ls`.

Symlink smoke test:

```bash
ln -s "$PWD/ask-cli" /tmp/ask-cli-smoke
/tmp/ask-cli-smoke pi ask "dry run?" --dry-run
```

Expected result: JSON output includes `"agent": "pi"` and
`[prompt redacted:`.

## Safety Contract

The tests in `src/orchestrator_test.ts` and `src/cli/args_test.ts` pin
the safety contract that the wrapper enforces:

- `--continue` and `-c` are rejected at parse time.
- `claude` always gets `--permission-mode plan`.
- `pi` always gets `--tools read,grep,find,ls`.
- `claude --resume` always adds `--fork-session`.
- `agy --model` is rejected; agy is invoked without `--model` and a
  stderr warning is emitted when the requested model differs from
  `~/.gemini/antigravity-cli/settings.json`.
- `--resume` and `--fresh` are mutually exclusive.

If you change any of these behaviors, update the tests and the
documentation together.

## What the tests do NOT cover

- Session discovery or JSONL parsing (this skill does not parse sessions).
- Score-based session selection (removed intentionally).
- The child CLI's own behavior (out of scope).
- Cross-platform file permissions tests (Linux-focused).

## Fixture Policy

The skill reads no fixtures. The wrapper does not parse session stores,
history files, or settings files (except `~/.gemini/antigravity-cli/settings.json`
when the user requests a model that differs from the configured one).

Do not add real transcripts, secrets, or session contents to this skill.
