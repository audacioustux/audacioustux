# ask-ai Skill Testing

## Runtime

`ask-ai` is a Deno-native TypeScript skill. Use Deno 2.6.10 or newer stable Deno 2.x.

## Test Layout

```text
ask-ai/
├── deno.json
├── src/
│   ├── cli/args_test.ts          # CLI parsing
│   ├── core/*_test.ts            # config, model precedence, scoring, prompts
│   ├── sys/*_test.ts             # paths, bounded files/JSONL, git wrapper
│   ├── storage/agy_test.ts       # safe agy metadata parsing
│   ├── agents/*_test.ts          # claude, agy, pi agent contracts
│   └── orchestrator_test.ts      # workflow orchestration with fake deps
└── fixtures/                     # anonymized session/settings metadata samples
```

## Full Verification

Run from the skill directory:

```bash
cd .agents/skills/ask-ai
deno task verify
```

This runs:

```bash
deno fmt --check src deno.json config.example.json
deno lint src
deno check src/main.ts
deno test src --allow-read --allow-write=/tmp --allow-env --allow-run=git
```

Expected result: all checks pass and all Deno tests pass.

## Dry-Run Smoke Tests

These do not invoke child CLIs beyond constructing dry-run command JSON:

```bash
./ask-ai claude ask "dry run?" --fresh --dry-run
./ask-ai agy ask "dry run?" --fresh --dry-run
./ask-ai pi ask "dry run?" --fresh --dry-run
./ask-ai pi ask "dry run?" --fresh --model zai/glm-5.1:xhigh --dry-run
```

Expected command shapes:

- `claude`: command starts with `claude -p --permission-mode plan`.
- `agy`: command starts with `agy -p` and never includes `--model`.
- `pi`: command starts with `pi -p --tools read,grep,find,ls`.
- `pi --model ...`: command includes `--model <provider/model[:thinking]>`.

## Fixture Policy

Fixtures are intentionally small and anonymized. They cover structure, not real transcript contents:

- `fixtures/claude-session.jsonl` — Claude JSONL messages.
- `fixtures/pi-session.jsonl` — Pi JSONL messages, model changes, thinking changes, and ignored tool results.
- `fixtures/agy-history.jsonl` and `fixtures/agy-projects.json` — safe agy metadata only.

Do not add real transcripts, secrets, raw tool outputs, or opaque agy BLOB/protobuf dumps to fixtures.

## Intentional Limits

- Agy auto-resume uses structured metadata only. Opaque DB/protobuf scraping is not part of the supported default path.
- Deno permissions constrain the wrapper process, not spawned child CLIs.
- Legacy Node `.mjs` files are not part of Deno verification and are removed after the Deno runtime is fully verified.
