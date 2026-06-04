# ask-ai Deno/TypeScript Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `.agents/skills/ask-ai` from Node `.mjs` to Deno-native TypeScript while preserving existing behavior and hardening reliability, safety, and testability.

**Architecture:** Build a typed Deno implementation under `src/`, with a shell wrapper `ask-ai`, explicit agent contracts, streaming/bounded I/O, validated external JSON boundaries, and orchestration tests before deleting Node files. Port behavior module-by-module and keep every checkpoint green.

**Tech Stack:** Deno 2.6.10+, TypeScript, `deno test`, `deno fmt`, `deno lint`, `deno check`, JSR `@std/cli/parse-args`, JSR `@std/path`, JSR `@std/assert`.

---

## File Structure

Create and modify these files:

```text
.agents/skills/ask-ai/
  ask-ai
  deno.json
  src/main.ts
  src/orchestrator.ts
  src/agent.ts
  src/cli/args.ts
  src/cli/args_test.ts
  src/core/config.ts
  src/core/config_test.ts
  src/core/model.ts
  src/core/model_test.ts
  src/core/scoring.ts
  src/core/scoring_test.ts
  src/core/prompts.ts
  src/core/prompts_test.ts
  src/core/limits.ts
  src/sys/paths.ts
  src/sys/paths_test.ts
  src/sys/files.ts
  src/sys/files_test.ts
  src/sys/git.ts
  src/sys/git_test.ts
  src/sys/process.ts
  src/agents/claude.ts
  src/agents/claude_test.ts
  src/agents/pi.ts
  src/agents/pi_test.ts
  src/agents/agy.ts
  src/agents/agy_test.ts
  src/storage/agy.ts
  src/storage/agy_test.ts
  src/orchestrator_test.ts
  fixtures/claude-session.jsonl
  fixtures/pi-session.jsonl
  fixtures/agy-history.jsonl
  fixtures/agy-projects.json
  SKILL.md
  TESTING.md
  config.example.json
```

Remove only after all Deno tests and dry-runs pass:

```text
.agents/skills/ask-ai/ask-ai.mjs
.agents/skills/ask-ai/shared.mjs
.agents/skills/ask-ai/shared.test.mjs
.agents/skills/ask-ai/ask-ai.test.mjs
.agents/skills/ask-ai/agents/*.mjs
.agents/skills/ask-ai/agents/*.test.mjs
```

---

### Task 1: Add Deno scaffold and CLI argument parser

**Files:**
- Create: `.agents/skills/ask-ai/deno.json`
- Create: `.agents/skills/ask-ai/ask-ai`
- Create: `.agents/skills/ask-ai/src/cli/args.ts`
- Create: `.agents/skills/ask-ai/src/cli/args_test.ts`
- Create: `.agents/skills/ask-ai/src/core/limits.ts`

- [ ] **Step 1: Write failing CLI parser tests**

Create `.agents/skills/ask-ai/src/cli/args_test.ts`:

```ts
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { parseCliArgs } from "./args.ts";

Deno.test("parseCliArgs returns help for no args", () => {
  assertEquals(parseCliArgs([]), { kind: "help", error: undefined });
});

Deno.test("parseCliArgs accepts pi with model override", () => {
  const parsed = parseCliArgs([
    "pi",
    "ask",
    "challenge this",
    "--model",
    "zai/glm-5.1:xhigh",
    "--fresh",
    "--dry-run",
  ]);
  assertEquals(parsed.kind, "run");
  if (parsed.kind !== "run") throw new Error("expected run args");
  assertEquals(parsed.agent, "pi");
  assertEquals(parsed.mode, "ask");
  assertEquals(parsed.positional, ["challenge this"]);
  assertEquals(parsed.model, "zai/glm-5.1:xhigh");
  assertEquals(parsed.fresh, true);
  assertEquals(parsed.dryRun, true);
});

Deno.test("parseCliArgs rejects resume and fresh together", () => {
  assertThrows(
    () => parseCliArgs(["claude", "ask", "q", "--resume", "abc", "--fresh"]),
    Error,
    "--resume and --fresh are mutually exclusive",
  );
});

Deno.test("parseCliArgs parses review refs and cwd", () => {
  const parsed = parseCliArgs([
    "claude",
    "review",
    "--base",
    "main",
    "--head",
    "HEAD",
    "--cwd",
    "/tmp/repo",
  ]);
  assertEquals(parsed.kind, "run");
  if (parsed.kind !== "run") throw new Error("expected run args");
  assertEquals(parsed.base, "main");
  assertEquals(parsed.head, "HEAD");
  assertEquals(parsed.cwd, "/tmp/repo");
});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read src/cli/args_test.ts
```

