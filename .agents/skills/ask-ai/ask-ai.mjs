#!/usr/bin/env node
// ask-ai: invoke an independent AI reviewer as a second brain with
// relevance-scoped session/conversation reuse.
//
// Mirrors the pi-subagents agent pattern: one skill, multiple agents,
// per-agent model + config overrides, default model = CLI's own default.
//
// Usage:
//   ask-ai claude ask "is this sound?"
//   ask-ai agy review --base HEAD~1 --head HEAD
//   ask-ai claude plan docs/plan.md
//   ask-ai agy adversarial docs/design.md --extra "focus on security"
//   ask-ai claude sessions
//
// Model resolution (highest first):
//   --model <name>  →  $ASK_AI_MODEL_<AGENT>  →  config.json  →  CLI default

import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';

import {
  MODES,
  buildPrompt,
  buildSearchQuery,
  defaultConfigFile,
  findRepoRoot,
  gitOutput,
  loadConfig,
  readIfFile,
  requireValue,
  selectSession,
  DEFAULT_THRESHOLD,
} from './shared.mjs';

import * as claude from './agents/claude.mjs';
import * as agy from './agents/agy.mjs';

const AGENTS = { claude, agy };
const SKILL_NAME = 'ask-ai';

// ---- CLI parsing -----------------------------------------------------------

function usage() {
  return `Usage:
  ask-ai <agent> <mode> [subject...]

Modes:
  ask          General second opinion or follow-up question
  plan         Plan completeness and sequencing critique
  adversarial  Strongest-objection review of design/spec/approach
  review       Read-only committed-range diff review (use --base/--head)
  sessions     Show ranked candidate sessions without invoking the CLI

Agents:
  claude       Wraps the claude CLI (Anthropic)
  agy          Wraps the agy CLI (Antigravity / Gemini)

Options:
  --model <name>       Override model for this run (highest priority).
                       Resolution: --model > $ASK_AI_MODEL_<AGENT> > config.json > default.
  --config <path>      Path to config.json (default: <skill-dir>/config.json).
  --resume <id>        Force a specific session/conversation id.
  --fresh              Skip session scan; start a new thread.
  --threshold <n>      Minimum relevance score for reuse (default: ${DEFAULT_THRESHOLD}).
  --sandbox            (agy only) pass --sandbox to agy.
  --base <ref>         Base ref for review mode (default: HEAD~1).
  --head <ref>         Head ref for review mode (default: HEAD).
  --extra "..."        Additional focus instructions for the reviewer.
  --cwd <path>         Override invocation cwd.
  --dry-run            Print selected session, model, and CLI args; do not invoke.
  --help               Show this help.
`;
}

export function parseCliArgs(argv) {
  const [agent, mode, ...rest] = argv;
  if (!agent || agent === '--help' || agent === '-h') return { help: true };
  if (!AGENTS[agent]) {
    return { help: true, error: mode ? `Unknown agent: ${agent}. Known: ${Object.keys(AGENTS).join(', ')}` : null };
  }
  if (!mode || mode === '--help' || mode === '-h') return { help: true };
  if (!MODES.includes(mode)) {
    return { help: true, error: `Unknown mode: ${mode}. Known: ${MODES.join(', ')}` };
  }

  const options = {
    agent, mode, positional: [],
    base: 'HEAD~1', head: 'HEAD',
    fresh: false, threshold: DEFAULT_THRESHOLD,
    model: null, configFile: null,
    sandbox: false, extra: '', dryRun: false,
  };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    switch (arg) {
      case '--resume':      options.resume = requireValue(rest, i, '--resume');   i += 1; break;
      case '--fresh':       options.fresh = true;                                   break;
      case '--threshold':   options.threshold = Number(requireValue(rest, i, '--threshold')); i += 1; break;
      case '--model':       options.model = requireValue(rest, i, '--model');       i += 1; break;
      case '--config':      options.configFile = requireValue(rest, i, '--config'); i += 1; break;
      case '--sandbox':     options.sandbox = true;                                  break;
      case '--base':        options.base = requireValue(rest, i, '--base');         i += 1; break;
      case '--head':        options.head = requireValue(rest, i, '--head');         i += 1; break;
      case '--extra':       options.extra = requireValue(rest, i, '--extra');       i += 1; break;
      case '--cwd':         options.cwd = requireValue(rest, i, '--cwd');           i += 1; break;
      case '--dry-run':     options.dryRun = true;                                   break;
      default:              options.positional.push(arg);
    }
  }

  if (!Number.isFinite(options.threshold)) throw new Error('--threshold must be a number');
  if (options.resume && options.fresh) throw new Error('--resume and --fresh are mutually exclusive');
  return options;
}

// ---- prompt building -------------------------------------------------------

async function promptForReview({ agent, options, repoRoot, model, actual }) {
  const range = `${options.base}..${options.head}`;
  const statText = gitOutput(['diff', '--stat', range], repoRoot);
  const diff = gitOutput(['diff', '--no-ext-diff', '--find-renames', '--function-context', range], repoRoot);
  const identity = agent.promptIdentity({ preferred: model, actual });
  return {
    prompt: buildPrompt({
      mode: 'review', base: options.base, head: options.head,
      diff: `## Diff stat\n${statText}\n\n## Diff\n${diff}`,
      extra: options.extra, identity,
    }),
    query: buildSearchQuery({
      mode: 'review', subject: `${options.base} ${options.head}`,
      extra: options.extra, diffStat: statText,
    }),
  };
}

