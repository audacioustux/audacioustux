// Claude agent for ask-ai.
//
// Invokes the `claude` CLI as an independent reviewer with relevance-scoped
// session reuse based on ~/.claude/projects/<encoded-cwd>/*.jsonl files.
//
// Model selection: the skill passes --model to the CLI, which respects it
// directly. Resolution order: CLI flag > ASK_AI_MODEL_CLAUDE env >
// config.json > null (use claude's own default).

import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveModel as sharedResolveModel, scoreSession } from '../shared.mjs';

export const id = 'claude';
export const displayName = 'Claude';
export const cliBin = 'claude';

// ---- paths -----------------------------------------------------------------

export function sessionOpts({ repoRoot, home = os.homedir() } = {}) {
  const encoded = path.resolve(repoRoot).replace(/[\\/]+/g, '-');
  return { sessionsDir: path.join(home, '.claude', 'projects', encoded) };
}

// ---- model -----------------------------------------------------------------

export async function resolveModel({ cliModel, env, config } = {}) {
  const { model: preferred, source } = sharedResolveModel({ agentId: id, cliModel, env, config });
  return { preferred, actual: preferred, source, modelKnown: null };
}

export function promptIdentity({ preferred, actual }) {
  const name = preferred ?? actual;
  return name
    ? `You are ${name} acting as an independent second brain.`
    : 'You are Claude acting as an independent second brain.';
}

export function sessionName({ mode, stamp }) {
  return `ask-ai-claude-${mode}-${stamp}`;
}

// ---- session discovery -----------------------------------------------------

function contentText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((p) => {
      if (!p || typeof p !== 'object') return '';
      if (p.type === 'tool_result') return '';
      if (typeof p.text === 'string') return p.text;
      if (p.type === 'tool_use' && p.input) return JSON.stringify(p.input).slice(0, 2_000);
      return '';
    }).join('\n');
  }
  return '';
}

async function summarizeSession(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  let id = path.basename(filePath, '.jsonl');
  let lastTimestamp = null;
  let text = '';
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.sessionId) id = entry.sessionId;
    if (entry.timestamp) {
      const ts = new Date(entry.timestamp);
      if (!Number.isNaN(ts.valueOf()) && (!lastTimestamp || ts > lastTimestamp)) {
        lastTimestamp = ts;
      }
    }
    if (entry.summary) text += `\n${entry.summary}`;
    if (entry.gitBranch) text += `\n${entry.gitBranch}`;
    if (entry.message) text += `\n${entry.message.role ?? ''}\n${contentText(entry.message.content)}`;
    if (text.length > 250_000) text = text.slice(-250_000);
  }
  const fileStats = await stat(filePath);
  return { id, lastTimestamp: lastTimestamp ?? fileStats.mtime, text };
}

export async function rankSessions({ sessionsDir, query, now = new Date() } = {}) {
  if (!sessionsDir || !existsSync(sessionsDir)) return [];
  const entries = await readdir(sessionsDir);
  const files = entries.filter((e) => e.endsWith('.jsonl')).map((e) => path.join(sessionsDir, e));
  const sessions = await Promise.all(files.map(async (filePath) => {
    const s = await summarizeSession(filePath);
    return { ...s, ...scoreSession(s, query, now) };
  }));
  return sessions.sort((a, b) => b.score - a.score || b.lastTimestamp - a.lastTimestamp);
}

// ---- CLI args --------------------------------------------------------------

export function buildArgs({
  prompt,
  sessionId,
  model,
  name,
  newSessionId = null,
  permissionMode = 'plan',
  forkSession = true,
} = {}) {
  const args = ['-p'];
  if (model) args.push('--model', model);
  args.push('--permission-mode', permissionMode);
  if (name) args.push('--name', name);
  if (sessionId) {
    args.push('--resume', sessionId);
    if (forkSession) args.push('--fork-session');
  } else if (newSessionId) {
    args.push('--session-id', newSessionId);
  }
  args.push(prompt);
  return args;
}
