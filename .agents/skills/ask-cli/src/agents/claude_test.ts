import { assertEquals, assertGreater } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import {
  buildCommand,
  promptIdentity,
  rankSessions,
  resolveModel,
  sessionName,
  sessionOpts,
} from "./claude.ts";

Deno.test("claude sessionOpts maps repoRoot to sessionsDir", () => {
  const opts = sessionOpts({ repoRoot: "/workspaces/TheGrid", home: "/tmp/home" });
  assertEquals(opts.sessionsDir, "/tmp/home/.claude/projects/-workspaces-TheGrid");
});

Deno.test("claude resolveModel returns actual equal to preferred", async () => {
  assertEquals(
    await resolveModel({
      cliModel: "opus",
      env: { ASK_AI_MODEL_CLAUDE: "sonnet" },
      config: { agents: { claude: { model: "config" } } },
    }),
    { preferred: "opus", actual: "opus", source: "cli", modelKnown: undefined },
  );
});

Deno.test("claude promptIdentity and sessionName are stable", () => {
  assertEquals(
    promptIdentity({ preferred: "opus", actual: "opus", source: "cli" }),
    "You are opus acting as an independent second brain.",
  );
  assertEquals(
    promptIdentity({ preferred: undefined, actual: undefined, source: "default" }),
    "You are Claude acting as an independent second brain.",
  );
  assertEquals(sessionName({ mode: "review", stamp: "stamp" }), "ask-cli-claude-review-stamp");
});

Deno.test("claude buildCommand handles model, resume, fork, new session, name", () => {
  assertEquals(
    buildCommand({
      prompt: "hello",
      sessionId: "existing",
      model: "opus",
      name: "ask-cli-claude",
      cwd: "/repo",
      forkSession: true,
    }),
    {
      bin: "claude",
      cwd: "/repo",
      args: [
        "-p",
        "--model",
        "opus",
        "--permission-mode",
        "plan",
        "--name",
        "ask-cli-claude",
        "--resume",
        "existing",
        "--fork-session",
        "hello",
      ],
    },
  );

  assertEquals(
    buildCommand({ prompt: "hello", newSessionId: "new", cwd: "/repo" }).args,
    ["-p", "--permission-mode", "plan", "--session-id", "new", "hello"],
  );
});

Deno.test("claude rankSessions scores relevant JSONL sessions", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const fixture = await Deno.readTextFile("fixtures/claude-session.jsonl");
    await Deno.writeTextFile(join(dir, "a.jsonl"), fixture);
    await Deno.writeTextFile(
      join(dir, "b.jsonl"),
      '{"sessionId":"other","timestamp":"2026-06-04T00:00:00.000Z","message":{"role":"user","content":"css colors"}}\n',
    );
    const result = await rankSessions({
      sessionsDir: dir,
      query: "router websocket auth token handoff",
      now: new Date("2026-06-04T00:00:00.000Z"),
    });
    assertEquals(result.ok, true);
    if (!result.ok) throw new Error("expected ok");
    assertEquals(result.candidates.length, 2);
    assertEquals(result.candidates[0].id, "claude-session-a");
    assertGreater(result.candidates[0].score, result.candidates[1].score);
    assertEquals(result.candidates[0].lastTimestamp.toISOString(), "2026-06-03T00:00:02.000Z");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
