import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildArgs,
  id,
  promptIdentity,
  resolveModel,
  sessionName,
  sessionOpts,
} from './claude.mjs';

// ---- contract identity -----------------------------------------------------

test('agent id and cliBin are stable', () => {
  assert.equal(id, 'claude');
});

// ---- sessionOpts -----------------------------------------------------------

test('sessionOpts maps repoRoot to a deterministic sessionsDir', () => {
  const opts = sessionOpts({ repoRoot: '/workspaces/TheGrid', home: '/tmp/h' });
  assert.equal(opts.sessionsDir, '/tmp/h/.claude/projects/-workspaces-TheGrid');
});

// ---- resolveModel ----------------------------------------------------------

test('resolveModel delegates to shared with no CLI model → default', async () => {
  const out = await resolveModel({ cliModel: null, env: {}, config: {} });
  assert.deepEqual(out, { preferred: null, actual: null, source: 'default', modelKnown: null });
});

test('resolveModel passes through the preferred model from config', async () => {
  const out = await resolveModel({
    config: { agents: { claude: { model: 'opus' } } },
  });
  assert.deepEqual(out, { preferred: 'opus', actual: 'opus', source: 'config', modelKnown: null });
});

test('resolveModel CLI flag beats env and config', async () => {
  const out = await resolveModel({
    cliModel: 'haiku',
    env: { ASK_AI_MODEL_CLAUDE: 'sonnet' },
    config: { agents: { claude: { model: 'opus' } } },
  });
  assert.deepEqual(out, { preferred: 'haiku', actual: 'haiku', source: 'cli', modelKnown: null });
});

// ---- promptIdentity --------------------------------------------------------

test('promptIdentity names the model when one is set', () => {
  assert.match(promptIdentity({ preferred: 'opus', actual: 'opus' }), /You are opus acting as/);
});

test('promptIdentity falls back to generic Claude when no model', () => {
  assert.match(promptIdentity({ preferred: null, actual: null }), /You are Claude acting as/);
  assert.doesNotMatch(promptIdentity({ preferred: null, actual: null }), /You are opus/);
});

// ---- sessionName -----------------------------------------------------------

test('sessionName includes the agent id and mode', () => {
  const name = sessionName({ mode: 'adversarial', stamp: '2026-06-02T22-00-00' });
  assert.match(name, /ask-ai-claude-adversarial-2026-06-02T22-00-00/);
});

// ---- buildArgs -------------------------------------------------------------

test('buildArgs omits --model when no model is provided', () => {
  const args = buildArgs({ prompt: 'Is this safe?' });
  assert.deepEqual(args.slice(0, 3), ['-p', '--permission-mode', 'plan']);
  assert.ok(!args.includes('--model'));
  assert.equal(args.at(-1), 'Is this safe?');
});

test('buildArgs includes --model when set', () => {
  const args = buildArgs({ prompt: 'q', model: 'opus' });
  assert.deepEqual(args.slice(0, 5), ['-p', '--model', 'opus', '--permission-mode', 'plan']);
});

test('buildArgs uses --resume + --fork-session for a reused session', () => {
  const args = buildArgs({
    prompt: 'continue',
    sessionId: 'abc-123',
    model: 'opus',
  });
  assert.ok(args.includes('--resume'));
  assert.ok(args.includes('abc-123'));
  assert.ok(args.includes('--fork-session'));
  assert.ok(!args.includes('--session-id'));
  assert.ok(!args.includes('--continue'));
});

test('buildArgs uses --session-id for a brand-new session', () => {
  const uuid = '11111111-2222-3333-4444-555555555555';
  const args = buildArgs({
    prompt: 'new',
    model: 'opus',
    newSessionId: uuid,
  });
  assert.ok(args.includes('--session-id'));
  assert.ok(args.includes(uuid));
  assert.ok(!args.includes('--resume'));
  assert.ok(!args.includes('--fork-session'));
  assert.ok(!args.includes('--continue'));
});

test('buildArgs respects name and permissionMode', () => {
  const args = buildArgs({ prompt: 'q', name: 'test-session' });
  const nameIdx = args.indexOf('--name');
  assert.ok(nameIdx >= 0);
  assert.equal(args[nameIdx + 1], 'test-session');
  const permIdx = args.indexOf('--permission-mode');
  assert.ok(permIdx >= 0);
  assert.equal(args[permIdx + 1], 'plan');
});