Expected: FAIL with module not found for `src/cli/args.ts`.

- [ ] **Step 3: Add Deno config and parser implementation**

Create `.agents/skills/ask-ai/deno.json`:

```json
{
  "tasks": {
    "test": "deno test --allow-read --allow-env --allow-run=git",
    "check": "deno check src/main.ts",
    "lint": "deno lint",
    "fmt:check": "deno fmt --check",
    "verify": "deno fmt --check && deno lint && deno check src/main.ts && deno test --allow-read --allow-env --allow-run=git"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@1",
    "@std/cli/parse-args": "jsr:@std/cli@1/parse-args",
    "@std/path": "jsr:@std/path@1"
  },
  "fmt": {
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

Create `.agents/skills/ask-ai/src/core/limits.ts`:

```ts
export const DEFAULT_THRESHOLD = 12;
export const DEFAULT_MIN_MATCHED_TERMS = 2;
export const SUBJECT_FILE_BYTE_LIMIT = 20_000;
export const SESSION_TEXT_BYTE_LIMIT = 250_000;
export const SEARCH_TERM_LIMIT = 80;
export const DIFF_STAT_BYTE_LIMIT = 64_000;
export const DIFF_BODY_BYTE_LIMIT = 1_000_000;
export const MAX_SESSION_FILES = 1_000;
```

Create `.agents/skills/ask-ai/src/cli/args.ts`:

```ts
import { parseArgs } from "@std/cli/parse-args";
import { DEFAULT_THRESHOLD } from "../core/limits.ts";

export const AGENT_IDS = ["claude", "agy", "pi"] as const;
export const MODES = ["ask", "plan", "adversarial", "review", "sessions"] as const;

export type AgentId = typeof AGENT_IDS[number];
export type Mode = typeof MODES[number];

export type ParsedCliArgs =
  | { kind: "help"; error?: string }
  | {
    kind: "run";
    agent: AgentId;
    mode: Mode;
    positional: string[];
    base: string;
    head: string;
    fresh: boolean;
    threshold: number;
    model?: string;
    configFile?: string;
    resume?: string;
    sandbox: boolean;
    noSandbox: boolean;
    extra: string;
    cwd?: string;
    dryRun: boolean;
  };

function isAgent(value: string): value is AgentId {
  return (AGENT_IDS as readonly string[]).includes(value);
}

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

