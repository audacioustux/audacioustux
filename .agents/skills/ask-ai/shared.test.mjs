import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildPrompt,
  buildSearchQuery,
  defaultConfigFile,
  findRepoRoot,
  gitOutput,
  loadConfig,
  readIfFile,
  requireValue,
  resolveModel,
  scoreSession,
  selectSession,
  serializeCandidate,
  tokenize,
} from './shared.mjs';

// ---- defaultConfigFile -----------------------------------------------------

test('defaultConfigFile uses the passed-in skillUrl, not the caller module', () => {
  // The orchestrator MUST pass its own import.meta.url. If a future caller
  // forgets, this test catches it by using a fake URL we control.
  const fakeUrl = 'file:///some/skill/dir/ask-ai.mjs';
  const resolved = defaultConfigFile(fakeUrl);
  assert.equal(resolved, path.resolve('/some/skill/dir', 'config.json'));
});

test('defaultConfigFile with no arg resolves to the same directory as shared.mjs', () => {
  // shared.mjs and ask-ai.mjs are in the same directory in the current layout,
  // so the implicit default IS the skill directory. If shared.mjs were ever
  // moved into a subdirectory the caller must pass its own import.meta.url.
  const resolved = defaultConfigFile();
  assert.match(resolved, /config\.json$/);
  assert.ok(resolved.startsWith(path.resolve('.')));
});

// ---- loadConfig ------------------------------------------------------------

test('loadConfig returns empty agents for missing file', async () => {
  assert.deepEqual(
    await loadConfig(path.join(os.tmpdir(), 'definitely-not-here-' + Date.now())),
    { agents: {} },
  );
});

test('loadConfig returns empty agents for malformed JSON', async () => {
  const f = path.join(os.tmpdir(), `ask-ai-cfg-bad-${process.pid}-${Date.now()}.json`);
  await writeFile(f, '{not json');
  try {
    assert.deepEqual(await loadConfig(f), { agents: {} });
  } finally {
    await rm(f, { force: true });
  }
});

test('loadConfig returns empty agents for non-object / array root', async () => {
  const root = os.tmpdir();
  const cases = [
    [path.join(root, `c1-${Date.now()}.json`), '[]'],
    [path.join(root, `c2-${Date.now()}.json`), '"a string"'],
    [path.join(root, `c3-${Date.now()}.json`), '42'],
    [path.join(root, `c4-${Date.now()}.json`), 'null'],
  ];
  try {
    for (const [f, body] of cases) {
      await writeFile(f, body);
      assert.deepEqual(await loadConfig(f), { agents: {} }, `body=${body}`);
    }
  } finally {
    for (const [f] of cases) await rm(f, { force: true });
  }
});

test('loadConfig extracts per-agent model blocks and trims whitespace', async () => {
  const f = path.join(os.tmpdir(), `ask-ai-cfg-good-${process.pid}-${Date.now()}.json`);
  await writeFile(f, JSON.stringify({
    agents: {
      claude: { model: 'opus  ' },
      agy: { model: 'Gemini 3.1 Pro (High)' },
      broken: { model: '   ' },
      notAnObject: 'nope',
      empty: {},
    },
    unrelated: 'kept for the user',
  }));
  try {
    assert.deepEqual(await loadConfig(f), {
      agents: {
        claude: { model: 'opus' },
        agy: { model: 'Gemini 3.1 Pro (High)' },
      },
    });
  } finally {
    await rm(f, { force: true });
  }
});

// ---- resolveModel ----------------------------------------------------------

test('resolveModel precedence: CLI > env > config > default', () => {
  assert.deepEqual(resolveModel({ agentId: 'claude' }), { model: null, source: 'default' });

  assert.deepEqual(
    resolveModel({ agentId: 'claude', config: { agents: { claude: { model: 'haiku' } } } }),
    { model: 'haiku', source: 'config' },
  );

  assert.deepEqual(
    resolveModel({
      agentId: 'claude',
      env: { ASK_AI_MODEL_CLAUDE: 'sonnet' },
      config: { agents: { claude: { model: 'haiku' } } },
    }),
    { model: 'sonnet', source: 'env' },
  );

  assert.deepEqual(
    resolveModel({
      agentId: 'claude',
      cliModel: 'opus',
      env: { ASK_AI_MODEL_CLAUDE: 'sonnet' },
      config: { agents: { claude: { model: 'haiku' } } },
    }),
    { model: 'opus', source: 'cli' },
  );
});

test('resolveModel treats whitespace-only values as missing', () => {
  assert.deepEqual(
    resolveModel({ agentId: 'agy', cliModel: '   ', env: {}, config: { agents: { agy: { model: '' } } } }),
    { model: null, source: 'default' },
  );
});

