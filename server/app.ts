import { syllabusImport, starterTopics } from '../shared/syllabus.js';
import { reconcileWorkbook } from './workbook-import.js';
import express from 'express';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { z } from 'zod';
import { Store, ConflictError } from './store.js';
import { Provider } from './ai.js';
import { quickLog } from './quick-log.js';
import { readPublicPage } from './research.js';
import { workbook, importWorkbook, resumeDocx, resumeLatex } from './exports.js';
import { saveImage, findImage, imageExtension } from './attachments.js';
import { applyOperations, operationSchema, parseState, id, type State } from '../shared/schema.js';
import { planning, localDay } from '../shared/planner.js';
import { modes } from '../shared/prompts.js';
import { LatexCompiler } from './latex.js';
import { ResearchWorkflow } from './research-workflow.js';
import { resumeDocumentSchema } from '../shared/schema.js';
import { researchRunSchema } from '../shared/research-contract.js';

export function createApp(
  store: Store,
  provider: Provider,
  port: number,
  webRoot = path.resolve('dist/web'),
) {
  const app = express(),
    csrf = randomBytes(32).toString('hex');
  const compiler = new LatexCompiler(store.root);
  const workflow = new ResearchWorkflow(store, provider);
  app.disable('x-powered-by');
  const allowed = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  app.use((req, res, next) => {
    if (!allowed.has(req.headers.host || ''))
      return res.status(403).json({ error: 'Use the local server URL.' });
    const origin = req.headers.origin;
    if (origin && !allowed.has(origin.replace(/^http:\/\//, '')))
      return res.status(403).json({ error: 'Foreign origin blocked.' });
    if (req.headers['sec-fetch-site'] === 'cross-site')
      return res.status(403).json({ error: 'Cross-site requests blocked.' });
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; worker-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    if (req.path.startsWith('/api')) {
      res.set('Cache-Control', 'no-store');
      if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-career-token'] !== csrf)
        return res.status(403).json({ error: 'Missing local request token. Reload this page.' });
    }
    next();
  });
  app.use(express.json({ limit: '30mb', strict: true }));
  const expected = z.number().int().nonnegative();
  const ops = z.array(operationSchema).min(1).max(1000);
  app.get('/api/state', (_req, res) =>
    res.json({ state: store.state, plan: planning(store.state), csrf, notice: store.notice }),
  );
  app.post('/api/operations', async (req, res) => {
    const b = z.object({ revision: expected, operations: ops }).strict().parse(req.body);
    const next = applyOperations(store.state, b.operations);
    for (const key of new Set(next.notes.flatMap((n) => n.attachments)))
      await findImage(store.root, key);
    res.json(await store.replace(b.revision, next));
  });
  app.post('/api/delete', async (req, res) => {
    const b = z
      .object({
        revision: expected,
        collection: z.enum([
          'topics',
          'promptTemplates',
          'resumeDocuments',
          'tasks',
          'sessions',
          'attempts',
          'notes',
          'projects',
          'claims',
          'stories',
          'jobs',
          'sources',
          'gates',
        ]),
        id,
      })
      .strict()
      .parse(req.body);
    const next = structuredClone(store.state);
    const list = next[b.collection] as { id: string }[];
    const at = list.findIndex((r) => r.id === b.id);
    if (at < 0) throw new Error('Record no longer exists.');
    list.splice(at, 1);
    // References are not silently removed. Dependent tasks/sessions must be edited first.
    res.json(await store.replace(b.revision, parseState(next)));
  });
  app.post('/api/quick-log', (req, res) => {
    const b = z.object({ text: z.string().max(5000), date: z.string().optional() }).parse(req.body);
    res.json(quickLog(b.text, b.date || localDay(), store.state));
  });
  app.post('/api/syllabus/import', (req, res) => {
    const b = z
      .object({ markdown: z.string().max(2_000_000) })
      .strict()
      .parse(req.body);
    res.json(syllabusImport(b.markdown, store.state));
  });
  app.post('/api/syllabus/generate', async (req, res) => {
    const b = z
      .object({ prompt: z.string().min(1).max(60000) })
      .strict()
      .parse(req.body);
    res.json(await provider.syllabus(b.prompt, store.state));
  });
  app.get('/api/syllabus/starter', (_req, res) =>
    res.json({
      summary:
        'Add generic Python/backend/AI starter topics. Adapt to your role; no progress is recorded.',
      operations: starterTopics(store.state).map((value) => ({ kind: 'topic', value })),
    }),
  );
  app.get('/api/provider', (_req, res) => res.json(provider.info()));
  app.post('/api/provider', async (req, res) => {
    const b = z
      .object({
        type: z.enum(['disabled', 'ollama', 'compatible']),
        endpoint: z.string().max(2048),
        model: z.string().max(300),
        apiKey: z.string().max(4096).optional(),
        clearKey: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    await provider.configure(b);
    res.json(provider.info());
  });
  app.post('/api/ai', async (req, res) => {
    const b = z
      .object({
        mode: z.enum(Object.keys(modes) as [keyof typeof modes, ...(keyof typeof modes)[]]),
        text: z.string().min(1).max(20000),
        includeContext: z.boolean(),
      })
      .strict()
      .parse(req.body);
    const proposal = await provider.propose(b.mode, b.text, store.state, b.includeContext);
    applyOperations(store.state, proposal.operations);
    res.json(proposal);
  });
  let researchBusy = false;
  app.post('/api/research', async (req, res) => {
    if (researchBusy)
      return res.status(429).json({ error: 'A source request is already running.' });
    const b = z
      .object({ url: z.string().url().max(2048) })
      .strict()
      .parse(req.body);
    researchBusy = true;
    try {
      res.json(await readPublicPage(b.url));
    } finally {
      researchBusy = false;
    }
  });
  app.get('/api/latex/status', async (_req, res) => res.json(await compiler.info()));
  app.post('/api/latex/install', async (req, res) => {
    z.object({ consent: z.literal(true) })
      .strict()
      .parse(req.body);
    res.json(await compiler.install());
  });
  app.post('/api/latex/document', async (req, res) => {
    const b = z
      .object({ revision: expected, document: resumeDocumentSchema })
      .strict()
      .parse(req.body);
    const next = structuredClone(store.state);
    const index = next.resumeDocuments.findIndex((d) => d.id === b.document.id);
    if (index < 0) next.resumeDocuments.push(b.document);
    else next.resumeDocuments[index] = b.document;
    res.json(await store.replace(b.revision, parseState(next)));
  });
  app.post('/api/latex/compile', async (req, res) => {
    const b = z
      .object({
        source: z.string().min(1).max(200000),
        trusted: z.literal(true),
        allowNetwork: z.boolean(),
      })
      .strict()
      .parse(req.body);
    res.json(await compiler.compile(b.source, b.allowNetwork));
  });
  app.get('/api/research-runs', async (_req, res) =>
    res.json({ runs: await workflow.list(), search: workflow.settings() }),
  );
  app.post('/api/research-runs/start', async (req, res) =>
    res.status(202).json(await workflow.start(req.body)),
  );
  app.post('/api/research-runs/search-settings', (req, res) => {
    const b = z
      .object({ key: z.string().max(1000) })
      .strict()
      .parse(req.body);
    workflow.configureKey(b.key);
    res.json(workflow.settings());
  });
  app.post('/api/research-runs/retry', async (req, res) => {
    const b = z.object({ id: z.string().uuid() }).strict().parse(req.body);
    res.status(202).json(await workflow.retry(b.id));
  });
  app.post('/api/research-runs/cancel', async (req, res) => {
    const b = z.object({ id: z.string().uuid() }).strict().parse(req.body);
    res.json(await workflow.cancel(b.id));
  });
  app.post('/api/research-runs/apply', async (req, res) => {
    const b = z.object({ id: z.string().uuid(), revision: expected }).strict().parse(req.body);
    res.json(await workflow.apply(b.id, b.revision));
  });
  async function portableImages(state: State) {
    const images: Record<string, string> = {};
    let size = 0;
    for (const key of new Set(state.notes.flatMap((n) => n.attachments))) {
      const bytes = await fs.readFile(await findImage(store.root, key));
      size += bytes.length;
      if (size > 18 * 1024 * 1024)
        throw new Error('Images exceed portable limit. Copy the stopped data folder instead.');
      images[key] = bytes.toString('base64');
    }
    return images;
  }
  app.get('/api/export.xlsx', async (_req, res) =>
    res
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .attachment('career-tracker.xlsx')
      .send(
        await workbook(store.state, {
          images: await portableImages(store.state),
          researchRuns: await workflow.export(),
        }),
      ),
  );
  const workbookBody = z.object({ base64: z.string().max(16_000_000) }).strict();
  async function readWorkbook(base64: string) {
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length > 10 * 1024 * 1024) throw new Error('Workbook maximum 10 MB.');
    const result = await reconcileWorkbook(bytes, store.state);
    if (result.portable) {
      // Preserve current local assets when the baseline came from an older export.
      const images = result.transfer
        ? result.portable.images
        : { ...result.portable.images, ...(await portableImages(store.state)) };
      result.portable = parseBackup({
        format: 'career-switch-planner',
        version: 1,
        state: result.state,
        images,
        researchRuns: result.portable.researchRuns || [],
      });
    }
    return result;
  }
  app.post('/api/workbook/preview', async (req, res) => {
    const b = workbookBody.parse(req.body),
      r = await readWorkbook(b.base64);
    res.json({
      summary: r.summary,
      changes: r.changes,
      warnings: r.warnings,
      transfer: !!r.transfer,
    });
  });
  app.post('/api/workbook/apply', async (req, res) => {
    const b = workbookBody
      .extend({ revision: expected, confirmReplacement: z.boolean().default(false) })
      .parse(req.body);
    if (b.revision !== store.state.revision)
      throw new ConflictError('Workspace changed. Preview the workbook again.');
    const result = await readWorkbook(b.base64);
    if (result.transfer && !b.confirmReplacement)
      throw new Error('Confirm full replacement when importing a different workspace.');
    let next: State;
    if (result.legacy) next = applyOperations(store.state, result.legacy.operations);
    else {
      next = result.state!;
      const assetMap = new Map<string, string>();
      for (const [key, value] of Object.entries(result.portable.images as Record<string, string>))
        assetMap.set(key, await saveImage(store.root, Buffer.from(value, 'base64')));
      next.notes.forEach((n) => (n.attachments = n.attachments.map((k) => assetMap.get(k)!)));
    }
    // Validate before saving, including every referenced image.
    for (const key of new Set(next.notes.flatMap((n) => n.attachments)))
      await findImage(store.root, key);
    const saved = await store.replace(b.revision, parseState(next));
    if (result.portable)
      try {
        await workflow.import(result.portable.researchRuns);
      } catch {
        store.notice =
          'Workbook data saved; auxiliary research archive could not be restored. Keep the workbook.';
      }
    res.json(saved);
  });
  app.post('/api/import-xlsx', async (req, res) => {
    const b = z
      .object({ base64: z.string().max(16_000_000) })
      .strict()
      .parse(req.body);
    const buffer = Buffer.from(b.base64, 'base64');
    if (buffer.length > 10 * 1024 * 1024) throw new Error('Workbook maximum 10 MB.');
    res.json(await importWorkbook(buffer, store.state));
  });
  app.get('/api/resume.docx', async (req, res) =>
    res
      .type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .attachment('resume.docx')
      .send(await resumeDocx(store.state, req.query.future === 'true')),
  );
  app.get('/api/resume.tex', (req, res) =>
    res
      .type('text/plain')
      .attachment('resume.tex')
      .send(resumeLatex(store.state, req.query.future === 'true')),
  );
  app.post('/api/images', async (req, res) => {
    const b = z
      .object({ base64: z.string().max(7_000_000) })
      .strict()
      .parse(req.body);
    res.json({ id: await saveImage(store.root, Buffer.from(b.base64, 'base64')) });
  });
  app.get('/api/images/:id', async (req, res) => {
    const f = await findImage(store.root, id.parse(req.params.id));
    res.sendFile(f);
  });
  app.get('/api/backup', async (_req, res) => {
    const images: Record<string, string> = {};
    const keys = new Set(store.state.notes.flatMap((n) => n.attachments));
    let size = 0;
    for (const key of keys) {
      const b = await fs.readFile(await findImage(store.root, key));
      size += b.length;
      if (size > 18 * 1024 * 1024)
        throw new Error(
          'Portable backup exceeds 18 MB images; copy the data folder while the server is stopped instead.',
        );
      images[key] = b.toString('base64');
    }
    const backup = {
      format: 'career-switch-planner',
      version: 1,
      state: store.state,
      images,
      researchRuns: await workflow.export(),
    };
    if (Buffer.byteLength(JSON.stringify(backup)) > 28 * 1024 * 1024)
      throw new Error('Portable backup exceeds 28 MB. Copy the stopped data folder instead.');
    res.attachment('workspace.career.json').json(backup);
  });
  function parseBackup(input: any) {
    const b = z
      .object({
        researchRuns: researchRunSchema.array().max(30).default([]),
        format: z.literal('career-switch-planner'),
        version: z.literal(1),
        state: z.unknown(),
        images: z.record(z.string(), z.string().max(7_000_000)),
      })
      .strict()
      .parse(input);
    const state = parseState(b.state);
    let total = 0;
    for (const [key, value] of Object.entries(b.images)) {
      id.parse(key);
      const buffer = Buffer.from(value, 'base64');
      total += buffer.length;
      if (buffer.length > 5 * 1024 * 1024 || total > 18 * 1024 * 1024)
        throw new Error('Backup image limit exceeded.');
      imageExtension(buffer);
    }
    for (const key of state.notes.flatMap((n) => n.attachments))
      if (!b.images[key]) throw new Error('Backup is missing an attached image.');
    return { state, images: b.images, researchRuns: b.researchRuns };
  }
  app.post('/api/import-backup/preview', (req, res) => {
    const b = parseBackup(req.body);
    res.json({
      summary: `Replace workspace with ${b.state.tasks.length} tasks, ${b.state.sessions.length} sessions, ${b.state.notes.length} notes and ${Object.keys(b.images).length} images. Your current workspace is backed up first.`,
      revision: b.state.revision,
    });
  });
  app.post('/api/import-backup/apply', async (req, res) => {
    const body = z.object({ revision: expected, backup: z.unknown() }).strict().parse(req.body);
    const b = parseBackup(body.backup);
    if (body.revision !== store.state.revision)
      throw new ConflictError('Workspace changed. Preview the import again.');
    // Remap image IDs so an import cannot overwrite images referenced by an older backup.
    const map = new Map<string, string>();
    for (const [key, value] of Object.entries(b.images))
      map.set(key, await saveImage(store.root, Buffer.from(value, 'base64')));
    b.state.notes.forEach((n) => (n.attachments = n.attachments.map((k) => map.get(k)!)));
    const restored = await store.replace(body.revision, b.state);
    try {
      await workflow.import(b.researchRuns);
    } catch {
      store.notice =
        'Workspace restored, but auxiliary research history could not be restored. Keep the original backup file.';
    }
    res.json(restored);
  });
  app.get('/api/backups', async (_req, res) => res.json(await store.backups()));
  app.post('/api/restore', async (req, res) => {
    const b = z
      .object({ revision: expected, file: z.string().regex(/^revision-\d+-\d+\.json$/) })
      .strict()
      .parse(req.body);
    const next = parseState(
      JSON.parse(await fs.readFile(path.join(store.root, 'backups', b.file), 'utf8')),
    );
    res.json(await store.replace(b.revision, next));
  });
  app.use(express.static(webRoot, { index: 'index.html', dotfiles: 'deny' }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route.' }));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(webRoot, 'index.html')));
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status =
      err instanceof ConflictError
        ? 409
        : err instanceof z.ZodError
          ? 400
          : err.status === 413
            ? 413
            : 400;
    // Do not log request bodies, provider responses, credentials or raw validation input.
    res.status(status).json({
      error:
        err instanceof z.ZodError
          ? err.issues
              .slice(0, 4)
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; ')
          : String(err.message || 'Operation failed').slice(0, 600),
    });
  });
  return app;
}
