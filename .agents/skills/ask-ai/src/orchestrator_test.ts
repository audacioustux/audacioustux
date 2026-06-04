import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import type { Agent, ModelInfo, RankSessionsInput, ResolveModelInput } from "./agent.ts";
import { type AgentId, type Mode, parseCliArgs } from "./cli/args.ts";
import { type AskAiDeps, runAskAi } from "./orchestrator.ts";
import type { SessionCandidate } from "./core/scoring.ts";
import type { GitOutput } from "./sys/git.ts";
import type { ChildCommand } from "./sys/process.ts";

function runArgs(argv: string[]) {
  const parsed = parseCliArgs(argv);
  if (parsed.kind !== "run") throw new Error("expected run args");
  return parsed;
}

function fakeAgent(
  agentId: AgentId,
  modelInfo: ModelInfo,
  candidates: SessionCandidate[] = [],
): Agent {
  return {
    id: agentId,
    displayName: agentId,
    cliBin: agentId,
    sessionOpts: () => ({
      sessionsDir: "/sessions",
      settingsFile: "/settings.json",
      repoRoot: "/repo",
    }),
    resolveModel: (_input: ResolveModelInput) => Promise.resolve(modelInfo),
    promptIdentity: ({ actual, preferred }) => `You are ${actual ?? preferred ?? agentId}.`,
    sessionName: ({ mode, stamp }: { mode: Mode; stamp: string }) =>
      `ask-ai-${agentId}-${mode}-${stamp}`,
    rankSessions: (_input: RankSessionsInput) =>
      Promise.resolve({ ok: true, candidates, warnings: [] }),
    buildCommand: ({ prompt, sessionId, model, name, newSessionId, cwd }) => ({
      bin: agentId,
      cwd,
      args: [
        "-p",
        ...(model ? ["--model", model] : []),
        ...(name ? ["--name", name] : []),
        ...(sessionId ? ["--session", sessionId] : []),
        ...(newSessionId ? ["--session-id", newSessionId] : []),
        prompt,
      ],
    }),
  };
}

