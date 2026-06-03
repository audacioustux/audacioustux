// Agy (Antigravity) agent for ask-ai.
//
// Invokes the `agy` CLI as a multi-model reviewer (Gemini / Claude / GPT-OSS).
// Agy has no --model flag: the model is set via
//   ~/.gemini/antigravity-cli/settings.json  →  { "model": "Gemini 3.1 Pro (High)" }
//
// Model resolution:
//   - `preferred` comes from CLI flag / ASK_AI_MODEL_AGY env / config.json.
//     It is a HINT only — agy's actual model is determined by settings.json.
//   - `actual` is read from settings.json.  If `preferred` ≠ `actual`, the
//     orchestrator prints a one-line stderr warning.
//   - `modelKnown` is true/false if the configured model is in the soft-list.
//
// Session discovery:
//   ~/.gemini/antigravity-cli/conversations/*.{db,pb}  (SQLite + protobuf)
//   scoped to the current repo via  cache/projects.json
//   scored by  history.jsonl  `display` field + best-effort UTF-8 from BLOBs.

import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { emitWarning } from 'node:process';
import { resolveModel as sharedResolveModel, scoreSession } from '../shared.mjs';

// ---- constants -------------------------------------------------------------

export const id = 'agy';
export const displayName = 'Antigravity (agy)';
export const cliBin = 'agy';

// Soft-list — used only for a one-line stderr hint, never a hard gate.
const KNOWN_MODELS = new Set([
  'Gemini 3.5 Flash (Medium)',
  'Gemini 3.5 Flash (High)',
  'Gemini 3.5 Flash (Low)',
  'Gemini 3.1 Pro (Low)',
  'Gemini 3.1 Pro (High)',
  'Claude Sonnet 4.6 (Thinking)',
  'Claude Opus 4.6 (Thinking)',
  'GPT-OSS 120B (Medium)',
]);

// Suppress the noisy node:sqlite ExperimentalWarning at import time.
const _origEmit = emitWarning;
process.emitWarning = function suppressSqliteWarning(warning, ...rest) {
  if (warning === 'SQLite is an experimental feature and might change at any time') return;
  const objMsg = typeof warning === 'string' ? '' : warning?.message ?? '';
  if (objMsg.startsWith('SQLite is an experimental feature')) return;
  return _origEmit.call(this, warning, ...rest);
};

// ---- paths -----------------------------------------------------------------

export function defaultSettingsFile(home = os.homedir()) {
  return path.join(home, '.gemini', 'antigravity-cli', 'settings.json');
}

function defaultConversationsDir(home = os.homedir()) {
  return path.join(home, '.gemini', 'antigravity-cli', 'conversations');
}

function defaultHistoryFile(home = os.homedir()) {
  return path.join(home, '.gemini', 'antigravity-cli', 'history.jsonl');
}

function defaultProjectsFile(home = os.homedir()) {
  return path.join(home, '.gemini', 'antigravity-cli', 'cache', 'projects.json');
}

export function sessionOpts({ repoRoot, home = os.homedir() } = {}) {
  return {
    conversationsDir: defaultConversationsDir(home),
    historyFile:      defaultHistoryFile(home),
    projectsFile:     defaultProjectsFile(home),
    settingsFile:     defaultSettingsFile(home),
    repoRoot:         path.resolve(repoRoot),
  };
}

// ---- model -----------------------------------------------------------------

export async function loadActualModel(settingsFile) {
  if (!settingsFile || !existsSync(settingsFile)) return null;
  try {
    const parsed = JSON.parse(await readFile(settingsFile, 'utf8'));
    if (parsed && typeof parsed === 'object' && typeof parsed.model === 'string' && parsed.model.trim()) {
      return parsed.model.trim();
    }
  } catch { /* corrupt file → no model */ }
  return null;
}

export async function resolveModel({ cliModel, env, config, settingsFile } = {}) {
  const { model: preferred, source } = sharedResolveModel({ agentId: id, cliModel, env, config });
  const actual = await loadActualModel(settingsFile);
  const modelKnown = actual != null ? KNOWN_MODELS.has(actual) : null;
  return { preferred, actual, source, modelKnown };
}

export function promptIdentity({ preferred, actual }) {
  // Use the ACTUAL model — that's what agy is really running as.
  const name = actual ?? preferred;
  return name
    ? `You are ${name} acting as an independent second brain.`
    : 'You are Antigravity (agy) acting as an independent second brain.';
}

export function sessionName({ mode, stamp }) {
  return `ask-ai-agy-${mode}-${stamp}`;
}

// ---- session discovery -----------------------------------------------------

const PRINTABLE_RUN = /[\x20-\x7e]{8,}/g;

