# ask-ai Skill Testing

## Test Layout

```
ask-ai/
├── shared.test.mjs          # 29 tests — core utilities (config, model, scoring, prompt, git)
├── agents/
│   ├── claude.test.mjs       # 13 tests — sessionOpts, resolveModel, promptIdentity, buildArgs
│   └── agy.test.mjs          # 15 tests — loadActualModel, resolveModel, KNOWN_MODELS, buildArgs
└── ask-ai.test.mjs           #  9 tests — parseCliArgs, error handling
```

Run all tests:

```bash
cd .agents/skills/ask-ai
node --no-warnings --test shared.test.mjs agents/claude.test.mjs agents/agy.test.mjs ask-ai.test.mjs
```

## What Each File Tests

### shared.test.mjs

- `defaultConfigFile` resolves to the skill directory when given the orchestrator's `import.meta.url`.
- `loadConfig` handles missing, malformed, non-object root, and valid config files.
- `resolveModel` precedence: CLI flag > env var > config file > default.
- `tokenize` deduplicates, splits on path punctuation, filters stop words and short tokens.
- `scoreSession` rewards matched terms and recency; returns 0 on no-match.
- `selectSession` enforces threshold and minMatchedTerms.
- `serializeCandidate` redacts everything except id/score/lastTimestamp.
- `findRepoRoot` walks up to the nearest `.git`.
- `readIfFile` reads bounded file content; returns empty for missing/empty.
- `gitOutput` runs git in a given cwd and returns stdout.
- `buildPrompt` produces mode-specific shapes with a custom identity.
- `buildSearchQuery` joins non-empty parts, drops empty.
- `requireValue` returns the next arg or throws.

### agents/claude.test.mjs

- `sessionOpts` maps repoRoot to a deterministic sessionsDir.
- `resolveModel` delegates to shared; returns `actual = preferred` always.
- `promptIdentity` names the model or falls back to generic "Claude".
- `sessionName` includes agent id and mode.
- `buildArgs` handles --model, --resume, --fork-session, --session-id, --permission-mode, --name.

### agents/agy.test.mjs

- `sessionOpts` returns the standard agy paths.
- `loadActualModel` reads `model` from settings.json; handles missing/malformed/blank.
- `resolveModel` merges shared preferred + settings.json actual; reports modelKnown.
- `promptIdentity` prefers actual over preferred; falls back to generic "Antigravity (agy)".
- `sessionName` includes agent id and mode.
- `buildArgs` handles --conversation, --sandbox, --print-timeout; never includes --model.

### ask-ai.test.mjs

- `parseCliArgs` rejects unknown agent/mode with clear error messages.
- `parseCliArgs` rejects --resume + --fresh and --threshold NaN.
- `parseCliArgs` accepts agy-specific --sandbox and review --base/--head.

## Dry-Run Verification (does not invoke CLI)

```bash
node ask-ai.mjs claude ask "dry run?" --dry-run
node ask-ai.mjs agy ask "dry run?" --dry-run
```

Expected output:

- `claude`: `preferred: null`, `actual: null` (uses claude's default), `command` starts with `claude -p --permission-mode plan`.
- `agy`: `preferred: null`, `actual: "Gemini 3.1 Pro (High)"` (from settings.json), `modelKnown: true`, `command` starts with `agy -p`.

## Test Coverage Notes

### Verified behavior

- Config loading handles missing, malformed, and valid files.
- Model resolution follows the documented precedence (CLI > env > config > default).
- Session discovery uses the correct agent-specific paths and formats.
- Scoring ranks relevant older sessions above newer unrelated ones.
- Redacts raw prior transcript text from sessions output.
- Prompt identity names the correct model for each agent.
- CLI args include agent-specific flags (--model for claude, --conversation for agy, --sandbox agy-only).
- Error handling surfaces clear messages for unknown agents/modes and conflicting flags.

### Not tested (intentionally)

- Full end-to-end integration with real `claude`/`agy` binaries (tested manually via dry-run + smoke tests).
- SQLite session reading in agy (requires `node:sqlite` and actual database files).
- Session JSONL parsing in claude (covered by existing claude CLI tests).

### Bug magnets guarded by tests

- `defaultConfigFile` resolves to shared.mjs's directory (same as ask-ai.mjs in the current layout). If shared.mjs were moved to a subdirectory, the caller must pass its own `import.meta.url`.
- `tokenize` filters stop words like 'plan' and 'review' from search queries — this is intentional to avoid false matches.
- `scoreSession` returns 0 when no terms match — prevents blindly continuing the latest session.
