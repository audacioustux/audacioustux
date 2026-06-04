import { assertEquals, assertGreater } from "@std/assert";
import { join } from "@std/path";
import {
  buildCommand,
  loadSettings,
  promptIdentity,
  rankSessions,
  resolveModel,
  sessionName,
  sessionOpts,
} from "./pi.ts";

Deno.test("pi sessionOpts returns project sessions and settings paths", () => {
  const opts = sessionOpts({ repoRoot: "/workspaces/TheGrid", home: "/tmp/home" });
  assertEquals(opts.sessionsDir, "/tmp/home/.pi/agent/sessions/--workspaces-TheGrid--");
  assertEquals(opts.settingsFile, "/tmp/home/.pi/agent/settings.json");

  const colon = sessionOpts({ repoRoot: "/tmp/a:b", home: "/tmp/home" });
  assertEquals(colon.sessionsDir, "/tmp/home/.pi/agent/sessions/--tmp-a-b--");
});

Deno.test("loadSettings reads Pi model defaults", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const file = join(dir, "settings.json");
    await Deno.writeTextFile(
      file,
      JSON.stringify({
        defaultProvider: "openai-codex",
        defaultModel: "gpt-5.5",
        defaultThinkingLevel: "xhigh",
        enabledModels: ["openai-codex/gpt-5.5"],
      }),
    );
    assertEquals(await loadSettings(file), {
      defaultProvider: "openai-codex",
      defaultModel: "gpt-5.5",
      defaultThinkingLevel: "xhigh",
      enabledModels: ["openai-codex/gpt-5.5"],
    });
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("pi resolveModel reports settings default and real CLI override", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const settingsFile = join(dir, "settings.json");
    await Deno.writeTextFile(
      settingsFile,
      JSON.stringify({
        defaultProvider: "openai-codex",
        defaultModel: "gpt-5.5",
        defaultThinkingLevel: "xhigh",
        enabledModels: ["openai-codex/gpt-5.5", "zai/glm-5.1"],
      }),
    );
    assertEquals(await resolveModel({ settingsFile, env: {}, config: { agents: {} } }), {
      preferred: undefined,
      actual: "openai-codex/gpt-5.5:xhigh",
      source: "default",
      modelKnown: true,
    });
    assertEquals(
      await resolveModel({
        cliModel: "zai/glm-5.1:xhigh",
        settingsFile,
        env: {},
        config: { agents: {} },
      }),
      {
        preferred: "zai/glm-5.1:xhigh",
        actual: "zai/glm-5.1:xhigh",
        source: "cli",
        modelKnown: true,
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("pi promptIdentity and sessionName are stable", () => {
  assertEquals(
    promptIdentity({
      preferred: undefined,
      actual: "openai-codex/gpt-5.5:xhigh",
      source: "default",
    }),
    "You are openai-codex/gpt-5.5:xhigh acting as an independent second brain.",
  );
  assertEquals(sessionName({ mode: "ask", stamp: "stamp" }), "ask-ai-pi-ask-stamp");
});

Deno.test("pi buildCommand uses read-only tool allowlist and session flags", () => {
  assertEquals(
    buildCommand({
      prompt: "hello",
      model: "zai/glm-5.1:xhigh",
      name: "ask-ai-pi",
      newSessionId: "new-id",
      cwd: "/repo",
    }),
    {
      bin: "pi",
      cwd: "/repo",
      args: [
        "-p",
        "--tools",
        "read,grep,find,ls",
        "--model",
        "zai/glm-5.1:xhigh",
        "--name",
        "ask-ai-pi",
        "--session-id",
        "new-id",
        "hello",
      ],
    },
  );
  assertEquals(
    buildCommand({ prompt: "hello", sessionId: "existing", cwd: "/repo" }).args,
    ["-p", "--tools", "read,grep,find,ls", "--session", "existing", "hello"],
  );
});

Deno.test("pi rankSessions scores relevant content and ignores toolResult text", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const fixture = await Deno.readTextFile("fixtures/pi-session.jsonl");
    await Deno.writeTextFile(join(dir, "a.jsonl"), fixture);
    await Deno.writeTextFile(
      join(dir, "tool-result-only.jsonl"),
      '{"type":"session","id":"tool-only","timestamp":"2026-06-04T00:00:00.000Z"}\n{"type":"message","timestamp":"2026-06-04T00:00:01.000Z","message":{"role":"toolResult","content":[{"type":"text","text":"secret output auth token websocket"}]}}\n',
    );
    const result = await rankSessions({
      sessionsDir: dir,
      query: "router websocket auth token handoff",
      now: new Date("2026-06-04T00:00:00.000Z"),
    });
    assertEquals(result.ok, true);
    if (!result.ok) throw new Error("expected ok");
    assertEquals(result.candidates[0].id, "pi-session-a");
    assertGreater(result.candidates[0].score, result.candidates[1].score);
    assertEquals(result.candidates.find((c) => c.id === "tool-only")?.score, 0);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
