// Shared core for ask-ai.
//
// Provides the things every ask-ai agent needs:
//   - config file loading
//   - model resolution (CLI > env > config > default) with per-agent env vars
//   - repo + git + file helpers
//   - session relevance scoring (tokenize, score, select, serialize)
//   - prompt template + diff/search query helpers
//   - CLI parsing primitives
//
// ---------------------------------------------------------------------------
// Agent contract
// ---------------------------------------------------------------------------
// Each module under ./agents/ must export:
//
//   id              string    stable id used in CLI (e.g. 'claude', 'agy')
//   displayName     string    human-readable label for dry-run output
//   cliBin          string    binary name spawned on the PATH
//   sessionOpts({ repoRoot, home }) -> object
//                             paths/inputs the agent needs (e.g. sessionsDir)
//   rankSessions(opts) -> Promise<Candidate[]>
//                             candidates sorted by relevance. Each Candidate:
//                             { id, lastTimestamp, text, score, matchedTerms }
//                             The agent maps its own storage id (e.g. claude's
//                             sessionId, agy's conversationId) to `id` once
//                             inside rankSessions; nothing else needs to know.
//   buildArgs(args) -> string[]
//                             full argv (excluding cliBin). Agent decides
//                             whether/where to surface `model`. Receives:
//                             { prompt, sessionId, model, name, newSessionId,
//                               ...agentSpecific } where `sessionId` is the
//                             generic candidate `id`.
//   resolveModel({ cliModel, env, config }) -> Promise<ModelInfo>
//                             ModelInfo = { preferred, actual, source, modelKnown? }
//                             - `preferred` is what the user asked for (CLI/env/config/null).
//                             - `actual` is what the CLI will really run (defaults to `preferred`).
//                             - `source` is where `preferred` came from: 'cli'|'env'|'config'|'default'|'settings'.
//                             - `modelKnown` is optional (used for soft warnings).
//   promptIdentity({ preferred, actual }) -> string
//                             the "You are X acting as..." line. Agents pick
//                             whether to name `preferred`, `actual`, both, or
//                             neither.
//   sessionName({ mode, stamp }) -> string
//                             display name for newly-created sessions
// ---------------------------------------------------------------------------

import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- Constants --------------------------------------------------------------

export const DEFAULT_THRESHOLD = 12;
export const DEFAULT_MIN_MATCHED_TERMS = 2;

export const MODES = ['ask', 'plan', 'adversarial', 'review', 'sessions'];

// Common words that pollute session-matching if treated as search terms
// (mode names like 'plan'/'review' are filtered so a plan-review session
// doesn't beat a relevant debug session just because the words overlap).
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'all', 'and', 'are', 'ask', 'but', 'can',
  'code', 'does', 'for', 'from', 'have', 'how', 'into', 'not', 'our',
  'plan', 'please', 'review', 'the', 'this', 'use', 'using', 'what', 'when',
  'with', 'you', 'your',
]);

const REVIEW_RULES = [
  'Use any resumed session/conversation history only as optional background; ignore it if it is unrelated.',
  'Do not edit files. Do not implement fixes. Do not run destructive commands.',
  'Be direct, skeptical, and specific. Prefer concrete risks and actionable changes over generic advice.',
].join('\n');

// ---- Config -----------------------------------------------------------------

// IMPORTANT: callers MUST pass the entry-point's `import.meta.url` (typically
// the ask-ai.mjs orchestrator). If omitted we fall back to this module's own
// URL, which would resolve to `<skill>/shared/config.json` instead of the
// intended `<skill>/config.json`.
export function defaultConfigFile(skillUrl = import.meta.url) {
  return path.resolve(path.dirname(fileURLToPath(skillUrl)), 'config.json');
}

export async function loadConfig(configFile) {
  if (!configFile || !existsSync(configFile)) return { agents: {} };
  try {
    const raw = await readFile(configFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { agents: {} };
    const agents = {};
    if (parsed.agents && typeof parsed.agents === 'object' && !Array.isArray(parsed.agents)) {
      for (const [name, value] of Object.entries(parsed.agents)) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
        const block = {};
        if (typeof value.model === 'string' && value.model.trim()) {
          block.model = value.model.trim();
        }
        if (Object.keys(block).length) agents[name] = block;
      }
    }
    return { agents };
  } catch {
    return { agents: {} };
  }
}

// ---- Model resolution -------------------------------------------------------