function stringValue(value: unknown, flag: string): string | undefined {
  if (value === undefined || value === false) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${flag} requires a non-empty value`);
  }
  return value.trim();
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const [agentRaw, modeRaw, ...rest] = argv;
  if (!agentRaw || agentRaw === "--help" || agentRaw === "-h") return { kind: "help" };
  if (!isAgent(agentRaw)) {
    return { kind: "help", error: `Unknown agent: ${agentRaw}. Known: ${AGENT_IDS.join(", ")}` };
  }
  if (!modeRaw || modeRaw === "--help" || modeRaw === "-h") return { kind: "help" };
  if (!isMode(modeRaw)) {
    return { kind: "help", error: `Unknown mode: ${modeRaw}. Known: ${MODES.join(", ")}` };
  }

  const parsed = parseArgs(rest, {
    boolean: ["fresh", "sandbox", "no-sandbox", "dry-run"],
    string: ["resume", "threshold", "model", "config", "base", "head", "extra", "cwd"],
    default: {
      base: "HEAD~1",
      head: "HEAD",
      fresh: false,
      sandbox: false,
      "no-sandbox": false,
      extra: "",
      "dry-run": false,
    },
    alias: { h: "help" },
    stopEarly: false,
    unknown: (arg) => !arg.startsWith("-"),
  });

  if (parsed.help === true) return { kind: "help" };

  const thresholdRaw = stringValue(parsed.threshold, "--threshold");
  const threshold = thresholdRaw === undefined ? DEFAULT_THRESHOLD : Number(thresholdRaw);
  if (!Number.isFinite(threshold)) throw new Error("--threshold must be a number");

  const resume = stringValue(parsed.resume, "--resume");
  const fresh = parsed.fresh === true;
  if (resume && fresh) throw new Error("--resume and --fresh are mutually exclusive");

  return {
    kind: "run",
    agent: agentRaw,
    mode: modeRaw,
    positional: parsed._.map(String),
    base: stringValue(parsed.base, "--base") ?? "HEAD~1",
    head: stringValue(parsed.head, "--head") ?? "HEAD",
    fresh,
    threshold,
    model: stringValue(parsed.model, "--model"),
    configFile: stringValue(parsed.config, "--config"),
    resume,
    sandbox: parsed.sandbox === true,
    noSandbox: parsed["no-sandbox"] === true,
    extra: stringValue(parsed.extra, "--extra") ?? "",
    cwd: stringValue(parsed.cwd, "--cwd"),
    dryRun: parsed["dry-run"] === true,
  };
}
```

Create `.agents/skills/ask-ai/ask-ai`:

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

Run:

```bash
chmod +x /tmp/audacioustux/.agents/skills/ask-ai/ask-ai
```

- [ ] **Step 4: Run tests to verify green**

Run:

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read src/cli/args_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit scaffold**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai/deno.json .agents/skills/ask-ai/ask-ai .agents/skills/ask-ai/src/cli/args.ts .agents/skills/ask-ai/src/cli/args_test.ts .agents/skills/ask-ai/src/core/limits.ts
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'feat: scaffold ask-ai deno cli'
```

---

### Task 2: Port pure core behavior with tests

**Files:**
- Create: `.agents/skills/ask-ai/src/core/model.ts`
- Create: `.agents/skills/ask-ai/src/core/model_test.ts`
- Create: `.agents/skills/ask-ai/src/core/scoring.ts`
- Create: `.agents/skills/ask-ai/src/core/scoring_test.ts`
- Create: `.agents/skills/ask-ai/src/core/prompts.ts`
- Create: `.agents/skills/ask-ai/src/core/prompts_test.ts`
- Create: `.agents/skills/ask-ai/src/core/config.ts`
- Create: `.agents/skills/ask-ai/src/core/config_test.ts`

- [ ] **Step 1: Write failing model/scoring tests**

Create tests that assert these behaviors copied from the current suite:

```ts
// src/core/model_test.ts
import { assertEquals } from "@std/assert";
import { resolvePreferredModel } from "./model.ts";

Deno.test("resolvePreferredModel precedence is cli env config default", () => {
  assertEquals(resolvePreferredModel({ agentId: "pi", cliModel: "cli", env: { ASK_AI_MODEL_PI: "env" }, config: { agents: { pi: { model: "config" } } } }), { preferred: "cli", source: "cli" });
  assertEquals(resolvePreferredModel({ agentId: "pi", env: { ASK_AI_MODEL_PI: "env" }, config: { agents: { pi: { model: "config" } } } }), { preferred: "env", source: "env" });
  assertEquals(resolvePreferredModel({ agentId: "pi", env: {}, config: { agents: { pi: { model: "config" } } } }), { preferred: "config", source: "config" });
  assertEquals(resolvePreferredModel({ agentId: "pi", env: {}, config: { agents: {} } }), { preferred: undefined, source: "default" });
});
```

```ts
// src/core/scoring_test.ts
import { assertEquals, assert } from "@std/assert";
import { scoreSession, selectSession, tokenize } from "./scoring.ts";

Deno.test("tokenize dedupes and splits path punctuation", () => {
  assertEquals(tokenize("Review src/foo/bar.ts and src/foo/bar.ts"), ["src", "foo", "bar", "bar.ts", "ts", "src/foo/bar.ts"]);
});

Deno.test("scoreSession returns zero when no query terms match", () => {
  assertEquals(scoreSession({ text: "unrelated", lastTimestamp: new Date("2026-06-04T00:00:00Z") }, "websocket auth", new Date("2026-06-04T00:00:00Z")), { score: 0, matchedTerms: 0 });
});

Deno.test("selectSession enforces threshold and matched terms", () => {
  assertEquals(selectSession([{ id: "a", score: 11.9, matchedTerms: 5, lastTimestamp: new Date() }]), undefined);
  assertEquals(selectSession([{ id: "a", score: 99, matchedTerms: 1, lastTimestamp: new Date() }]), undefined);
  assert(selectSession([{ id: "a", score: 99, matchedTerms: 2, lastTimestamp: new Date() }])?.id === "a");
});
```

- [ ] **Step 2: Run tests to verify red**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read src/core/model_test.ts src/core/scoring_test.ts
```

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement pure modules**

Implement `model.ts`, `scoring.ts`, `prompts.ts`, and `config.ts` by porting current logic, replacing magic numbers with constants from `limits.ts`, and returning typed `undefined` instead of `null` for absent optional values.

Required exported APIs:

```ts
// model.ts
export type ModelSource = "cli" | "env" | "config" | "default";
export function envVarFor(agentId: string): string;
export function resolvePreferredModel(input: { agentId: string; cliModel?: string; env?: Record<string, string | undefined>; config?: { agents?: Record<string, { model?: string }> } }): { preferred?: string; source: ModelSource };
```

```ts
// scoring.ts
export type ScoreableSession = { text: string; lastTimestamp: Date | string };
export type SessionCandidate = { id: string; score: number; matchedTerms: number; lastTimestamp: Date; trusted?: boolean; warnings?: string[] };
export function tokenize(text: string): string[];
export function scoreSession(session: ScoreableSession, query: string, now?: Date): { score: number; matchedTerms: number };
export function selectSession(candidates: SessionCandidate[], options?: { threshold?: number; minMatchedTerms?: number }): SessionCandidate | undefined;
```

- [ ] **Step 4: Add prompt/config tests and implement until green**

Add prompt/config tests mirroring current behavior:

```bash
deno test --allow-read src/core/model_test.ts src/core/scoring_test.ts src/core/prompts_test.ts src/core/config_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit core modules**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai/src/core
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'feat: port ask-ai core logic to deno'
```

---

### Task 3: Add system boundaries for paths, files, git, and process execution

**Files:**
- Create: `.agents/skills/ask-ai/src/sys/paths.ts`
- Create: `.agents/skills/ask-ai/src/sys/paths_test.ts`
- Create: `.agents/skills/ask-ai/src/sys/files.ts`
- Create: `.agents/skills/ask-ai/src/sys/files_test.ts`
- Create: `.agents/skills/ask-ai/src/sys/git.ts`
- Create: `.agents/skills/ask-ai/src/sys/git_test.ts`
- Create: `.agents/skills/ask-ai/src/sys/process.ts`

- [ ] **Step 1: Write failing path/file tests**

Tests must cover:

- Git worktree repo root detection via `git rev-parse --show-toplevel`.
- Pi path encoding: `/tmp/a:b` becomes `--tmp-a-b--`.
- Bounded file reads return a truncation warning when capped.
- Streaming JSONL skips corrupt lines and counts warnings.

Example test skeleton:

```ts
import { assertEquals } from "@std/assert";
import { encodePiProjectPath } from "./paths.ts";

Deno.test("encodePiProjectPath mirrors Pi SessionManager", () => {
  assertEquals(encodePiProjectPath("/workspaces/TheGrid"), "--workspaces-TheGrid--");
  assertEquals(encodePiProjectPath("/tmp/a:b"), "--tmp-a-b--");
});
```

- [ ] **Step 2: Run tests to verify red**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read --allow-run=git src/sys/paths_test.ts src/sys/files_test.ts src/sys/git_test.ts
```

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement sys modules**

Required APIs:

```ts
// paths.ts
export function homeDir(env?: Record<string, string | undefined>): string;
export function expandHome(input: string, home?: string): string;
export function encodeClaudeProjectPath(repoRoot: string): string;
export function encodePiProjectPath(repoRoot: string): string;
export async function findRepoRoot(cwd: string): Promise<string>;
```

```ts
// files.ts
export type BoundedRead = { text: string; bytesRead: number; truncated: boolean; path: string };
export async function readTextFileBounded(path: string, maxBytes: number): Promise<BoundedRead>;
export async function* readJsonLines(path: string): AsyncGenerator<{ value?: unknown; error?: string; line: number }>;
```

```ts
// git.ts
export type GitOutput = { stdout: string; stderr: string; truncated: boolean; status: number };
export async function gitOutput(args: string[], cwd: string, maxBytes: number): Promise<GitOutput>;
```

```ts
// process.ts
export type ChildCommand = { bin: string; args: string[]; stdin?: string; cwd: string };
export type CommandRunner = (command: ChildCommand) => Promise<number>;
export const runChildInherit: CommandRunner;
```

- [ ] **Step 4: Verify sys tests green**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read --allow-write=/tmp --allow-run=git src/sys
```

Expected: PASS.

- [ ] **Step 5: Commit sys boundaries**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai/src/sys
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'feat: add deno system boundaries for ask-ai'
```

---

### Task 4: Port typed agent contract and Claude agent

**Files:**
- Create: `.agents/skills/ask-ai/src/agent.ts`
- Create: `.agents/skills/ask-ai/src/agents/claude.ts`
- Create: `.agents/skills/ask-ai/src/agents/claude_test.ts`
- Create: `.agents/skills/ask-ai/fixtures/claude-session.jsonl`

- [ ] **Step 1: Add Claude fixture and failing tests**

Fixture content:

```jsonl
{"type":"summary","summary":"router websocket auth handoff","sessionId":"claude-session-a","timestamp":"2026-06-03T00:00:00.000Z"}
{"sessionId":"claude-session-a","timestamp":"2026-06-03T00:00:01.000Z","message":{"role":"user","content":[{"type":"text","text":"Please review websocket auth token propagation."}]}}
{"sessionId":"claude-session-a","timestamp":"2026-06-03T00:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Check the router handoff."}]}}
```

Test required behavior:

- `sessionOpts` maps repo root to `~/.claude/projects/<encoded>`.
- `resolveModel` returns `actual = preferred`.
- `buildCommand` includes `-p`, `--permission-mode plan`, `--model` when set, `--resume`, and `--fork-session`.
- `rankSessions` scores the fixture above an unrelated fixture.

- [ ] **Step 2: Run Claude tests red**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read src/agents/claude_test.ts
```

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement agent contract and Claude port**

