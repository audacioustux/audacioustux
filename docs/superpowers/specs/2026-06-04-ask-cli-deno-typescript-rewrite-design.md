# ask-ai Deno/TypeScript Rewrite Design

## Status

Approved direction: safety-first Deno/TypeScript rewrite.

Review inputs:

- GLM review: `/tmp/ask-ai-review-glm.md`
- agy review: `/tmp/ask-ai-review-agy.md`
- Opus review: `/home/vscode/.claude/plans/you-are-opus-acting-moonlit-donut.md`

Current runtime target: Deno 2.6.10 or newer stable Deno 2.x.

## Goal

Rewrite `.agents/skills/ask-ai` from Node `.mjs` to Deno-native TypeScript while preserving existing user-visible behavior and eliminating whole categories of reliability, maintainability, portability, and testability issues.

## Non-goals

- Do not add new agents beyond `claude`, `agy`, and `pi`.
- Do not introduce routing-by-prompt or automatic model selection.
- Do not claim Deno permissions sandbox spawned child CLIs. Deno constrains the wrapper process; child CLIs still enforce their own safety policies.
- Do not keep opaque agy BLOB/protobuf scraping as a default relevance signal.
- Do not preserve `node ask-ai.mjs` compatibility unless a small transition note is needed. The supported runtime becomes Deno.

## Behavior to Preserve

- One skill, three agents: `claude`, `agy`, `pi`.
- Modes: `ask`, `plan`, `adversarial`, `review`, `sessions`.
- Session reuse is explicit and relevance-scored. Never use latest-session `--continue`.
- Model precedence: CLI `--model` > `$ASK_AI_MODEL_<AGENT>` > `config.json` > CLI settings/default.
- `claude`: real `--model` override, session reuse via `--resume <id>` plus fork behavior, plan permission mode.
- `agy`: no real `--model` flag. Preferred model is only a hint; actual model comes from `~/.gemini/antigravity-cli/settings.json`.
- `pi`: read `~/.pi/agent/settings.json`; real `--model provider/model[:thinking]` override; default display model comes from `defaultProvider/defaultModel/defaultThinkingLevel`.
- `review` mode builds a committed-range review from `--base` and `--head`.
- `sessions` mode prints ranked candidates without invoking a child CLI.

## Design Principles

1. **Tests before porting.** Add characterization/orchestration tests around behavior before deleting the `.mjs` implementation.
2. **Typed external boundaries.** Config, settings files, JSONL sessions, agy history/project metadata, and command outputs are parsed into typed results with validation failures recorded, not silently swallowed.
3. **Streaming by default.** Large files, JSONL sessions, and git diffs are streamed or bounded. No unbounded `readFile`, `execFileSync`, `spawnSync`, or full-output string concatenation on untrusted size inputs.
4. **Honest safety language.** The wrapper constrains how ask-ai invokes child CLIs, but spawned agents are not sandboxed by Deno. Documentation must say which parts are mechanical safeguards and which are prompt-level guidance.
5. **Small modules with explicit interfaces.** Keep the existing agent contract idea, but split shared utilities by responsibility.
6. **Fail closed for session reuse.** If a session store cannot be parsed or scoped confidently, do not auto-resume it. `sessions` mode may report degraded candidates with a reason.

## Proposed File Layout

```text
.agents/skills/ask-ai/
  ask-ai                         # POSIX wrapper: exec deno run with fixed permissions
  deno.json                      # tasks, imports, fmt, lint, lock config
  deno.lock
  src/
    main.ts                      # CLI entry point, import.meta.main guard
    orchestrator.ts              # pure-ish workflow orchestration with injected deps
    agent.ts                     # typed Agent interface and common result types
    cli/args.ts                  # parseArgs-based CLI parsing and usage text
    core/config.ts               # config schema and loadConfig
    core/model.ts                # model precedence helpers
    core/scoring.ts              # tokenize, scoreSession, selectSession
    core/prompts.ts              # buildPrompt, buildSearchQuery
    core/limits.ts               # named byte/term/session caps
    sys/paths.ts                 # home, repo root, project path encoding, expansion
    sys/files.ts                 # bounded reads, streaming JSONL, safe JSON helpers
    sys/git.ts                   # Deno.Command git wrapper, bounded streaming output
    sys/process.ts               # Deno.Command child invocation wrapper
    agents/claude.ts
    agents/agy.ts
    agents/pi.ts
    storage/agy.ts               # structured agy history/project metadata only by default
  fixtures/
    claude-session.jsonl
    pi-session.jsonl
    agy-history.jsonl
    agy-projects.json
  *_test.ts or src/**/*.test.ts
  SKILL.md
  TESTING.md
  config.example.json
```