test('resolveModel only reads env vars for the requested agent', () => {
  // Make sure the env var for one agent doesn't leak into another.
  assert.deepEqual(
    resolveModel({ agentId: 'agy', env: { ASK_AI_MODEL_CLAUDE: 'sonnet' } }),
    { model: null, source: 'default' },
  );
});

test('resolveModel env var name normalises non-alphanumerics to underscores', () => {
  // "Claude Code" -> ASK_AI_MODEL_CLAUDE_CODE
  assert.deepEqual(
    resolveModel({ agentId: 'Claude Code', env: { ASK_AI_MODEL_CLAUDE_CODE: 'opus' } }),
    { model: 'opus', source: 'env' },
  );
});

// ---- tokenize / scoreSession / selectSession / serializeCandidate ---------

test('tokenize dedupes, drops stop words, and splits on path punctuation', () => {
  const terms = tokenize('Review the docs/foo/plan.md with the team');
  // 'review', 'the', 'with' are stop words — filtered.
  assert.ok(!terms.includes('review'));
  assert.ok(!terms.includes('the'));
  assert.ok(!terms.includes('with'));
  // 'plan' is a stop word (filtered); 'md' is too short (< 3 chars) (filtered).
  assert.ok(!terms.includes('plan'));
  assert.ok(!terms.includes('md'));
  // The original path token survives as a whole (not a stop word, long enough).
  assert.ok(terms.includes('docs/foo/plan.md'));
  // Its punctuation-split parts survive when long enough and not stop words.
  assert.ok(terms.includes('docs'));
  assert.ok(terms.includes('foo'));
  assert.ok(terms.includes('team'));
  // The result is a deduped list — order is not guaranteed.
  assert.equal(new Set(terms).size, terms.length);
});

test('scoreSession returns 0 when no terms match', () => {
  const result = scoreSession({ text: 'lorem ipsum dolor', lastTimestamp: new Date() }, 'unrelated query');
  assert.deepEqual(result, { score: 0, matchedTerms: 0 });
});

test('scoreSession rewards matched terms and recency', () => {
  const now = new Date('2026-06-02T12:00:00.000Z');
  const recent = scoreSession({
    text: 'beam quic transport review for safety',
    lastTimestamp: new Date('2026-06-01T12:00:00.000Z'),
  }, 'beam quic transport safety', now);
  const old = scoreSession({
    text: 'beam quic transport review for safety',
    lastTimestamp: new Date('2025-01-01T12:00:00.000Z'),
  }, 'beam quic transport safety', now);
  assert.ok(recent.matchedTerms >= 3);
  assert.ok(recent.score > old.score, `recent ${recent.score} should beat old ${old.score}`);
});

test('selectSession returns null below threshold', () => {
  assert.equal(selectSession([{ score: 5, matchedTerms: 2 }], { threshold: 12 }), null);
});

test('selectSession requires minMatchedTerms', () => {
  assert.equal(selectSession([{ score: 100, matchedTerms: 1 }], { threshold: 12, minMatchedTerms: 2 }), null);
  assert.deepEqual(
    selectSession([{ score: 100, matchedTerms: 2 }], { threshold: 12, minMatchedTerms: 2 }),
    { score: 100, matchedTerms: 2 },
  );
});

test('serializeCandidate redacts everything except id/score/lastTimestamp', () => {
  const out = serializeCandidate({
    id: 'sensitive-id',
    score: 42,
    lastTimestamp: new Date('2026-06-01T12:00:00.000Z'),
    text: 'SECRET_TOKEN=do-not-print',
    filePath: '/tmp/x',
  });
  assert.deepEqual(out, {
    id: 'sensitive-id',
    score: 42,
    lastTimestamp: '2026-06-01T12:00:00.000Z',
  });
});

test('serializeCandidate is null/undefined safe for lastTimestamp', () => {
  const out = serializeCandidate({ id: 'x', score: 0, lastTimestamp: null });
  assert.equal(out.id, 'x');
  assert.equal(out.score, 0);
  assert.equal(out.lastTimestamp, null);
});

// ---- findRepoRoot ----------------------------------------------------------