`agent.ts` must define the shared interface from the design spec. `claude.ts` must use streaming JSONL parsing and ignore tool results.

- [ ] **Step 4: Verify Claude tests green**

```bash
deno test --allow-read src/agent.ts src/agents/claude_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Claude port**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai/src/agent.ts .agents/skills/ask-ai/src/agents/claude.ts .agents/skills/ask-ai/src/agents/claude_test.ts .agents/skills/ask-ai/fixtures/claude-session.jsonl
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'feat: port claude ask-ai agent to deno'
```

---

### Task 5: Port Pi agent

**Files:**
- Create: `.agents/skills/ask-ai/src/agents/pi.ts`
- Create: `.agents/skills/ask-ai/src/agents/pi_test.ts`
- Create: `.agents/skills/ask-ai/fixtures/pi-session.jsonl`

- [ ] **Step 1: Write failing Pi tests**

Tests must cover:

- Settings load from `defaultProvider`, `defaultModel`, `defaultThinkingLevel`, `enabledModels`.
- CLI/env/config model override is real and becomes `actual`.
- Default display model is `provider/model:thinking`.
- `toolResult` content does not affect scoring.
- Command uses `pi -p --tools read,grep,find,ls --session` for reuse and `--session-id` for new sessions.

Use a fixture with user/assistant/toolResult messages.

