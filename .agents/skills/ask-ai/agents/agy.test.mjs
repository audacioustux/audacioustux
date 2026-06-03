import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildArgs,
  id,
  loadActualModel,
  promptIdentity,
  resolveModel,
  sessionName,
  sessionOpts,
} from './agy.mjs';

// ---- contract identity -----------------------------------------------------

test('agent id and cliBin are stable', () => {
  assert.equal(id, 'agy');
});

// ---- sessionOpts -----------------------------------------------------------

test('sessionOpts returns the standard agy paths', () => {
  const opts = sessionOpts({ repoRoot: '/workspaces/TheGrid', home: '/tmp/h' });
  assert.equal(opts.conversationsDir, '/tmp/h/.gemini/antigravity-cli/conversations');
  assert.equal(opts.historyFile, '/tmp/h/.gemini/antigravity-cli/history.jsonl');
  assert.equal(opts.projectsFile, '/tmp/h/.gemini/antigravity-cli/cache/projects.json');
  assert.equal(opts.settingsFile, '/tmp/h/.gemini/antigravity-cli/settings.json');
  assert.equal(opts.repoRoot, '/workspaces/TheGrid');
});

// ---- loadActualModel -------------------------------------------------------

test('loadActualModel reads the model field from settings.json', async () => {
  const root = await os.tmpdir();
  const f = path.join(root, `ask-ai-agy-cfg-${process.pid}-${Date.now()}.json`);
  await writeFile(f, JSON.stringify({ model: 'Gemini 3.1 Pro (High)' }));
  try {
    assert.equal(await loadActualModel(f), 'Gemini 3.1 Pro (High)');
  } finally {
    await rm(f, { force: true });
  }
});

test('loadActualModel returns null for missing, malformed, or absent model', async () => {
  const root = await os.tmpdir();
  const base = path.join(root, `ask-ai-agy-cfg-${process.pid}-${Date.now()}`);
  const missing = path.join(base, 'absent.json');
  const malformed = path.join(base, 'bad.json');
  const noModel = path.join(base, 'no-model.json');
  const blank = path.join(base, 'blank.json');
  await mkdir(base, { recursive: true });
  await writeFile(malformed, '{not json');
  await writeFile(noModel, JSON.stringify({ enableTelemetry: false }));
  await writeFile(blank, JSON.stringify({ model: '   ' }));
  try {
    assert.equal(await loadActualModel(missing), null);
    assert.equal(await loadActualModel(malformed), null);
    assert.equal(await loadActualModel(noModel), null);
    assert.equal(await loadActualModel(blank), null);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

// ---- resolveModel ----------------------------------------------------------

test('resolveModel returns preferred from shared and actual from settings.json', async () => {
  const root = await os.tmpdir();
  const f = path.join(root, `ask-ai-agy-rm-${process.pid}-${Date.now()}.json`);
  await writeFile(f, JSON.stringify({ model: 'Gemini 3.1 Pro (High)' }));
  try {
    const out = await resolveModel({
      cliModel: 'Claude Opus 4.6 (Thinking)',
      env: {},
      config: {},
      settingsFile: f,
    });
    assert.equal(out.preferred, 'Claude Opus 4.6 (Thinking)');
    assert.equal(out.actual, 'Gemini 3.1 Pro (High)');
    assert.equal(out.source, 'cli');
    assert.equal(out.modelKnown, true);  // 'Gemini 3.1 Pro (High)' is in KNOWN_MODELS
  } finally {
    await rm(f, { force: true });
  }
});

test('resolveModel reports modelKnown=false for unknown model names', async () => {
  const root = await os.tmpdir();
  const f = path.join(root, `ask-ai-agy-unk-${process.pid}-${Date.now()}.json`);
  await writeFile(f, JSON.stringify({ model: 'Future Gemini 9.9 Ultra (Max)' }));
  try {
    const out = await resolveModel({ settingsFile: f });
    assert.equal(out.actual, 'Future Gemini 9.9 Ultra (Max)');
    assert.equal(out.modelKnown, false);
  } finally {
    await rm(f, { force: true });
  }
});

test('resolveModel falls back to null actual when settings.json is absent', async () => {
  const out = await resolveModel({ settingsFile: '/does/not/exist' });
  assert.equal(out.actual, null);
  assert.equal(out.modelKnown, null);
});

// ---- promptIdentity --------------------------------------------------------

test('promptIdentity prefers actual over preferred', () => {
  const identity = promptIdentity({ preferred: 'opus', actual: 'Gemini 3.1 Pro (High)' });
  assert.match(identity, /You are Gemini 3\.1 Pro \(High\) acting as/);
});

test('promptIdentity falls back to preferred when actual is absent', () => {
  const identity = promptIdentity({ preferred: 'opus', actual: null });
  assert.match(identity, /You are opus acting as/);
});

test('promptIdentity uses generic name when both are absent', () => {
  const identity = promptIdentity({ preferred: null, actual: null });
  assert.match(identity, /You are Antigravity \(agy\) acting as/);
});

// ---- sessionName -----------------------------------------------------------

test('sessionName includes the agent id and mode', () => {
  const name = sessionName({ mode: 'plan', stamp: '2026-06-02T22-00-00' });
  assert.match(name, /ask-ai-agy-plan-2026-06-02T22-00-00/);
});

// ---- buildArgs -------------------------------------------------------------

test('buildArgs never includes --model (agy has no model flag)', () => {
  const args = buildArgs({ prompt: 'q', model: 'opus' });
  assert.ok(!args.includes('--model'));
  assert.ok(!args.includes('--opus'));
});

test('buildArgs uses --conversation for a reused session', () => {
  const args = buildArgs({ prompt: 'continue', sessionId: 'conv-abc' });
  assert.deepEqual(args.slice(0, 3), ['-p', '--conversation', 'conv-abc']);
  assert.equal(args.at(-1), 'continue');
});

test('buildArgs includes --sandbox when set', () => {
  const args = buildArgs({ prompt: 'q', sandbox: true });
  assert.ok(args.includes('--sandbox'));
});

test('buildArgs includes --print-timeout when set', () => {
  const args = buildArgs({ prompt: 'q', printTimeout: '10m0s' });
  const idx = args.indexOf('--print-timeout');
  assert.ok(idx >= 0);
  assert.equal(args[idx + 1], '10m0s');
});
