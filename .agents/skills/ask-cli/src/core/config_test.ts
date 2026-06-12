import { assertEquals } from "jsr:@std/assert@1";
import { defaultConfigFile } from "./config.ts";

Deno.test("defaultConfigFile resolves to the skill root for src/main.ts", () => {
  assertEquals(
    defaultConfigFile(new URL("file:///tmp/skill/ask-cli/src/main.ts")),
    "/tmp/skill/ask-cli/config.json",
  );
});
