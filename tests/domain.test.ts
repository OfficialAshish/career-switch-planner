import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initialState } from '../server/seed.js';
import { applyOperations, parseState } from '../shared/schema.js';
import { planning, nextReview } from '../shared/planner.js';
import { quickLog } from '../server/quick-log.js';
import { Store, ConflictError } from '../server/store.js';
import { publicIPv4 } from '../server/research.js';
import { validateEndpoint } from '../server/ai.js';

test('generic seed has 150 unique DSA + 50 SQL and no fabricated activity', () => {
  const s = initialState(); assert.equal(s.questions.length, 200);
  assert.equal(s.questions.filter(q => q.kind === 'DSA').length, 150);
  assert.equal(new Set(s.questions.map(q => q.id)).size, 200);
  assert.equal(s.sessions.length, 0); assert.equal(s.profile.name, '');
});
test('forecast moves with capacity; no fixed February date', () => {
  const s = initialState(); const a = planning(s, '2026-10-26');
  s.profile.weeklyHours = 38; const b = planning(s, '2026-10-26');
  assert.ok(b.forecast < a.forecast); assert.equal(b.observed, false);
  assert.ok(b.available.every(t => t.prerequisites.length === 0));
});
test('completed tasks disappear, unfinished tasks retain remaining work', () => {
  const s = initialState(); s.tasks[0].status = 'done';
  const p = planning(s); assert.equal(p.done, 1); assert.ok(!p.available.find(t => t.id === 'python'));
  assert.ok(p.available.some(t => t.id === 'api'));
});
test('review intervals reset after failure and increase with independent recall', () => {
  const s = initialState(), q = s.questions[0];
  s.attempts.push({ id: 'a', questionId: q.id, date: '2026-10-26', result: 'Independent', minutes: 20, notes: '', language: 'Python' });
  assert.equal(nextReview(s, q), '2026-10-29');
  s.attempts.push({ ...s.attempts[0], id: 'b', date: '2026-10-29' }); assert.equal(nextReview(s, q), '2026-11-05');
  s.attempts.push({ ...s.attempts[0], id: 'c', date: '2026-11-05', result: 'Failed' }); assert.equal(nextReview(s, q), '2026-11-06');
});
test('quick log does routine fields without inventing success or time', () => {
  const s = initialState();
  const p = quickLog('1h 30min on LC 3 independently, without hints', '2026-10-26', s);
  assert.equal(p.operations[0].kind, 'session');
  assert.equal((p.operations[0].value as any).minutes, 90);
  assert.equal(p.operations[1].kind, 'attempt');
  const missing = quickLog('Read about graph traversal', '2026-10-26', s);
  assert.equal(missing.operations[0].kind, 'note');
  assert.equal(s.sessions.length, 0);
});
test('references, cycles, dates and verified gates require valid evidence', () => {
  const s = initialState(); s.tasks[0].prerequisites = [s.tasks[0].id]; assert.throws(() => parseState(s), /cycle/);
  const gate = initialState().gates[0]; assert.throws(() => applyOperations(initialState(), [{ kind: 'gate', value: { ...gate, status: 'Verified' } }]));
  assert.throws(() => quickLog('30min coding', '2026-02-30', initialState()));
});
test('atomic persistence, conflicts, locks and recovery preserve data', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'career-test-')); const store = new Store(dir);
  try {
    await store.init();
    const rival = new Store(dir); await assert.rejects(rival.init(), /Another server/);
    const p = quickLog('45min Python API tests', '2026-10-26', store.state);
    await store.apply(0, p.operations); assert.equal(store.state.revision, 1);
    await assert.rejects(store.apply(0, p.operations), ConflictError);
    assert.equal(JSON.parse(await readFile(store.file, 'utf8')).sessions.length, 1);
    await store.close(); await writeFile(store.file, '{broken');
    const recovered = new Store(dir); await recovered.init();
    assert.match(recovered.notice, /Recovered/); assert.equal(recovered.state.revision, 0); await recovered.close();
  } finally { await store.close(); await rm(dir, { recursive: true, force: true }); }
});
test('research blocks private/reserved IPs and provider endpoints reject secrets in URL', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1']) assert.equal(publicIPv4(ip), false);
  assert.equal(publicIPv4('8.8.8.8'), true);
  assert.throws(() => validateEndpoint({ type: 'compatible', endpoint: 'http://example.com/v1', model: 'test' }));
  assert.throws(() => validateEndpoint({ type: 'compatible', endpoint: 'https://user:secret@example.com/v1', model: 'test' }));
  validateEndpoint({ type: 'ollama', endpoint: 'http://127.0.0.1:11434', model: 'local-model' });
});