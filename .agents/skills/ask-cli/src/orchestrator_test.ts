import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import { parseCliArgs, type RunCliArgs } from "./cli/args.ts";
import { runAskAi, type RunDeps } from "./orchestrator.ts";
import type { ChildCommand } from "./sys/process.ts";
import type { GitOutput } from "./sys/git.ts";

function runArgs(argv: string[]): RunCliArgs {
  const parsed = parseCliArgs(argv);
  if (parsed.kind !== "run") throw new Error("expected run args");
  return parsed;
}

function fakeDeps(overrides: Partial<RunDeps> = {}): RunDeps & {
  stdout: string[];
  stderr: string[];
  runs: ChildCommand[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const runs: ChildCommand[] = [];
  return {
    loadConfig: () => Promise.resolve({ agents: {} }),
    gitOutput: () =>
      Promise.resolve({
        stdout: "",
        stderr: "",
        status: 0,
        truncated: false,
        stdoutTruncated: false,
        stderrTruncated: false,
      }),
    readSubjectFile: () => Promise.resolve({ text: "", resolvedPath: "", truncated: false }),
    findRepoRoot: () => Promise.resolve("/repo"),
    loadAgyActualModel: () => Promise.resolve({ actual: undefined }),
    expandHome: (p) => p,
    now: () => new Date("2026-06-04T00:00:00.000Z"),
    randomUUID: () => "uuid-1",
    runChild: (command: ChildCommand) => {
      runs.push(command);
      return Promise.resolve(0);
    },
    writeStdout: (text) => stdout.push(text),
    writeStderr: (text) => stderr.push(text),
    currentCwd: () => "/repo",
    env: () => ({}),
    stdout,
    stderr,
    runs,
    ...overrides,
  };
}

Deno.test("runAskAi dry-run redacts prompt and shows safety flags per agent", async () => {
  const d = fakeDeps();
  const code = await runAskAi(runArgs(["pi", "ask", "hello", "--fresh", "--dry-run"]), d);
  assertEquals(code, 0);
  const summary = JSON.parse(d.stdout.join(""));
  assertEquals(summary.command[0], "pi");
  assertStringIncludes(summary.command.join("\n"), "--tools");
  assertStringIncludes(summary.command.join("\n"), "read,grep,find,ls");
  assertStringIncludes(summary.command.at(-1), "[prompt redacted:");
  assertEquals(JSON.stringify(summary).includes("hello"), false);
  assertEquals(d.runs.length, 0);
});

Deno.test("runAskAi forces --permission-mode plan for claude", async () => {
  const d = fakeDeps();
  await runAskAi(runArgs(["claude", "ask", "q", "--fresh", "--dry-run"]), d);
  const summary = JSON.parse(d.stdout.join(""));
  const idx = summary.command.indexOf("--permission-mode");
  assertEquals(idx > 0, true);
  assertEquals(summary.command[idx + 1], "plan");
});

Deno.test("runAskAi always adds --fork-session when --resume is set (claude)", async () => {
  const d = fakeDeps();
  await runAskAi(runArgs(["claude", "ask", "q", "--resume", "abc", "--dry-run"]), d);
  const summary = JSON.parse(d.stdout.join(""));
  const args = summary.command as string[];
  const resumeIdx = args.indexOf("--resume");
  assertEquals(args[resumeIdx + 1], "abc");
  assertEquals(args.includes("--fork-session"), true);
  // --fork-session must come immediately after --resume <id>, not later.
  assertEquals(args[resumeIdx + 2], "--fork-session");
});

Deno.test("runAskAi pin: pi --resume does NOT add --fork-session (pi has no equivalent)", async () => {
  // I3: pin the absence so a future contributor doesn't "fix" it.
  const d = fakeDeps();
  await runAskAi(runArgs(["pi", "ask", "q", "--resume", "abc", "--dry-run"]), d);
  const summary = JSON.parse(d.stdout.join(""));
  assertEquals(summary.command.includes("--fork-session"), false);
  const sessionIdx = (summary.command as string[]).indexOf("--session");
  assertEquals((summary.command as string[])[sessionIdx + 1], "abc");
});

Deno.test("runAskAi refuses --model for agy and emits it on stderr before throwing", async () => {
  // B3: agy --model used to warn; now it throws. The dry-run JSON
  // summary is not produced (no child CLI is ever invoked), so the
  // test now asserts the throw.
  const d = fakeDeps();
  let threw = false;
  try {
    await runAskAi(runArgs(["agy", "ask", "q", "--model", "foo", "--fresh", "--dry-run"]), d);
  } catch (e) {
    threw = true;
    assertStringIncludes(String(e), "--model is not supported by agy");
  }
  assertEquals(threw, true);
  // No child CLI was invoked and no JSON was printed.
  assertEquals(d.runs.length, 0);
  assertEquals(d.stdout.length, 0);
});

Deno.test("runAskAi agy --model is rejected (throws), not silently warned", async () => {
  // I-B3: previously --model for agy emitted a stderr warning and continued.
  // Per the SKILL.md contract, it must be rejected.
  const d = fakeDeps();
  let threw = false;
  try {
    await runAskAi(runArgs(["agy", "ask", "q", "--model", "foo", "--fresh"]), d);
  } catch (e) {
    threw = true;
    assertStringIncludes(String(e), "--model is not supported by agy");
  }
  assertEquals(threw, true);
});

Deno.test("runAskAi agy --model is also rejected at parse time", async () => {
  // Same rejection must hold at parse time so the child CLI is never spawned.
  const { parseCliArgs } = await import("./cli/args.ts");
  const parsed = parseCliArgs(["agy", "ask", "q", "--model", "foo"]);
  if (parsed.kind !== "run") throw new Error("expected run args");
  // Hand to runAskAi and confirm throw.
  const d = fakeDeps();
  let threw = false;
  try {
    await runAskAi(parsed, d);
  } catch (e) {
    threw = true;
    assertStringIncludes(String(e), "--model is not supported by agy");
  }
  assertEquals(threw, true);
});

Deno.test("runAskAi warns when agy actual model differs from requested (env-set)", async () => {
  // The wrapper rejects --model for agy (B3). The mismatch warning only
  // fires when the model came from env or config, not --model. We use
  // env here to exercise the path.
  const d = fakeDeps({
    loadAgyActualModel: () => Promise.resolve({ actual: "Gemini-2.0" }),
    env: () => ({ ASK_AI_MODEL_AGY: "Gemini-1.5" }),
  });
  await runAskAi(runArgs(["agy", "ask", "q", "--fresh"]), d);
  assertStringIncludes(d.stderr.join(""), 'agy will use model "Gemini-2.0"');
  assertStringIncludes(d.stderr.join(""), 'you requested "Gemini-1.5"');
});

Deno.test("runAskAi review mode throws on real git failure", async () => {
  const d = fakeDeps({
    gitOutput: (): Promise<GitOutput> =>
      Promise.resolve({
        stdout: "",
        stderr: "fatal: not a repo",
        status: 128,
        truncated: false,
        stdoutTruncated: false,
        stderrTruncated: false,
      }),
  });
  let threw = false;
  try {
    await runAskAi(runArgs(["pi", "review", "--base", "main", "--head", "HEAD", "--dry-run"]), d);
  } catch (e) {
    threw = true;
    assertStringIncludes(String(e), "git diff --stat failed");
  }
  assertEquals(threw, true);
});

Deno.test("runAskAi review mode does not throw on truncation kill", async () => {
  const d = fakeDeps({
    gitOutput: (): Promise<GitOutput> =>
      Promise.resolve({
        stdout: "huge stat",
        stderr: "",
        status: 143,
        truncated: true,
        stdoutTruncated: true,
        stderrTruncated: false,
      }),
  });
  const code = await runAskAi(
    runArgs(["pi", "review", "--base", "main", "--head", "HEAD", "--dry-run"]),
    d,
  );
  assertEquals(code, 0);
});

Deno.test("runAskAi refuses positional subject for review mode", async () => {
  const d = fakeDeps();
  let threw = false;
  try {
    await runAskAi(runArgs(["pi", "review", "extra.md", "--dry-run"]), d);
  } catch (e) {
    threw = true;
    assertStringIncludes(String(e), "review mode does not take a positional subject");
  }
  assertEquals(threw, true);
});

Deno.test("runAskAi refuses empty subject for ask mode", async () => {
  const d = fakeDeps();
  let threw = false;
  try {
    await runAskAi(runArgs(["pi", "ask", "--dry-run"]), d);
  } catch (e) {
    threw = true;
    assertStringIncludes(String(e), "requires a question, file path, or description");
  }
  assertEquals(threw, true);
});

Deno.test("runAskAi --dry-run does NOT read the subject file from disk (I2)", async () => {
  // I2: dry-run is a preview; the wrapper must not read secret.txt just to
  // pretend to know what would have been read. The fake here would record
  // the call and assert it never happened.
  let readSubjectCalled = false;
  const d = fakeDeps({
    readSubjectFile: (_subject) => {
      readSubjectCalled = true;
      return Promise.resolve({ text: "secret", resolvedPath: "/etc/passwd", truncated: false });
    },
  });
  await runAskAi(runArgs(["claude", "ask", "secret.txt", "--dry-run"]), d);
  assertEquals(readSubjectCalled, false);
});

Deno.test("runAskAi agy --dry-run still emits the settings.json mismatch warning (I1)", async () => {
  const d = fakeDeps({
    loadAgyActualModel: () => Promise.resolve({ actual: "Gemini-2.0" }),
    env: () => ({ ASK_AI_MODEL_AGY: "Gemini-1.5" }),
  });
  await runAskAi(runArgs(["agy", "ask", "q", "--dry-run"]), d);
  // Previously suppressed because the dry-run early-return was before the
  // warning. Now the warning fires regardless of --dry-run.
  assertStringIncludes(d.stderr.join(""), 'agy will use model "Gemini-2.0"');
});

Deno.test("runAskAi agy warns when preferred model exists but actual model is unknown", async () => {
  const d = fakeDeps({
    loadAgyActualModel: () => Promise.resolve({ actual: undefined }),
    env: () => ({ ASK_AI_MODEL_AGY: "Claude Opus 4.6 (Thinking)" }),
  });
  await runAskAi(runArgs(["agy", "ask", "q", "--dry-run"]), d);
  assertStringIncludes(d.stderr.join(""), "agy will use its configured/default model");
  assertStringIncludes(d.stderr.join(""), 'you requested "Claude Opus 4.6 (Thinking)"');
});

Deno.test("runAskAi agy dry-run summary reports actual model from settings.json (I7)", async () => {
  const d = fakeDeps({
    loadAgyActualModel: () => Promise.resolve({ actual: "Gemini-2.0" }),
    env: () => ({ ASK_AI_MODEL_AGY: "Gemini-1.5" }),
  });
  await runAskAi(runArgs(["agy", "ask", "q", "--dry-run"]), d);
  const summary = JSON.parse(d.stdout.join(""));
  assertEquals(summary.model.preferred, "Gemini-1.5");
  assertEquals(summary.model.actual, "Gemini-2.0");
});

Deno.test("runAskAi default run prints the new session id to stderr (I-Agy-1)", async () => {
  const d = fakeDeps();
  await runAskAi(runArgs(["pi", "ask", "q"]), d);
  // The wrapper generates a UUID and passes it to the child CLI. The agent
  // needs the id to resume later, so it must be printed to stderr.
  const combined = d.stderr.join("");
  assertStringIncludes(combined, "session");
  assertStringIncludes(combined, "uuid-1");
});

Deno.test("runAskAi --fresh default is a brand-new session with a generated UUID (I-Agy-2)", async () => {
  // Previously --fresh was treated as 'no newSessionId', which let the
  // child CLI fall back to its own default. The intent of --fresh is a
  // brand-new thread, so we always generate one.
  const d = fakeDeps();
  await runAskAi(runArgs(["pi", "ask", "q", "--fresh"]), d);
  const ran = d.runs[0];
  const sessionIdx = ran.args.indexOf("--session-id");
  assertEquals(sessionIdx > 0, true);
  assertEquals(ran.args[sessionIdx + 1], "uuid-1");
});

Deno.test("runAskAi refuses subject file path that resolves outside the repo root (I5)", async () => {
  const repo = await Deno.makeTempDir();
  try {
    const { createDefaultDeps } = await import("./orchestrator.ts");
    const d = fakeDeps({
      currentCwd: () => repo,
      findRepoRoot: () => Promise.resolve(repo),
      readSubjectFile: (subject, cwd, repoRoot) =>
        createDefaultDeps().readSubjectFile(subject, cwd, repoRoot),
    });
    let threw = false;
    try {
      await runAskAi(runArgs(["claude", "ask", "/etc/passwd", "--fresh"]), d);
    } catch (e) {
      threw = true;
      assertStringIncludes(String(e), "outside the repo root");
    }
    assertEquals(threw, true);
  } finally {
    await Deno.remove(repo, { recursive: true });
  }
});

Deno.test("runAskAi refuses outside-repo subject file path even when path contains spaces", async () => {
  const temp = await Deno.makeTempDir();
  const outside = join(temp, "file with spaces.txt");
  await Deno.writeTextFile(outside, "secret");
  const repo = await Deno.makeTempDir();
  try {
    const { createDefaultDeps } = await import("./orchestrator.ts");
    const d = fakeDeps({
      currentCwd: () => repo,
      findRepoRoot: () => Promise.resolve(repo),
      readSubjectFile: (subject, cwd, repoRoot) =>
        createDefaultDeps().readSubjectFile(subject, cwd, repoRoot),
    });
    let threw = false;
    try {
      await runAskAi(runArgs(["claude", "ask", outside, "--fresh"]), d);
    } catch (e) {
      threw = true;
      assertStringIncludes(String(e), "outside the repo root");
    }
    assertEquals(threw, true);
  } finally {
    await Deno.remove(temp, { recursive: true });
    await Deno.remove(repo, { recursive: true });
  }
});

Deno.test("runAskAi allows multi-token subject mentioning a path (does not throw)", async () => {
  // Multi-token subjects are questions, not bare paths. The repo-root
  // check only applies to single-token path-like subjects.
  const d = fakeDeps({
    readSubjectFile: (_s, _cwd, _repo) =>
      Promise.resolve({ text: "", resolvedPath: "", truncated: false }),
  });
  const code = await runAskAi(
    runArgs(["claude", "ask", "review docs/spec.md and api/changes.md", "--fresh", "--dry-run"]),
    d,
  );
  assertEquals(code, 0);
});

Deno.test("runAskAi warns to stderr when config.json exists but is malformed (I6)", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const configFile = join(dir, "config.json");
    await Deno.writeTextFile(configFile, "not json");
    const stderr: string[] = [];
    const { createDefaultDeps } = await import("./orchestrator.ts");
    const d = createDefaultDeps((t) => stderr.push(t));
    await d.loadConfig(configFile);
    const all = stderr.join("");
    assertStringIncludes(all, "could not be read");
    assertStringIncludes(all, configFile);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