- [ ] **Step 2: Run Pi tests red**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read src/agents/pi_test.ts
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement Pi port**

Implementation requirements:

- Use `encodePiProjectPath` from `sys/paths.ts`.
- Validate settings shape with narrow guards.
- Normalize known model comparison by provider/model and optional thinking suffix.
- Exclude `role: "toolResult"`.
- Return parse warnings instead of throwing on corrupt lines.

- [ ] **Step 4: Verify Pi tests green**

```bash
deno test --allow-read src/agents/pi_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Pi port**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai/src/agents/pi.ts .agents/skills/ask-ai/src/agents/pi_test.ts .agents/skills/ask-ai/fixtures/pi-session.jsonl
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'feat: port pi ask-ai agent to deno'
```

---

### Task 6: Port safe agy metadata support

**Files:**
- Create: `.agents/skills/ask-ai/src/storage/agy.ts`
- Create: `.agents/skills/ask-ai/src/storage/agy_test.ts`
- Create: `.agents/skills/ask-ai/src/agents/agy.ts`
- Create: `.agents/skills/ask-ai/src/agents/agy_test.ts`
- Create: `.agents/skills/ask-ai/fixtures/agy-history.jsonl`
- Create: `.agents/skills/ask-ai/fixtures/agy-projects.json`