test('findRepoRoot walks up to the nearest .git', async () => {
  const root = path.join(os.tmpdir(), `ask-ai-root-${process.pid}-${Date.now()}`);
  const subdir = path.join(root, 'a', 'b');
  await mkdir(path.join(root, '.git'), { recursive: true });
  await mkdir(subdir, { recursive: true });
  try {
    assert.equal(await findRepoRoot(subdir), root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('findRepoRoot returns the resolved cwd when no .git found', async () => {
  const nowhere = path.join(os.tmpdir(), 'no-git-' + Date.now(), 'deep', 'dir');
  await mkdir(nowhere, { recursive: true });
  try {
    assert.equal(await findRepoRoot(nowhere), path.resolve(nowhere));
  } finally {
    await rm(path.dirname(path.dirname(nowhere)), { recursive: true, force: true });
  }
});

// ---- readIfFile ------------------------------------------------------------

test('readIfFile returns bounded content for existing files', async () => {
  const f = path.join(os.tmpdir(), `ask-ai-rif-${Date.now()}.txt`);
  await writeFile(f, 'x'.repeat(50_000));
  try {
    const { text, resolvedPath } = await readIfFile(f, '/tmp', '/tmp');
    assert.equal(resolvedPath, path.resolve(f));
    assert.equal(text.length, 20_000); // bounded
  } finally {
    await rm(f, { force: true });
  }
});

test('readIfFile returns empty for missing files', async () => {
  const { text, resolvedPath } = await readIfFile('/does/not/exist', '/tmp', '/tmp');
  assert.equal(text, '');
  assert.equal(resolvedPath, '');
});

test('readIfFile returns empty for an empty subject', async () => {
  const { text, resolvedPath } = await readIfFile('', '/tmp', '/tmp');
  assert.equal(text, '');
  assert.equal(resolvedPath, '');
});

// ---- gitOutput -------------------------------------------------------------

test('gitOutput runs git in the given cwd and returns stdout', () => {
  const root = path.join(os.tmpdir(), `ask-ai-git-${process.pid}-${Date.now()}`);
  const repo = path.join(root, 'repo');
  try {
    execFileSync('git', ['init', '-q', repo], { stdio: 'pipe' });
    const out = gitOutput(['rev-parse', '--git-dir'], repo);
    assert.match(out, /^\.git/);
  } finally {
    execFileSync('rm', ['-rf', root], { stdio: 'pipe' });
  }
});

// ---- buildPrompt -----------------------------------------------------------

test('buildPrompt produces mode-specific shapes with a custom identity', () => {
  const identity = 'You are Opus acting as an independent second brain.';
  const ask = buildPrompt({ mode: 'ask', subject: 'is this safe?', identity });
  assert.match(ask, /You are Opus/);
  assert.match(ask, /Question or task:\nis this safe\?/);

  const plan = buildPrompt({ mode: 'plan', subject: 'docs/x.md', subjectText: '# Plan', identity });
  assert.match(plan, /Review this plan/);
  assert.match(plan, /docs\/x\.md/);
  assert.match(plan, /# Plan/);

  const adv = buildPrompt({ mode: 'adversarial', subject: 'docs/x.md', identity });
  assert.match(adv, /adversarial review/i);

  const review = buildPrompt({ mode: 'review', base: 'HEAD~1', head: 'HEAD', diff: 'diff --git ...', identity });
  assert.match(review, /adversarial code review for HEAD~1\.\.HEAD/);
  assert.match(review, /diff --git \.\.\./);

  assert.throws(() => buildPrompt({ mode: 'bogus', identity }), /Unsupported mode/);
});

test('buildPrompt embeds bounded subject text and extra instructions', () => {
  const prompt = buildPrompt({
    mode: 'ask',
    subject: 'q',
    subjectText: 'long body',
    extra: 'focus on security',
    identity: 'You are Claude',
  });
  assert.match(prompt, /```text\nlong body\n```/);
  assert.match(prompt, /Additional instructions:\nfocus on security/);
});

// ---- buildSearchQuery ------------------------------------------------------

test('buildSearchQuery joins non-empty parts with newlines', () => {
  const q = buildSearchQuery({
    mode: 'plan',
    subject: 'docs/x.md',
    extra: 'focus',
    diffStat: 'a | 1 +',
    subjectText: 'big body',
  });
  for (const part of ['plan', 'docs/x.md', 'focus', 'a | 1 +', 'big body']) {
    assert.ok(q.includes(part), `expected query to contain ${JSON.stringify(part)}`);
  }
});

test('buildSearchQuery drops empty parts', () => {
  const q = buildSearchQuery({ mode: 'ask', subject: '', subjectText: '' });
  assert.equal(q, 'ask');
});

// ---- requireValue ----------------------------------------------------------

test('requireValue returns the next arg when present and non-flag-shaped', () => {
  assert.equal(requireValue(['--foo', 'bar'], 0, '--foo'), 'bar');
});

test('requireValue throws on missing value or another flag', () => {
  assert.throws(() => requireValue(['--foo'], 0, '--foo'), /requires a value/);
  assert.throws(() => requireValue(['--foo', '--bar'], 0, '--foo'), /requires a value/);
});
