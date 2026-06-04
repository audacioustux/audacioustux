import { assertEquals } from "jsr:@std/assert@1";
import { envVarFor, resolvePreferredModel } from "./model.ts";

Deno.test("envVarFor normalizes agent id", () => {
  assertEquals(envVarFor("claude"), "ASK_AI_MODEL_CLAUDE");
  assertEquals(envVarFor("my-agent.1"), "ASK_AI_MODEL_MY_AGENT_1");
});

Deno.test("resolvePreferredModel precedence is cli env config default", () => {
  const config = { agents: { pi: { model: "config" } } };
  assertEquals(
    resolvePreferredModel({
      agentId: "pi",
      cliModel: "cli",
      env: { ASK_AI_MODEL_PI: "env" },
      config,
    }),
    { preferred: "cli", source: "cli" },
  );
  assertEquals(
    resolvePreferredModel({ agentId: "pi", env: { ASK_AI_MODEL_PI: "env" }, config }),
    { preferred: "env", source: "env" },
  );
  assertEquals(
    resolvePreferredModel({ agentId: "pi", env: {}, config }),
    { preferred: "config", source: "config" },
  );
  assertEquals(
    resolvePreferredModel({ agentId: "pi", env: {}, config: { agents: {} } }),
    { preferred: undefined, source: "default" },
  );
});

Deno.test("resolvePreferredModel treats whitespace-only values as absent", () => {
  assertEquals(
    resolvePreferredModel({
      agentId: "claude",
      cliModel: "  ",
      env: { ASK_AI_MODEL_CLAUDE: "  " },
      config: { agents: { claude: { model: "  " } } },
    }),
    { preferred: undefined, source: "default" },
  );
});