- [ ] **Step 1: Write failing agy storage tests**

Fixtures:

```jsonl
{"conversationId":"conv-a","display":"router websocket auth handoff","timestamp":1780000000000}
{"conversationId":"conv-b","display":"unrelated css colors","timestamp":1780000001000}
```

```json
{
  "/repo": "conv-a"
}
```

Tests must assert:

- Actual model loads from `settings.json` field `model`.
- Preferred model remains a hint and is not passed to agy command.
- Project mapping scopes auto-resume to the mapped conversation.
- Missing project mapping returns untrusted candidates that `selectSession` cannot auto-resume.
- No SQLite BLOB/protobuf scraping is used by default.

- [ ] **Step 2: Run agy tests red**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read src/storage/agy_test.ts src/agents/agy_test.ts
```

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement agy metadata parser and agent**

Required behaviors:

- `modelKnown` is `undefined` because agy model list is external and volatile.
- `buildCommand` never includes `--model`.
- `buildCommand` uses `--conversation <id>` for reuse.
- Default review/adversarial command includes agy's strongest safe non-interactive option only if verified by CLI behavior. If the current CLI treats `--sandbox` as prompt text, do not pass it by default; document this limitation and keep safety prompt text.
- Return warnings when project scope is missing or ambiguous.

- [ ] **Step 4: Verify agy tests green**

```bash
deno test --allow-read src/storage/agy_test.ts src/agents/agy_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit agy port**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai/src/storage/agy.ts .agents/skills/ask-ai/src/storage/agy_test.ts .agents/skills/ask-ai/src/agents/agy.ts .agents/skills/ask-ai/src/agents/agy_test.ts .agents/skills/ask-ai/fixtures/agy-history.jsonl .agents/skills/ask-ai/fixtures/agy-projects.json
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'feat: port safe agy ask-ai metadata support'
```

---

### Task 7: Implement orchestrator with dependency injection

**Files:**
- Create: `.agents/skills/ask-ai/src/orchestrator.ts`
- Create: `.agents/skills/ask-ai/src/orchestrator_test.ts`
- Create: `.agents/skills/ask-ai/src/main.ts`

- [ ] **Step 1: Write failing orchestrator tests**

Tests must use fake dependencies and cover:

- Dry-run does not spawn child process.
- `sessions` mode serializes sanitized candidate fields only.
- Explicit `--resume` bypasses ranking and marks selected score as `explicit`.
- Agy preferred-vs-actual mismatch warning is agy-only.
- Review mode calls git wrapper with base/head and bounded limits.
- Subject file mode reads bounded file content.

- [ ] **Step 2: Run orchestrator tests red**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno test --allow-read src/orchestrator_test.ts
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement orchestrator and main**

Required APIs:

```ts
// orchestrator.ts
export type AskAiDeps = {
  agents: Record<string, Agent>;
  now: () => Date;
  randomUUID: () => string;
  runChild: CommandRunner;
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
};
export async function runAskAi(args: ParsedCliArgs, deps: AskAiDeps): Promise<number>;
```

`main.ts` must:

- Parse args.
- Print usage for help/error.
- Register real agents.
- Call `runAskAi`.
- Set `Deno.exitCode` via returned status.

- [ ] **Step 4: Verify orchestrator green**

```bash
deno test --allow-read --allow-run=git src/orchestrator_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit orchestrator**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai/src/orchestrator.ts .agents/skills/ask-ai/src/orchestrator_test.ts .agents/skills/ask-ai/src/main.ts
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'feat: add deno ask-ai orchestrator'
```

---

### Task 8: End-to-end dry-run smoke tests through wrapper

**Files:**
- Modify: `.agents/skills/ask-ai/TESTING.md`

- [ ] **Step 1: Run full Deno verification**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno task verify
```

Expected: PASS for fmt, lint, check, and tests.