async function promptForSubject({ agent, options, invocationCwd, repoRoot, model, actual }) {
  const subject = options.positional.join(' ').trim();
  if (!subject && options.mode !== 'sessions') {
    throw new Error(`${options.mode} mode requires a question, file path, or description`);
  }
  const subjectFile = await readIfFile(subject, invocationCwd, repoRoot);
  const displaySubject = subjectFile.resolvedPath ? `${subject} (${subjectFile.resolvedPath})` : subject;
  const promptMode = options.mode === 'sessions' ? 'ask' : options.mode;
  const identity = agent.promptIdentity({ preferred: model, actual });
  return {
    prompt: buildPrompt({
      mode: promptMode, subject: displaySubject,
      subjectText: subjectFile.text, extra: options.extra, identity,
    }),
    query: buildSearchQuery({
      mode: options.mode, subject, extra: options.extra, subjectText: subjectFile.text,
    }),
  };
}

// ---- main ------------------------------------------------------------------

async function main(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  if (options.help) {
    if (options.error) process.stderr.write(`${SKILL_NAME}: ${options.error}\n`);
    process.stdout.write(usage());
    return options.error ? 1 : 0;
  }

  const configFile = options.configFile ?? defaultConfigFile(import.meta.url);
  const config = await loadConfig(configFile);
  const agent = AGENTS[options.agent];
  const invocationCwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const repoRoot = await findRepoRoot(invocationCwd);

  // Resolve model: shared first, then let the agent enrich (agy reads settings.json).
  const agentModelOpts = { cliModel: options.model, env: process.env, config };
  if (agent.sessionOpts) {
    agentModelOpts.settingsFile = agent.sessionOpts({ repoRoot }).settingsFile;
  }
  const { preferred, actual, source, modelKnown } = await agent.resolveModel(agentModelOpts);

  // Build prompt.
  const promptFn = options.mode === 'review' ? promptForReview : promptForSubject;
  const { prompt, query } = await promptFn({
    agent, options, invocationCwd, repoRoot, model: preferred, actual,
  });

  // Session discovery.
  let ranked = [];
  let selected = null;
  if (options.resume) {
    selected = { id: options.resume, score: 'explicit' };
  } else if (!options.fresh) {
    const sessionOpts = agent.sessionOpts({ repoRoot });
    ranked = await agent.rankSessions({ ...sessionOpts, query });
    selected = selectSession(ranked, { threshold: options.threshold });
  }

  if (options.mode === 'sessions') {
    process.stdout.write(JSON.stringify({
      agent: agent.id,
      sessions: ranked.slice(0, 10).map((c) => ({
        id: c.id, score: c.score,
        lastTimestamp: c.lastTimestamp instanceof Date ? c.lastTimestamp.toISOString() : c.lastTimestamp,
      })),
    }, null, 2) + '\n');
    return 0;
  }

  // Build CLI args.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const args = agent.buildArgs({
    prompt,
    sessionId: selected?.id ?? null,
    model: preferred,
    name: options.name ?? agent.sessionName({ mode: options.mode, stamp }),
    newSessionId: selected ? null : crypto.randomUUID(),
    // agent-specific extras (claude ignores sandbox; agy ignores model/name/etc.)
    sandbox: options.sandbox,
    permissionMode: 'plan',
    forkSession: true,
  });

  const summary = {
    agent: agent.id,
    agentBin: agent.cliBin,
    configFile,
    preferred, actual, source, modelKnown,
    selectedSession: selected,
    topCandidates: ranked.slice(0, 5).map((c) => ({
      id: c.id, score: c.score,
      lastTimestamp: c.lastTimestamp instanceof Date ? c.lastTimestamp.toISOString() : c.lastTimestamp,
    })),
    command: [agent.cliBin, ...args],
  };

  if (options.dryRun) {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    return 0;
  }

  // Warn when preferred ≠ actual (agy only, where we can't force the model).
  if (preferred && actual && preferred !== actual) {
    process.stderr.write(
      `${SKILL_NAME}: note — requested model "${preferred}" differs from agy's configured model "${actual}" (source: settings.json). ` +
      `agy will use "${actual}". To change it, edit ~/.gemini/antigravity-cli/settings.json.\n`
    );
  }

  // Run.
  await mkdir(summary.agentBin === 'claude'
    ? agent.sessionOpts({ repoRoot }).sessionsDir ?? '.'
    : '.', { recursive: true }).catch(() => {});

  const modelLabel = preferred ?? '(CLI default)';
  process.stderr.write(`${SKILL_NAME}: model=${modelLabel} (source: ${source})\n`);
  process.stderr.write(
    `${SKILL_NAME}: ${selected
      ? `using session ${selected.id} (score ${selected.score})`
      : 'creating a new session'}\n`
  );

  const result = spawnSync(agent.cliBin, args, { stdio: 'inherit', cwd: repoRoot });
  if (result.error) throw result.error;
  return result.status ?? 0;
}

// ---- CLI entry point -------------------------------------------------------

const isCli = process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1]);
if (isCli) {
  main().then((code) => { process.exitCode = code; })
    .catch((error) => { process.stderr.write(`${SKILL_NAME}: ${error.message}\n`); process.exitCode = 1; });
}
