import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  researchInputSchema,
  researchRunSchema,
  type ResearchRun,
} from '../shared/research-contract.js';
import {
  applyOperations,
  parseState,
  type State,
  type Operation,
  proposalSchema,
} from '../shared/schema.js';
import { localDay } from '../shared/planner.js';
import { Store, atomicWrite, ConflictError } from './store.js';
import { Provider } from './ai.js';
import { readPublicPage, searchWeb } from './research.js';
import { initialState } from './seed.js';
export function researchOperations(run: ResearchRun): Operation[] {
  if (!run.proposal) throw new Error('No proposal available.');
  const prefix = 'r' + run.id.slice(0, 8) + '-';
  const ids = new Map(
    run.proposal.operations.map((op) => [
      'id' in op.value ? op.value.id : '',
      prefix + ('id' in op.value ? op.value.id : '').slice(0, 65),
    ]),
  );
  const allowed = new Set(['task', 'note', 'project', 'gate', 'story']);
  const operations: Operation[] = run.proposal.operations.map((original) => {
    if (!allowed.has(original.kind))
      throw new Error(
        'Research plans may only propose tasks, notes, projects, gates and interview stories.',
      );
    const op: any = structuredClone(original);
    op.value.id = ids.get(op.value.id);
    if (op.kind === 'task') {
      op.value.status = 'todo';
      op.value.evidence = '';
      op.value.prerequisites = op.value.prerequisites.map((id: string) => ids.get(id) || id);
    }
    if (op.kind === 'project') {
      op.value.status = 'Planned';
      op.value.evidence = '';
    }
    if (op.kind === 'gate') {
      op.value.status = 'Not started';
      op.value.evidence = '';
    }
    return op;
  });
  for (const [i, source] of run.sources.entries())
    operations.push({
      kind: 'source',
      value: {
        id: prefix + 'source-' + i,
        ...source,
        checkedAt: localDay(),
        notes: 'Retrieved by the research workflow. Retrieval is not independent verification.',
      },
    });
  operations.push({
    kind: 'note',
    value: {
      id: prefix + 'audit',
      title: 'Research plan — ' + run.input.goal.slice(0, 150),
      category: 'Research plan',
      body: [
        run.proposal.summary,
        'Queries:',
        ...run.queries,
        'Retrieved evidence:',
        ...run.sources.map((s) => s.url),
        'Limits / failed requests:',
        ...run.warnings,
      ]
        .join('\n')
        .slice(0, 20000),
      tags: ['research', 'plan'],
      attachments: [],
      updatedAt: new Date().toISOString(),
    },
  });
  return operations;
}
export function plannedState(state: State, run: ResearchRun): State {
  let current = structuredClone(state);
  if (run.input.replaceStarter) {
    const seed = initialState();
    const template = new Set(seed.tasks.map((t) => t.id));
    const remove = new Set(
      current.tasks
        .filter(
          (t) =>
            template.has(t.id) &&
            t.status === 'todo' &&
            !t.evidence.trim() &&
            !current.sessions.some((s) => s.taskId === t.id),
        )
        .map((t) => t.id),
    );
    // Keep any starter required by a preserved record, transitively.
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of current.tasks)
        if (!remove.has(t.id))
          for (const dep of t.prerequisites) if (remove.delete(dep)) changed = true;
    }
    current.tasks = current.tasks.filter((t) => !remove.has(t.id));
    const gates = new Set(seed.gates.map((g) => g.id));
    current.gates = current.gates.filter(
      (g) => !(gates.has(g.id) && g.status === 'Not started' && !g.evidence.trim()),
    );
  }
  current = applyOperations(current, researchOperations(run));
  // Capacity is entered explicitly by the owner, not inferred by the model.
  current.profile.weeklyHours = run.input.weeklyHours;
  return parseState(current);
}
export class ResearchWorkflow {
  private runs = new Map<string, ResearchRun>();
  private active = '';
  private cancelled = new Set<string>();
  private ready: Promise<void>;
  private key = '';
  constructor(
    private store: Store,
    private provider: Provider,
    private dependencies = { search: searchWeb, read: readPublicPage },
  ) {
    this.ready = this.init();
  }
  private get folder() {
    return path.join(this.store.root, 'research-runs');
  }
  private async init() {
    await fs.mkdir(this.folder, { recursive: true, mode: 0o700 });
    for (const f of (await fs.readdir(this.folder))
      .filter((f) => /^[\w-]+\.json$/.test(f))
      .slice(-30)) {
      try {
        const run = researchRunSchema.parse(
          JSON.parse(await fs.readFile(path.join(this.folder, f), 'utf8')),
        );
        if (run.status === 'running') {
          run.status = 'interrupted';
          run.error = 'Server stopped during this run. Retry to resume with saved evidence.';
          await this.persist(run);
        }
        this.runs.set(run.id, run);
      } catch {
        /* Keep unreadable originals on disk, never replace with invented data. */
      }
    }
  }
  private async persist(run: ResearchRun) {
    run.updatedAt = new Date().toISOString();
    await atomicWrite(
      path.join(this.folder, run.id + '.json'),
      JSON.stringify(researchRunSchema.parse(run), null, 2),
    );
  }
  configureKey(key: string) {
    this.key = key;
  }
  settings() {
    return {
      engine:
        this.key || process.env.BRAVE_SEARCH_API_KEY
          ? 'Brave Search'
          : 'DuckDuckGo / Bing RSS (best effort)',
      keyAvailable: Boolean(this.key || process.env.BRAVE_SEARCH_API_KEY),
      busy: Boolean(this.active),
    };
  }
  async list() {
    await this.ready;
    return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async get(id: string) {
    await this.ready;
    const run = this.runs.get(id);
    if (!run) throw new Error('Research run not found.');
    return run;
  }
  async start(input: unknown) {
    await this.ready;
    if (this.active) throw new Error('A research workflow is already running. Wait or cancel it.');
    if (this.provider.info().type === 'disabled')
      throw new Error('Configure an AI provider in Settings before starting a research plan.');
    if (this.runs.size >= 30)
      throw new Error(
        'Research history limit reached (30). Archive the data folder before starting a separate workspace.',
      );
    const now = new Date().toISOString();
    const run: ResearchRun = {
      id: randomUUID(),
      input: researchInputSchema.parse(input),
      baseRevision: this.store.state.revision,
      status: 'running',
      stage: 'Preparing',
      createdAt: now,
      updatedAt: now,
      attempt: 1,
      queries: [],
      results: [],
      sources: [],
      warnings: [],
      error: '',
      proposal: null,
    };
    this.runs.set(run.id, run);
    this.active = run.id;
    try {
      await this.persist(run);
    } catch (e) {
      this.active = '';
      run.status = 'failed';
      throw e;
    }
    void this.execute(run, structuredClone(this.store.state)).catch(() => {
      run.status = 'failed';
      run.error =
        'Could not save workflow progress. Check disk space and preserve the data folder.';
      this.active = '';
    });
    return run;
  }
  async retry(id: string) {
    await this.ready;
    if (this.active) throw new Error('Another workflow is still running.');
    const run = await this.get(id);
    if (run.status === 'applied')
      throw new Error('This plan was already applied. Start a new refinement run.');
    run.attempt++;
    if (run.attempt > 100) throw new Error('Retry limit reached. Start a new run.');
    run.status = 'running';
    run.error = '';
    run.proposal = null;
    run.baseRevision = this.store.state.revision;
    this.cancelled.delete(id);
    this.active = id;
    try {
      await this.persist(run);
    } catch (e) {
      this.active = '';
      run.status = 'failed';
      throw e;
    }
    void this.execute(run, structuredClone(this.store.state)).catch(() => {
      run.status = 'failed';
      run.error =
        'Could not save workflow progress. Check disk space and preserve the data folder.';
      this.active = '';
    });
    return run;
  }
  async cancel(id: string) {
    const run = await this.get(id);
    if (run.status !== 'running') return run;
    this.cancelled.add(id);
    run.status = 'cancelled';
    run.stage = 'Cancelled; in-flight request may finish before stopping';
    await this.persist(run);
    return run;
  }
  private async execute(run: ResearchRun, snapshot: State) {
    const check = () => {
      if (this.cancelled.has(run.id)) throw new Error('Cancelled');
    };
    const stage = async (name: string) => {
      check();
      run.stage = name;
      await this.persist(run);
    };
    const warn = (s: string) => {
      run.warnings.push(s.slice(0, 1000));
      run.warnings = run.warnings.slice(-60);
    };
    try {
      if (!run.queries.length) {
        await stage('AI: form role-specific research queries');
        const q = await this.provider.queries(
          JSON.stringify({
            goal: run.input.goal,
            location: run.input.location,
            jd: run.input.jd.slice(0, 6000),
          }),
        );
        run.queries = q.queries.filter(
          (q) => !/[\w.+-]+@[\w.-]+\.[a-z]{2,}|github_pat_|sk-[a-zA-Z0-9]{12}/i.test(q),
        );
        if (!run.queries.length)
          throw new Error(
            'Generated queries contained sensitive identifiers. Revise the role request.',
          );
        await this.persist(run);
      }
      for (const query of run.sources.length >= 2 ? [] : run.queries) {
        await stage('Searching: ' + query.slice(0, 80));
        try {
          const results = await this.dependencies.search(
            query,
            this.key || process.env.BRAVE_SEARCH_API_KEY,
          );
          for (const r of results)
            if (!run.results.some((x) => x.url === r.url) && run.results.length < 15)
              run.results.push(r);
        } catch (e: any) {
          warn('Search: ' + e.message);
        }
        await this.persist(run);
      }
      const candidates = [
        ...new Set([...run.input.sourceUrls, ...run.results.map((r) => r.url)]),
      ].slice(0, 10);
      for (const url of candidates) {
        if (run.sources.length >= 6) break;
        if (run.sources.some((s) => s.url === url)) continue;
        await stage('Reading: ' + new URL(url).hostname);
        try {
          const s = await this.dependencies.read(url);
          if (s.excerpt.length < 120) throw new Error('Insufficient readable text.');
          run.sources.push(s);
        } catch (e: any) {
          warn(url + ': ' + e.message);
        }
        await this.persist(run);
      }
      if (!run.sources.length)
        throw new Error(
          'No source pages could be retrieved. Retry search or add authoritative source URLs. No evidence or plan was fabricated.',
        );
      await stage('AI: synthesize grounded plan and readiness criteria');
      const content = {
        goal: run.input.goal,
        baseline: run.input.baseline.slice(0, 4000),
        jd: run.input.jd.slice(0, 4000),
        location: run.input.location,
        weeklyHours: run.input.weeklyHours,
        limits: run.warnings.slice(-8),
        sources: run.sources.map((s) => ({ ...s, excerpt: s.excerpt.slice(0, 1500) })),
        instruction:
          'Use the fetched excerpts as evidence; URLs alone are not proof. Provide actionable role-specific tasks, notes, gates, interview stories and projects. Do not invent achievements.',
      };
      while (
        JSON.stringify(content).length > 19000 &&
        content.sources.some((s) => s.excerpt.length > 100)
      ) {
        for (const s of content.sources)
          s.excerpt = s.excerpt.slice(0, Math.max(100, Math.floor(s.excerpt.length / 2)));
      }
      const input = JSON.stringify(content);
      if (input.length > 20000)
        throw new Error('Research context too large; shorten the goal or source URLs.');
      run.proposal = await this.provider.propose(
        'career',
        input,
        snapshot,
        run.input.includeContext,
      );
      check();
      const citedText = [
        run.proposal.summary,
        ...run.proposal.operations.filter((op) => op.kind === 'note').map((op) => op.value.body),
      ].join('\n');
      if (!run.sources.some((source) => citedText.includes(source.url)))
        throw new Error(
          'The model omitted citations to retrieved evidence. No plan was applied. Retry with a stronger structured-output model.',
        );
      plannedState(snapshot, run);
      if (run.sources.length < 2)
        warn(
          'Only one source was readable. Treat this as low-confidence planning and verify with another independent primary source.',
        );
      run.status = 'ready';
      run.stage = 'Ready for review — no workspace changes applied';
      await this.persist(run);
    } catch (e: any) {
      if (!this.cancelled.has(run.id)) {
        run.status = 'failed';
        run.error = String(e.message).slice(0, 3000);
        run.stage = 'Failed — saved evidence retained for retry';
      }
      await this.persist(run);
    } finally {
      if (this.active === run.id) this.active = '';
    }
  }
  async apply(id: string, revision: number) {
    if (this.active)
      throw new Error('Wait for the current workflow to finish saving before applying.');
    const run = await this.get(id);
    if (run.status !== 'ready') throw new Error('Only a ready, unapplied plan can be applied.');
    if (revision !== this.store.state.revision || revision !== run.baseRevision)
      throw new ConflictError(
        'Workspace changed since this plan began. Regenerate against the current workspace before applying.',
      );
    const next = plannedState(this.store.state, run);
    await this.store.replace(revision, next);
    run.status = 'applied';
    run.stage = 'Applied with a workspace recovery point';
    await this.persist(run);
    return this.store.state;
  }
  async export() {
    return await this.list();
  }
  async import(input: unknown) {
    const list = researchRunSchema.array().max(30).parse(input);
    for (const old of list) {
      if (this.runs.has(old.id)) continue;
      const run = structuredClone(old);
      if (run.status !== 'applied') {
        run.status = 'interrupted';
        run.error = 'Restored research archive: regenerate against this workspace before applying.';
        run.proposal = null;
      }
      this.runs.set(run.id, run);
      await this.persist(run);
    }
  }
}