- [ ] **Step 2: Run wrapper dry-runs**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
./ask-ai claude ask "dry run?" --fresh --dry-run
./ask-ai agy ask "dry run?" --fresh --dry-run
./ask-ai pi ask "dry run?" --fresh --dry-run
./ask-ai pi ask "dry run?" --fresh --model zai/glm-5.1:xhigh --dry-run
```

Expected:

- All commands exit 0.
- Claude command contains `claude -p --permission-mode plan`.
- Agy command contains `agy -p` and no `--model`.
- Pi command contains `pi -p --tools read,grep,find,ls`.
- Pi model override command contains `--model zai/glm-5.1:xhigh`.

- [ ] **Step 3: Commit smoke test documentation**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai/TESTING.md
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'docs: document deno ask-ai verification'
```

---

### Task 9: Update skill documentation and remove Node implementation

**Files:**
- Modify: `.agents/skills/ask-ai/SKILL.md`
- Modify: `.agents/skills/ask-ai/config.example.json`
- Delete: Node `.mjs` implementation and `.mjs` tests listed in File Structure.

- [ ] **Step 1: Update SKILL.md**

Document:

- Deno requirement.
- `./ask-ai` wrapper usage.
- Three agents and model behavior.
- Deno permission rationale.
- Honest safety language: child CLIs are not sandboxed by Deno.
- Agy auto-resume limitations.

- [ ] **Step 2: Remove obsolete Node files only after green Deno verification**

Run before deleting:

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno task verify
```

Expected: PASS.

Then remove:

```bash
rm ask-ai.mjs shared.mjs shared.test.mjs ask-ai.test.mjs agents/*.mjs agents/*.test.mjs
```

- [ ] **Step 3: Run final Deno verification**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno task verify
./ask-ai claude ask "dry run?" --fresh --dry-run
./ask-ai agy ask "dry run?" --fresh --dry-run
./ask-ai pi ask "dry run?" --fresh --dry-run
```

Expected: PASS.

- [ ] **Step 4: Commit docs and cleanup**

```bash
cd /tmp/audacioustux
git add .agents/skills/ask-ai
git -c user.name='Tanjim H.' -c user.email='contact@audacioustux.com' commit -S -m 'feat: replace ask-ai node runtime with deno typescript'
```

---

### Task 10: Independent review, install, and final verification

**Files:**
- No planned code files unless review finds required fixes.

- [ ] **Step 1: Run final verification**

```bash
cd /tmp/audacioustux/.agents/skills/ask-ai
deno task verify
./ask-ai claude ask "dry run?" --fresh --dry-run
./ask-ai agy ask "dry run?" --fresh --dry-run
./ask-ai pi ask "dry run?" --fresh --dry-run
```

Expected: PASS.

- [ ] **Step 2: Request code review**

Use GLM, agy, and Opus again with a fresh review brief containing the final Deno code and tests. Required focus:

- Runtime behavior preservation.
- Deno permissions honesty.
- Agy session safety.
- Streaming/bounded I/O.
- Test coverage for orchestration.
- Documentation clarity.

- [ ] **Step 3: Fix Critical/Important review findings with TDD**

For each accepted finding:

1. Write a failing Deno test that reproduces the issue.
2. Run the test and verify red.
3. Implement the smallest fix.
4. Run targeted test and `deno task verify`.
5. Commit with signed author.

- [ ] **Step 4: Install updated skill and smoke test installed copy**

```bash
cd /tmp/audacioustux
git status --short
npx skills add audacioustux/audacioustux -s ask-ai -y
```

Then run the installed helper path according to the skills installer output. Expected: installed dry-runs match source dry-runs.

- [ ] **Step 5: Push**

```bash
cd /tmp/audacioustux
git push
```

Expected: push succeeds. If GitHub reports an HTTPS credential warning after a successful push, verify with `git log --oneline -1` and remote state before retrying.

---

## Plan Self-Review

- Spec coverage: every design requirement maps to a task: Deno wrapper/config in Task 1, pure typed core in Task 2, streaming/bounded sys modules in Task 3, agents in Tasks 4-6, orchestration in Task 7, verification/docs/cleanup in Tasks 8-10.
- Placeholder scan: no unresolved placeholders or unspecified implementation steps are intentionally left.
- Type consistency: `Agent`, `SessionCandidate`, `RankSessionsResult`, `ChildCommand`, and `ParsedCliArgs` are introduced before use in later tasks.
- Risk control: Node files are deleted only after Deno verification and wrapper dry-runs pass.
