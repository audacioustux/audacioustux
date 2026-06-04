import { assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import { selectSession } from "../core/scoring.ts";
import {
  buildCommand,
  loadActualModel,
  promptIdentity,
  rankSessions,
  resolveModel,
  sessionName,
  sessionOpts,
} from "./agy.ts";

Deno.test("agy sessionOpts returns settings and metadata paths", () => {
  const opts = sessionOpts({ repoRoot: "/repo", home: "/tmp/home" });
  assertEquals(opts.settingsFile, "/tmp/home/.gemini/antigravity-cli/settings.json");
  assertEquals(opts.historyFile, "/tmp/home/.gemini/antigravity-cli/history.jsonl");
  assertEquals(opts.projectsFile, "/tmp/home/.gemini/antigravity-cli/cache/projects.json");
  assertEquals(opts.repoRoot, "/repo");
});

Deno.test("loadActualModel reads agy settings model", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const file = join(dir, "settings.json");
    await Deno.writeTextFile(file, JSON.stringify({ model: "Gemini 3.1 Pro (High)" }));
    assertEquals(await loadActualModel(file), "Gemini 3.1 Pro (High)");
    assertEquals(await loadActualModel(join(dir, "missing.json")), undefined);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("agy resolveModel keeps preferred as hint and actual from settings", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const settingsFile = join(dir, "settings.json");
    await Deno.writeTextFile(settingsFile, JSON.stringify({ model: "Gemini 3.1 Pro (High)" }));
    assertEquals(
      await resolveModel({ cliModel: "preferred", settingsFile, env: {}, config: { agents: {} } }),
      {
        preferred: "preferred",
        actual: "Gemini 3.1 Pro (High)",
        source: "cli",
        modelKnown: undefined,
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("agy promptIdentity/sessionName are stable", () => {
  assertEquals(
    promptIdentity({ preferred: "hint", actual: "Gemini 3.1 Pro (High)", source: "cli" }),
    "You are Gemini 3.1 Pro (High) acting as an independent second brain.",
  );
  assertEquals(sessionName({ mode: "plan", stamp: "stamp" }), "ask-ai-agy-plan-stamp");
});

Deno.test("agy buildCommand never includes model and uses conversation reuse", () => {
  assertEquals(
    buildCommand({ prompt: "hello", sessionId: "conv-a", model: "ignored", cwd: "/repo" }),
    { bin: "agy", cwd: "/repo", args: ["-p", "--conversation", "conv-a", "hello"] },
  );
});

Deno.test("agy rankSessions trusts only project-scoped metadata", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const historyFile = join(dir, "history.jsonl");
    const projectsFile = join(dir, "projects.json");
    await Deno.writeTextFile(historyFile, await Deno.readTextFile("fixtures/agy-history.jsonl"));
    await Deno.writeTextFile(projectsFile, await Deno.readTextFile("fixtures/agy-projects.json"));

    const result = await rankSessions({
      historyFile,
      projectsFile,
      repoRoot: "/repo",
      query: "router websocket auth handoff",
      now: new Date(1780000000000),
    });
    assertEquals(result.ok, true);
    if (!result.ok) throw new Error("expected ok");
    assertEquals(result.candidates[0].id, "conv-a");
    assertEquals(result.candidates[0].trusted, true);
    assertEquals(result.candidates.find((candidate) => candidate.id === "conv-b")?.trusted, false);
    assertEquals(selectSession(result.candidates)?.id, "conv-a");

    const unscoped = await rankSessions({
      historyFile,
      projectsFile,
      repoRoot: "/other",
      query: "router websocket auth handoff",
      now: new Date(1780000000000),
    });
    if (!unscoped.ok) throw new Error("expected ok");
    assertEquals(unscoped.candidates.every((candidate) => candidate.trusted === false), true);
    assertEquals(selectSession(unscoped.candidates), undefined);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
