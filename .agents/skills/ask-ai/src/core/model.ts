export type ModelSource = "cli" | "env" | "config" | "default";

export type ModelConfig = {
  agents?: Record<string, { model?: string } | undefined>;
};

export function envVarFor(agentId: string): string {
  return `ASK_AI_MODEL_${agentId.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolvePreferredModel(
  { agentId, cliModel, env = Deno.env.toObject(), config = { agents: {} } }: {
    agentId: string;
    cliModel?: string;
    env?: Record<string, string | undefined>;
    config?: ModelConfig;
  },
): { preferred?: string; source: ModelSource } {
  const fromCli = nonBlank(cliModel);
  if (fromCli) return { preferred: fromCli, source: "cli" };

  const fromEnv = nonBlank(env[envVarFor(agentId)]);
  if (fromEnv) return { preferred: fromEnv, source: "env" };

  const fromConfig = nonBlank(config.agents?.[agentId]?.model);
  if (fromConfig) return { preferred: fromConfig, source: "config" };

  return { preferred: undefined, source: "default" };
}
