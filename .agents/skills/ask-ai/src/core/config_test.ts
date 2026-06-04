import { assertEquals } from "jsr:@std/assert@1";
import { join } from "jsr:@std/path@1";
import { defaultConfigFile, loadConfig } from "./config.ts";

Deno.test("defaultConfigFile resolves to the skill root for src/main.ts", () => {
  assertEquals(
    defaultConfigFile(new URL("file:///tmp/skill/ask-ai/src/main.ts")),
    "/tmp/skill/ask-ai/config.json",
  );
});

Deno.test("loadConfig returns empty agents for missing or malformed config", async () => {
  assertEquals(await loadConfig("/definitely/missing/config.json"), { agents: {} });

  const dir = await Deno.makeTempDir();
  try {
    const malformed = join(dir, "bad.json");
    await Deno.writeTextFile(malformed, "{bad");
    assertEquals(await loadConfig(malformed), { agents: {} });
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("loadConfig trims valid per-agent model blocks", async () => {
  const dir = await Deno.makeTempDir();
  try {
    const configFile = join(dir, "config.json");
    await Deno.writeTextFile(
      configFile,
      JSON.stringify({
        agents: {
          claude: { model: " opus " },
          agy: { model: "" },
          pi: "bad",
        },
      }),
    );
    assertEquals(await loadConfig(configFile), { agents: { claude: { model: "opus" } } });
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