## CLI and Entrypoint

Use a POSIX shell wrapper named `ask-ai` instead of a multi-flag TypeScript shebang.

Reasons:

- `#!/usr/bin/env -S deno run ...` is less portable across environments.
- A wrapper centralizes the permission set.
- Users run one stable command while implementation stays in `src/main.ts`.

Wrapper shape:

```sh
#!/usr/bin/env sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec deno run \
  --quiet \
  --no-prompt \
  --allow-read \
  --allow-env=ASK_AI_MODEL_CLAUDE,ASK_AI_MODEL_AGY,ASK_AI_MODEL_PI,HOME,PATH \
  --allow-run=git,claude,agy,pi \
  "$SCRIPT_DIR/src/main.ts" "$@"
```

The broad `--allow-read` is intentional because the tool reads the current repo plus three vendor session/config stores under `$HOME`. Documentation must explain this honestly.

A later `deno compile` distribution can be considered after the script version is stable.

## Data Flow

1. `main.ts` calls `parseCliArgs(Deno.args)`.
2. `orchestrator.ts` resolves cwd, repo root, config path, agent module, and model info.
3. Prompt/query are built from mode:
   - `review`: stream bounded `git diff --stat` and `git diff --no-ext-diff --find-renames --function-context -- <range>` into a bounded prompt body.
   - subject modes: bounded file read if the subject is a file; otherwise use the subject text.
4. The selected agent returns session options and ranked session candidates.
5. `selectSession` chooses a candidate only when threshold and matched-term requirements pass and the candidate is scoped/trusted.
6. `sessions` mode serializes sanitized candidates.
7. Non-dry-run modes invoke the child CLI with `Deno.Command`, prompt delivered through stdin where supported. If a child CLI requires prompt-as-argv, apply a strict prompt byte cap and fail with a clear message.

## Agent Contracts

```ts
export interface Agent {
  id: "claude" | "agy" | "pi";
  displayName: string;
  cliBin: string;
  sessionOpts(input: SessionOptsInput): SessionOpts;
  resolveModel(input: ResolveModelInput): Promise<ModelInfo>;
  promptIdentity(input: ModelInfo): string;
  sessionName(input: { mode: Mode; stamp: string }): string;
  rankSessions(input: RankSessionsInput): Promise<RankSessionsResult>;
  buildCommand(input: BuildCommandInput): ChildCommand;
}
```

`rankSessions` returns a typed result:

```ts
type RankSessionsResult =
  | { ok: true; candidates: SessionCandidate[]; warnings: SessionWarning[] }
  | { ok: false; candidates: []; warnings: SessionWarning[] };
```

Warnings are available in dry-run and test output. Auto-resume uses only trusted candidates.

## Session Scanning

### Common Rules

- Stream JSONL line-by-line.
- Store text fragments in arrays and join once, or score incrementally.
- Cap per-session text and number of scanned sessions with named constants.
- Ignore tool result/output content by default; include user/assistant text and bounded tool-call arguments only.
- Record parse errors as warnings.

### Claude

- Read `~/.claude/projects/<encoded-cwd>/*.jsonl`.
- Parse known message shapes with schema validation.
- Preserve existing resume behavior: `--resume <id>` and fork behavior.

### Pi

- Read `~/.pi/agent/settings.json` for default provider/model/thinking display.
- Mirror Pi SessionManager path encoding: `resolvedCwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")`, wrapped as `--<safe>--`.
- Parse Pi JSONL session headers, model changes, thinking-level changes, and user/assistant message content.
- Ignore `role: "toolResult"` text.
- Invoke with `pi -p --tools read,grep,find,ls` plus `--session` or `--session-id`.

### Agy

Agy is the riskiest store and gets a fail-closed design.

Default behavior:

- Read actual model from `~/.gemini/antigravity-cli/settings.json`.
- Read `history.jsonl` and `cache/projects.json` through schemas.
- Use only structured, scoped metadata (`display`, timestamp, conversation id, project mapping) for auto-resume.
- If project scoping is missing or inconsistent, do not auto-resume; `sessions` mode can list degraded candidates with warnings.

