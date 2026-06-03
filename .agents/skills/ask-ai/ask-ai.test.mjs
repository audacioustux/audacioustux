import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { parseCliArgs } from './ask-ai.mjs';

// ---- parseCliArgs ----------------------------------------------------------

test('parseCliArgs rejects unknown agent', () => {
  const out = parseCliArgs(['codex', 'ask', 'hi']);
  assert.equal(out.help, true);
  assert.match(out.error, /Unknown agent/);
});

test('parseCliArgs rejects unknown mode', () => {
  const out = parseCliArgs(['claude', 'ragemode', 'hi']);
  assert.equal(out.help, true);
  assert.match(out.error, /Unknown mode/);
});

test('parseCliArgs returns help for missing args', () => {
  assert.equal(parseCliArgs([]).help, true);
  assert.equal(parseCliArgs(['claude']).help, true);
  assert.equal(parseCliArgs(['--help']).help, true);
});

test('parseCliArgs parses agent + mode + positional + options', () => {
  const out = parseCliArgs([
    'claude', 'ask', 'is this safe?',
    '--model', 'opus', '--threshold', '15', '--fresh', '--dry-run',
  ]);
  assert.equal(out.agent, 'claude');
  assert.equal(out.mode, 'ask');
  assert.deepEqual(out.positional, ['is this safe?']);
  assert.equal(out.model, 'opus');
  assert.equal(out.threshold, 15);
  assert.equal(out.fresh, true);
  assert.equal(out.dryRun, true);
});

test('parseCliArgs rejects --resume + --fresh', () => {
  assert.throws(() => parseCliArgs(['claude', 'ask', 'q', '--resume', 'x', '--fresh']), /mutually exclusive/);
});

test('parseCliArgs rejects --threshold NaN', () => {
  assert.throws(() => parseCliArgs(['claude', 'ask', 'q', '--threshold', 'abc']), /threshold must be a number/);
});

test('parseCliArgs accepts agy-specific --sandbox', () => {
  const out = parseCliArgs(['agy', 'ask', 'q', '--sandbox']);
  assert.equal(out.agent, 'agy');
  assert.equal(out.sandbox, true);
});

test('parseCliArgs parses review --base and --head', () => {
  const out = parseCliArgs(['claude', 'review', '--base', 'main', '--head', 'HEAD']);
  assert.equal(out.mode, 'review');
  assert.equal(out.base, 'main');
  assert.equal(out.head, 'HEAD');
});

test('parseCliArgs passes through --extra and --cwd', () => {
  const out = parseCliArgs(['agy', 'plan', 'docs/x.md', '--extra', 'focus', '--cwd', '/tmp']);
  assert.equal(out.extra, 'focus');
  assert.equal(out.cwd, '/tmp');
});
