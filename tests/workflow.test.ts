import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Store } from '../server/store.js';
import { Provider } from '../server/ai.js';
import { ResearchWorkflow, plannedState, researchOperations } from '../server/research-workflow.js';
import { initialState } from '../server/seed.js';
import { parseState } from '../shared/schema.js';
import { styledResume } from '../shared/latex-template.js';
import type { ResearchRun } from '../shared/research-contract.js';
const input = {
  goal: 'Urban planner',
  baseline: 'GIS experience; needs policy and portfolio',
  jd: '',
  location: 'India',
  weeklyHours: 12,
  sourceUrls: [],
  onlineConsent: true as const,
  includeContext: false,
  replaceStarter: true,
};
const proposal = {
  summary:
    'A source-grounded planning exercise (https://example.org/guide), not completed experience.',
  operations: [
    {
      kind: 'task' as const,
      value: {
        id: 'policy',
        title: 'Analyze local planning policy with a cited case study',
        track: 'Role' as const,
        estimateMinutes: 180,
        status: 'todo' as const,
        prerequisites: [],
        evidence: '',
        priority: 'core' as const,
        createdAt: '2026-10-22',
      },
    },
  ],
};
async function until(fn: () => Promise<any>) {
  for (let i = 0; i < 100; i++) {
    const r = await fn();
    if (r.status !== 'running') return r;
    await new Promise((r) => setTimeout(r, 15));
  }
  throw new Error('Workflow did not finish');
}
test('old backups gain resume documents; custom source retained verbatim and template has no branding', () => {
  const old: any = initialState();
  delete old.resumeDocuments;
  const state = parseState(old);
  assert.deepEqual(state.resumeDocuments, []);
  const source =
    '\\documentclass{article}\r\n% my exact layout\r\n\\begin{document}Hello\\end{document}';
  state.resumeDocuments.push({ id: 'custom', title: 'Original', source, updatedAt: '2026-10-22' });
  assert.equal(parseState(state).resumeDocuments[0].source, source);
  assert.ok(!styledResume(state).includes('Career Switch Planner'));
  assert.ok(styledResume(state).includes('\\pagestyle{empty}'));
});
test('research is persistent, retryable, grounded and never edits before apply', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'career-research-'));
  const store = new Store(root);
  await store.init();
  let fail = true;
  const provider = {
    info: () => ({ type: 'ollama' }),
    queries: async () => ({ queries: ['urban planner professional requirements'] }),
    propose: async () => proposal,
  } as unknown as Provider;
  const dependencies = {
    search: async () => [
      { title: 'Professional guidance', url: 'https://example.org/guide', snippet: 'Guidance' },
    ],
    read: async (url: string) => {
      if (fail) throw new Error('simulated outage');
      return {
        title: 'Professional guidance',
        url,
        excerpt:
          'Primary guidance on planning policy, GIS, evidence and professional assessment. '.repeat(
            5,
          ),
      };
    },
  };
  try {
    const flow = new ResearchWorkflow(store, provider, dependencies);
    const created = await flow.start(input);
    const failed = await until(() => flow.get(created.id));
    assert.equal(failed.status, 'failed');
    assert.equal(store.state.revision, 0);
    assert.equal(store.state.notes.length, 0);
    fail = false;
    await flow.retry(created.id);
    const ready = await until(() => flow.get(created.id));
    assert.equal(ready.status, 'ready');
    assert.equal(ready.attempt, 2);
    assert.equal(store.state.tasks.length, 39);
    assert.equal(ready.sources.length, 1);
    assert.ok(ready.warnings.some((w) => w.includes('Only one source')));
    const next = await flow.apply(created.id, 0);
    assert.equal(next.tasks.length, 1);
    assert.equal(next.profile.weeklyHours, 12);
    assert.equal(next.tasks[0].track, 'Role');
    assert.equal(next.sessions.length, 0);
    assert.equal(next.sources.length, 1);
    assert.ok(next.notes.some((n) => n.category === 'Research plan'));
    assert.equal((await flow.get(created.id)).status, 'applied');
    await assert.rejects(flow.apply(created.id, 1), /unapplied/);
    const restoredFlow = new ResearchWorkflow(store, provider, dependencies);
    assert.equal((await restoredFlow.list())[0].status, 'applied');
    const raw = await readFile(path.join(root, 'research-runs', created.id + '.json'), 'utf8');
    assert.ok(raw.includes('Professional guidance'));
  } finally {
    await store.close();
    await rm(root, { recursive: true, force: true });
  }
});
test('research preserves custom/progress-linked records, rejects fabricated activity and stale apply', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'career-research-'));
  const store = new Store(root);
  await store.init();
  const provider = {
    info: () => ({ type: 'ollama' }),
    queries: async () => ({ queries: ['role requirements'] }),
    propose: async () => proposal,
  } as unknown as Provider;
  const dependencies = {
    search: async () => [],
    read: async (url: string) => ({ title: 'Guide', url, excerpt: 'Evidence '.repeat(100) }),
  };
  try {
    const flow = new ResearchWorkflow(store, provider, dependencies);
    const created = await flow.start({ ...input, sourceUrls: ['https://example.org/guide'] });
    const ready = await until(() => flow.get(created.id));
    const state = initialState();
    state.tasks[0].status = 'done';
    state.tasks[0].evidence = 'Real owner evidence';
    state.tasks.push({ ...state.tasks[1], id: 'custom', prerequisites: [state.tasks[1].id] });
    const next = plannedState(state, ready);
    assert.ok(next.tasks.some((t) => t.id === 'custom'));
    assert.ok(next.tasks.some((t) => t.id === state.tasks[1].id));
    assert.ok(next.tasks.some((t) => t.status === 'done'));
    const malicious = structuredClone(ready);
    malicious.proposal = {
      summary: 'bad',
      operations: [
        {
          kind: 'session',
          value: {
            id: 'invented',
            date: '2026-10-22',
            minutes: 30,
            track: 'Career',
            summary: 'Fake',
            taskId: '',
          },
        },
      ],
    };
    assert.throws(() => researchOperations(malicious), /may only propose/);
    await store.replace(0, store.state);
    await assert.rejects(flow.apply(created.id, 1), /Workspace changed/);
    assert.equal(store.state.revision, 1);
  } finally {
    await store.close();
    await rm(root, { recursive: true, force: true });
  }
});
