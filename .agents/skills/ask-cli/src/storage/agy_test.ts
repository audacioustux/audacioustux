import { assertEquals } from "jsr:@std/assert@1";
import { join, resolve } from "jsr:@std/path@1";
import { loadHistoryByConversation, loadProjectMap } from "./agy.ts";

Deno.test("loadHistoryByConversation keeps latest display per conversation", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const file = join(dir, "history.jsonl");
    await Deno.writeTextFile(
      file,
      '{"conversationId":"conv-a","display":"old","timestamp":1}\n{"conversationId":"conv-a","display":"new router websocket","timestamp":2}\nnot json\n',
    );
    const result = await loadHistoryByConversation(file);
    assertEquals(result.warnings.length, 1);
    assertEquals(result.history.get("conv-a"), { display: "new router websocket", timestamp: 2 });
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("loadProjectMap reads workspace to conversation mapping", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const file = join(dir, "projects.json");
    await Deno.writeTextFile(file, JSON.stringify({ "/repo": "conv-a", bad: 1 }));
    const result = await loadProjectMap(file);
    assertEquals(result.warnings, []);
    assertEquals(result.projects.get(resolve("/repo")), "conv-a");
    assertEquals(result.projects.has("bad"), false);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