// Maps an agent id like "claude" or "agy" to an env var like ASK_AI_MODEL_CLAUDE.
function envVarFor(agentId) {
  return `ASK_AI_MODEL_${String(agentId).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

// Generic model resolver used by simple agents (e.g. claude) that pass the
// model straight through to the CLI. Returns { model, source } where source is
// one of 'cli' | 'env' | 'config' | 'default'.
export function resolveModel({ agentId, cliModel, env = process.env, config = {} } = {}) {
  if (typeof cliModel === 'string' && cliModel.trim()) return { model: cliModel.trim(), source: 'cli' };
  const fromEnv = env?.[envVarFor(agentId)];
  if (typeof fromEnv === 'string' && fromEnv.trim()) return { model: fromEnv.trim(), source: 'env' };
  const fromConfig = config?.agents?.[agentId]?.model;
  if (typeof fromConfig === 'string' && fromConfig.trim()) return { model: fromConfig.trim(), source: 'config' };
  return { model: null, source: 'default' };
}

// ---- Repo + git + file ------------------------------------------------------

export async function findRepoRoot(startCwd = process.cwd()) {
  let current = path.resolve(startCwd);
  while (true) {
    if (existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(startCwd);
    current = parent;
  }
}

export async function readIfFile(subject, invocationCwd, repoRoot) {
  if (!subject) return { text: '', resolvedPath: '' };
  for (const candidate of [path.resolve(invocationCwd, subject), path.resolve(repoRoot, subject)]) {
    if (!existsSync(candidate)) continue;
    const stats = await stat(candidate);
    if (!stats.isFile()) continue;
    const content = await readFile(candidate, 'utf8');
    return { text: content.slice(0, 20_000), resolvedPath: candidate };
  }
  return { text: '', resolvedPath: '' };
}

export function gitOutput(args, cwd) {
  return execFileSync('git', args, { encoding: 'utf8', cwd, maxBuffer: 20 * 1024 * 1024 });
}

// ---- Scoring ----------------------------------------------------------------

export function tokenize(text) {
  // Split into raw tokens, then for each one also split on path-style
  // punctuation (so "src/foo/bar.mjs" yields "src", "foo", "bar", "mjs" in
  // addition to the original token). Dedup, drop stop-words and short bits.
  return [...new Set(String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_./:-]+/g, ' ')
    .split(/\s+/)
    .flatMap((token) => token.split(/[./:-]+/).concat(token))
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))]
    .slice(0, 80);
}

export function scoreSession(session, query, now = new Date()) {
  const terms = tokenize(query);
  const haystack = session.text.toLowerCase();
  let score = 0;
  let matchedTerms = 0;

  for (const term of terms) {
    const first = haystack.indexOf(term);
    if (first === -1) continue;
    matchedTerms += 1;
    score += 5;
    let occurrences = 1;
    let next = haystack.indexOf(term, first + term.length);
    while (next !== -1 && occurrences < 5) {
      occurrences += 1;
      next = haystack.indexOf(term, next + term.length);
    }
    score += Math.max(0, occurrences - 1);
  }

  if (matchedTerms === 0) return { score: 0, matchedTerms };

  const lastTime = session.lastTimestamp instanceof Date
    ? session.lastTimestamp
    : new Date(session.lastTimestamp ?? 0);
  const daysOld = Math.max(0, (now.getTime() - lastTime.getTime()) / 86_400_000);
  const recencyBonus = Math.max(0, 8 - Math.log2(daysOld + 1) * 2);
  score += recencyBonus;

  if (matchedTerms >= 3) score += 6;
  if (matchedTerms >= 6) score += 8;

  return { score: Math.round(score * 10) / 10, matchedTerms };
}

export function selectSession(ranked, { threshold = DEFAULT_THRESHOLD, minMatchedTerms = DEFAULT_MIN_MATCHED_TERMS } = {}) {
  const best = ranked[0];
  if (!best || best.score < threshold) return null;
  if ((best.matchedTerms ?? 0) < minMatchedTerms) return null;
  return best;
}

export function serializeCandidate(candidate) {
  return {
    id: candidate.id,
    score: candidate.score,
    lastTimestamp: candidate.lastTimestamp instanceof Date
      ? candidate.lastTimestamp.toISOString()
      : candidate.lastTimestamp,
  };
}

// ---- Prompt -----------------------------------------------------------------

function targetBlock(subject, subjectText) {
  if (!subjectText) return subject;
  return `${subject}\n\nTarget file contents (bounded):\n\`\`\`text\n${subjectText}\n\`\`\``;
}

export function buildPrompt({
  mode,
  subject = '',
  subjectText = '',
  extra = '',
  base = 'HEAD~1',
  head = 'HEAD',
  diff = '',
  identity = 'You are an independent reviewer acting as a second brain.',
}) {
  const target = targetBlock(subject, subjectText);
  const suffix = extra ? `\n\nAdditional instructions:\n${extra}` : '';
  switch (mode) {
    case 'ask':
      return `${identity}\n\n${REVIEW_RULES}\n\nQuestion or task:\n${target}${suffix}`;
    case 'plan':
      return `${identity}\n\n${REVIEW_RULES}\n\nReview this plan for correctness, missing steps, unclear assumptions, sequencing risk, test coverage, and overengineering:\n${target}${suffix}`;
    case 'adversarial':
      return `${identity}\n\n${REVIEW_RULES}\n\nPerform an adversarial review of this target. Attack assumptions, hidden coupling, failure modes, security/operability risks, and weak tests. Return the strongest objections first, then suggested changes:\n${target}${suffix}`;
    case 'review':
      return `${identity}\n\n${REVIEW_RULES}\n\nPerform a read-only adversarial code review for ${base}..${head}. Return findings by severity with evidence and a merge verdict.\n\nDiff:\n${diff}${suffix}`;
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
}

function normalizeSubjectForSearch(subject) {
  return String(subject ?? '')
    .split(/\s+/)
    .map((token) => {
      const cleaned = token.replace(/^[([<]+|[\])>,.;:]+$/g, '');
      if (!cleaned.includes('/') && !cleaned.includes('\\')) return token;
      const withoutWrapper = cleaned.replace(/^[([<]+|[\])>,.;:]+$/g, '');
      const parts = withoutWrapper.split(/[\\/]+/).filter(Boolean);
      const anchor = parts.findIndex((part) =>
        ['.agents', 'docs', 'rust', 'typescript', 'src', 'tests', 'test', 'examples', 'deploy'].includes(part));
      if (anchor >= 0) return parts.slice(anchor).join('/');
      return path.basename(withoutWrapper);
    })
    .join(' ');
}

export function buildSearchQuery({ mode, subject = '', subjectText = '', extra = '', diffStat = '' }) {
  return [mode, normalizeSubjectForSearch(subject), extra, diffStat, subjectText.slice(0, 8_000)]
    .filter(Boolean)
    .join('\n');
}

// ---- CLI parsing primitives ------------------------------------------------

export function requireValue(rest, index, optionName) {
  const value = rest[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value`);
  }
  return value;
}