Opaque DB/protobuf behavior:

- Do not scrape all BLOB-bearing SQLite tables by default.
- Do not include raw BLOB/protobuf printable runs in scoring by default.
- Optional future enhancement may add `storage/agy.ts` safe SQLite queries only with anonymized fixtures, row caps, column allowlists, and no secret-bearing tool output.

## Git and Prompt Size Handling

- Replace `execFileSync` with `Deno.Command`.
- Pass git refs after `--` where applicable.
- Use named caps for diff stat bytes, diff body bytes, subject file bytes, session bytes, and candidate count.
- If a diff exceeds caps, include a clear truncation note in the prompt and dry-run summary.
- Avoid prompt-as-argv where possible. Prefer child stdin. If a CLI cannot accept stdin, enforce a byte cap before spawning.

## Error Handling

Use typed errors/warnings rather than silent catches:

- Invalid config/settings: continue with defaults and warning.
- Missing session directory: return no candidates, no failure.
- Corrupt session line: skip line with counted warning.
- Untrusted/unscoped candidate: include in `sessions` output but never auto-select.
- Git failure in review mode: fail with the git command and stderr.
- Missing child CLI: fail with install guidance.

## Testing Strategy

### Characterization Before Port

Before replacing `.mjs`, capture current behavior with tests/fixtures:

- CLI parsing for every mode and option, including invalid combinations.
- Dry-run JSON shape for `claude`, `agy`, and `pi` with fake agents/deps.
- Sessions-mode JSON shape and candidate redaction.
- Model precedence per agent.
- Prompt construction for each mode.
- Child command construction per agent.
- Warning behavior for agy preferred-vs-actual mismatch.

### Deno Test Suite

Use `deno test` with dependency injection:

- Pure unit tests for config, model, scoring, prompt, paths, and CLI parsing.
- Fixture tests for claude/pi JSONL parsing and agy metadata parsing.
- Orchestrator tests with fake agents, fake git, fake session stores, and fake process runner.
- Integration smoke tests for `ask-ai --dry-run` through the wrapper.

### Quality Gates

Every implementation checkpoint must pass:

```bash
deno fmt --check
deno lint
deno check src/main.ts
deno test --allow-read --allow-env --allow-run=git
```

Child CLI smoke tests use dry-run only unless explicitly requested:

```bash
./ask-ai claude ask "dry run?" --fresh --dry-run
./ask-ai agy ask "dry run?" --fresh --dry-run
./ask-ai pi ask "dry run?" --fresh --dry-run
```

## Documentation Updates

`SKILL.md` must document:

- Deno runtime requirement.
- Wrapper command usage.
- Honest safety language for child CLIs.
- Model behavior for all three agents.
- Agy auto-resume limitations and warnings.
- Deno permission rationale.

`TESTING.md` must document:

- Deno test/fmt/lint/check commands.
- Fixture purpose and update process.
- Dry-run smoke tests.
- Known intentionally unsupported behavior, especially opaque agy BLOB scraping.

## Implementation Phases

1. **Spec and plan**: commit this design, then write a detailed TDD implementation plan.
2. **Characterization tests**: add tests/golden fixtures around current behavior and review them.
3. **Deno scaffold**: add `deno.json`, wrapper, `src/main.ts`, typed CLI parsing, and pure modules.
4. **Agent ports**: port `claude`, `pi`, then `agy`, with fixtures and tests for each.
5. **Orchestrator port**: replace blocking Node orchestration with injected Deno services.
6. **Docs and migration**: update SKILL/TESTING/config examples.
7. **Verification**: run full Deno gates and dry-run all agents.
8. **Review and cleanup**: run code review again, remove obsolete `.mjs` files only after tests and docs are green.

## Acceptance Criteria

- No Node `.mjs` runtime path remains for supported use.
- `./ask-ai` works for `claude`, `agy`, and `pi` dry-runs.
- Existing behavior is preserved unless this spec explicitly changes it.
- Agy does not auto-resume from unscoped or opaque scraped content.
- Large diffs/session stores are bounded or streamed.
- All external JSON parse points are validated.
- Deno `fmt`, `lint`, `check`, and `test` pass.
- Documentation states the real security posture accurately.