function deps(
  overrides: Partial<AskAiDeps> = {},
): AskAiDeps & { stdout: string[]; stderr: string[]; runs: ChildCommand[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const runs: ChildCommand[] = [];
  return {
    agents: {
      claude: fakeAgent("claude", { preferred: undefined, actual: undefined, source: "default" }),
      agy: fakeAgent("agy", { preferred: undefined, actual: "Gemini", source: "default" }),
      pi: fakeAgent("pi", { preferred: undefined, actual: "openai/gpt:xhigh", source: "default" }),
    },
    now: () => new Date("2026-06-04T00:00:00.000Z"),
    randomUUID: () => "uuid-1",
    runChild: (command: ChildCommand) => {
      runs.push(command);
      return Promise.resolve(0);
    },
    writeStdout: (text: string) => stdout.push(text),
    writeStderr: (text: string) => stderr.push(text),
    currentCwd: () => "/repo/subdir",
    env: () => ({}),
    findRepoRoot: () => Promise.resolve("/repo"),
    loadConfig: () => Promise.resolve({ agents: {} }),
    gitOutput: () => Promise.resolve({ stdout: "", stderr: "", status: 0, truncated: false }),
    readSubjectFile: () => Promise.resolve({ text: "", resolvedPath: "", truncated: false }),
    mkdir: () => Promise.resolve(),
    stdout,
    stderr,
    runs,
    ...overrides,
  };
}

Deno.test("runAskAi dry-run does not spawn and prints command summary", async () => {
  const d = deps();
  const code = await runAskAi(runArgs(["pi", "ask", "hello", "--fresh", "--dry-run"]), d);
  assertEquals(code, 0);
  assertEquals(d.runs.length, 0);
  const summary = JSON.parse(d.stdout.join(""));
  assertEquals(summary.agent, "pi");
  assertEquals(summary.selectedSession, undefined);
  assertEquals(summary.command[0], "pi");
});

Deno.test("runAskAi sessions mode serializes sanitized candidates", async () => {
  const candidate = {
    id: "s1",
    score: 99,
    matchedTerms: 3,
    lastTimestamp: new Date("2026-06-03T00:00:00Z"),
    text: "secret transcript",
    trusted: true,
  };
  const d = deps({
    agents: {
      claude: fakeAgent("claude", { source: "default" }, [candidate]),
      agy: fakeAgent("agy", { source: "default" }),
      pi: fakeAgent("pi", { source: "default" }),
    },
  });
  const code = await runAskAi(runArgs(["claude", "sessions", "websocket auth"]), d);
  assertEquals(code, 0);
  const out = JSON.parse(d.stdout.join(""));
  assertEquals(out.sessions, [{ id: "s1", score: 99, lastTimestamp: "2026-06-03T00:00:00.000Z" }]);
  assertEquals(JSON.stringify(out).includes("secret transcript"), false);
});

Deno.test("runAskAi explicit resume bypasses ranking and marks score explicit", async () => {
  let ranked = false;
  const d = deps({
    agents: {
      claude: {
        ...fakeAgent("claude", { preferred: "opus", actual: "opus", source: "cli" }),
        rankSessions: () => {
          ranked = true;
          return Promise.resolve({ ok: true, candidates: [], warnings: [] });
        },
      },
      agy: fakeAgent("agy", { source: "default" }),
      pi: fakeAgent("pi", { source: "default" }),
    },
  });
  await runAskAi(runArgs(["claude", "ask", "q", "--resume", "abc", "--dry-run"]), d);
  const summary = JSON.parse(d.stdout.join(""));
  assertEquals(ranked, false);
  assertEquals(summary.selectedSession, { id: "abc", score: "explicit" });
});

Deno.test("runAskAi warns on agy preferred actual mismatch only", async () => {
  const agyDeps = deps({
    agents: {
      claude: fakeAgent("claude", { source: "default" }),
      agy: fakeAgent("agy", { preferred: "hint", actual: "Gemini", source: "cli" }),
      pi: fakeAgent("pi", { source: "default" }),
    },
  });
  await runAskAi(runArgs(["agy", "ask", "q", "--fresh"]), agyDeps);
  assertStringIncludes(agyDeps.stderr.join(""), 'requested model "hint" differs');

  const claudeDeps = deps({
    agents: {
      claude: fakeAgent("claude", { preferred: "hint", actual: "actual", source: "cli" }),
      agy: fakeAgent("agy", { source: "default" }),
      pi: fakeAgent("pi", { source: "default" }),
    },
  });
  await runAskAi(runArgs(["claude", "ask", "q", "--fresh"]), claudeDeps);
  assertEquals(claudeDeps.stderr.join("").includes("differs"), false);
});

Deno.test("runAskAi review mode calls git wrapper with base and head", async () => {
  const gitCalls: string[][] = [];
  const d = deps({
    gitOutput: (args: string[]): Promise<GitOutput> => {
      gitCalls.push(args);
      return Promise.resolve({
        stdout: args.includes("--stat") ? "stat" : "diff",
        stderr: "",
        status: 0,
        truncated: false,
      });
    },
  });
  await runAskAi(runArgs(["pi", "review", "--base", "main", "--head", "HEAD", "--dry-run"]), d);
  assertEquals(gitCalls, [
    ["diff", "--stat", "main..HEAD", "--"],
    ["diff", "--no-ext-diff", "--find-renames", "--function-context", "main..HEAD", "--"],
  ]);
});

Deno.test("runAskAi subject mode reads bounded file content", async () => {
  let readSubject = "";
  const d = deps({
    readSubjectFile: (subject: string) => {
      readSubject = subject;
      return Promise.resolve({
        text: "file body",
        resolvedPath: "/repo/plan.md",
        truncated: false,
      });
    },
  });
  await runAskAi(runArgs(["pi", "plan", "plan.md", "--dry-run", "--fresh"]), d);
  const summary = JSON.parse(d.stdout.join(""));
  assertEquals(readSubject, "plan.md");
  assertStringIncludes(summary.command.at(-1), "file body");
});

Deno.test("runAskAi includes a truncation note for bounded subject files", async () => {
  const d = deps({
    readSubjectFile: () =>
      Promise.resolve({ text: "file body", resolvedPath: "/repo/plan.md", truncated: true }),
  });
  await runAskAi(runArgs(["pi", "plan", "plan.md", "--dry-run", "--fresh"]), d);
  const summary = JSON.parse(d.stdout.join(""));
  assertStringIncludes(summary.command.at(-1), "[ask-ai: target file content truncated]");
});

Deno.test("runAskAi does not require Deno write permission before invoking claude", async () => {
  let mkdirCalled = false;
  const d = deps({
    mkdir: () => {
      mkdirCalled = true;
      return Promise.resolve();
    },
  });
  await runAskAi(runArgs(["claude", "ask", "q", "--fresh"]), d);
  assertEquals(mkdirCalled, false);
});