function extractPrintableRuns(buf) {
  if (!buf) return '';
  return (Buffer.isBuffer(buf) ? buf : Buffer.from(buf)).toString('binary').match(PRINTABLE_RUN)?.join('\n') ?? '';
}

async function summarizeSqliteDb(filePath, maxBytes = 250_000) {
  let DatabaseSync;
  try { ({ DatabaseSync } = await import('node:sqlite')); } catch { return ''; }
  let db;
  try { db = new DatabaseSync(filePath, { readOnly: true }); } catch { return ''; }
  let text = '';
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    for (const t of tables) {
      const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
      const blobs = cols.filter((c) => String(c.type).toLowerCase() === 'blob').map((c) => c.name);
      if (!blobs.length) continue;
      const colList = blobs.map((c) => `"${c}"`).join(', ');
      const rows = db.prepare(`SELECT ${colList} FROM ${t.name}`).all();
      for (const row of rows) for (const col of blobs) text += '\n' + extractPrintableRuns(row[col]);
      if (text.length > maxBytes) text = text.slice(0, maxBytes);
    }
  } catch { return text; }
  finally { try { db.close(); } catch {} }
  return text;
}

async function summarizePbFile(filePath, maxBytes = 250_000) {
  try { return extractPrintableRuns(await readFile(filePath)).slice(0, maxBytes); } catch { return ''; }
}

async function readJsonl(filePath) {
  if (!existsSync(filePath)) return [];
  const raw = await readFile(filePath, 'utf8');
  const out = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { out.push(JSON.parse(trimmed)); } catch {}
  }
  return out;
}

async function loadProjectMap(projectsFile) {
  if (!existsSync(projectsFile)) return new Map();
  try {
    const parsed = JSON.parse(await readFile(projectsFile, 'utf8'));
    const map = new Map();
    if (parsed && typeof parsed === 'object') {
      for (const [ws, pid] of Object.entries(parsed)) {
        if (typeof ws === 'string' && typeof pid === 'string') map.set(ws, pid);
      }
    }
    return map;
  } catch { return new Map(); }
}

async function loadHistoryByConversation(historyFile) {
  const entries = await readJsonl(historyFile);
  const byConv = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !entry.conversationId) continue;
    const prev = byConv.get(entry.conversationId);
    const ts = Number.isFinite(entry.timestamp) ? entry.timestamp : 0;
    if (!prev || ts >= (prev.timestamp ?? 0)) {
      byConv.set(entry.conversationId, {
        display: String(entry.display ?? ''),
        timestamp: ts,
      });
    }
  }
  return byConv;
}

export async function rankSessions({ conversationsDir, historyFile, projectsFile, repoRoot, query, now = new Date() } = {}) {
  if (!conversationsDir || !existsSync(conversationsDir)) return [];
  const [projectMap, historyByConv] = await Promise.all([
    loadProjectMap(projectsFile),
    loadHistoryByConversation(historyFile),
  ]);
  const projectId = projectMap.get(path.resolve(repoRoot));
  const entries = await readdir(conversationsDir);
  const files = entries.filter((e) => /\.(db|pb)$/i.test(e)).map((e) => path.join(conversationsDir, e));
  const sessions = await Promise.all(files.map(async (filePath) => {
    const fileStats = await stat(filePath);
    const conversationId = path.basename(filePath).replace(/\.(db|pb)$/i, '');
    const hist = historyByConv.get(conversationId);
    const ext = path.extname(filePath).toLowerCase();
    const blobText = ext === '.db' ? await summarizeSqliteDb(filePath) : await summarizePbFile(filePath);
    const text = [hist?.display ?? '', blobText].filter(Boolean).join('\n').slice(0, 250_000);
    return {
      id: conversationId,
      lastTimestamp: hist?.timestamp ? new Date(hist.timestamp) : fileStats.mtime,
      text,
      projectId: conversationId,          // legacy layout: file-name == cascade id
    };
  }));
  const filtered = projectId ? sessions.filter((s) => s.projectId === projectId) : sessions;
  return filtered
    .map((s) => ({ ...s, ...scoreSession(s, query, now) }))
    .sort((a, b) => b.score - a.score || b.lastTimestamp - a.lastTimestamp);
}

// ---- CLI args --------------------------------------------------------------

export function buildArgs({ prompt, sessionId, sandbox = false, printTimeout = null } = {}) {
  const args = ['-p'];
  if (sessionId) args.push('--conversation', sessionId);
  if (sandbox) args.push('--sandbox');
  if (printTimeout) args.push('--print-timeout', printTimeout);
  args.push(prompt);
  return args;
}
