import type { AgentId, Mode } from "./cli/args.ts";
import type { ModelSource } from "./core/model.ts";
import type { SessionCandidate } from "./core/scoring.ts";
import type { ChildCommand } from "./sys/process.ts";

export type AskAiConfig = {
  agents: Record<string, { model: string }>;
};

export type ModelInfo = {
  preferred?: string;
  actual?: string;
  source: ModelSource;
  modelKnown?: boolean;
};

export type SessionOptsInput = {
  repoRoot: string;
  home?: string;
};

export type SessionOpts = Record<string, unknown> & {
  repoRoot?: string;
  sessionsDir?: string;
  settingsFile?: string;
};

export type ResolveModelInput = {
  cliModel?: string;
  env?: Record<string, string | undefined>;
  config?: AskAiConfig;
  settingsFile?: string;
};

export type RankSessionsInput = SessionOpts & {
  query: string;
  now?: Date;
};

export type SessionWarning = {
  source: string;
  message: string;
};

export type RankSessionsResult =
  | { ok: true; candidates: SessionCandidate[]; warnings: SessionWarning[] }
  | { ok: false; candidates: []; warnings: SessionWarning[] };

export type BuildCommandInput = {
  prompt: string;
  sessionId?: string;
  model?: string;
  name?: string;
  newSessionId?: string;
  cwd: string;
  permissionMode?: string;
  forkSession?: boolean;
  sandbox?: boolean;
  noSandbox?: boolean;
};

export interface Agent {
  id: AgentId;
  displayName: string;
  cliBin: string;
  sessionOpts(input: SessionOptsInput): SessionOpts;
  resolveModel(input: ResolveModelInput): Promise<ModelInfo>;
  promptIdentity(input: ModelInfo): string;
  sessionName(input: { mode: Mode; stamp: string }): string;
  rankSessions(input: RankSessionsInput): Promise<RankSessionsResult>;
  buildCommand(input: BuildCommandInput): ChildCommand;
}
