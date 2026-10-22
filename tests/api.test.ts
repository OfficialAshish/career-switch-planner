import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { Store } from '../server/store.js';
import { Provider } from '../server/ai.js';
import { createApp } from '../server/app.js';
import { workbook, importWorkbook, guardXlsx, resumeDocx, resumeLatex } from '../server/exports.js';
import { initialState } from '../server/seed.js';

async function fixture(fn: (c: any) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'career-api-'));
  const store = new Store(root);
  await store.init();
  const provider = new Provider(root);
  await provider.init();
  const port = Number(process.env.TEST_PORT || 4399);
  const app = createApp(store, provider, port);
  const server = app.listen(port, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${port}`;
  const get = async (url: string) => fetch(base + '/api/' + url);
  const info = await (await get('state')).json();
  const post = (url: string, body: any, headers: any = {}) =>
    fetch(base + '/api/' + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Career-Token': info.csrf, ...headers },
      body: JSON.stringify(body),
    });
  try {
    await fn({ store, provider, get, post, base, root, info });
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await store.close();
    await rm(root, { recursive: true, force: true });
  }
}

test('local API blocks foreign hosts/origins and missing CSRF, validates revisions', async () =>
  fixture(async ({ get, post, base, info }: any) => {
    const http = await import('node:http');
    const spoofed = await new Promise<number>((resolve) => {
      http.get(base + '/api/state', { headers: { Host: 'evil.example' } }, (r) => {
        r.resume();
        resolve(r.statusCode!);
      });
    });
    assert.equal(spoofed, 403);
    assert.equal(
      (await fetch(base + '/api/state', { headers: { Origin: 'https://evil.example' } })).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + '/api/operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      403,
    );
    const operation = {
      kind: 'session',
      value: {
        id: 's1',
        date: '2026-10-22',
        minutes: 45,
        track: 'DSA',
        summary: 'Real test session',
        taskId: '',
      },
    };
    const saved = await post('operations', { revision: 0, operations: [operation] });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).revision, 1);
    assert.equal((await post('operations', { revision: 0, operations: [operation] })).status, 409);
    assert.equal((await post('research', { url: 'https://127.0.0.1/private' })).status, 400);
    assert.equal(
      (await post('ai', { mode: 'plan', text: 'plan', includeContext: false })).status,
      400,
    );
    assert.equal((await get('provider')).status, 200);
    assert.equal(typeof info.csrf, 'string');
  }));

test('Excel exchange round-trips values, rejects formulas and guards inflated ZIP', async () => {
  const s = initialState();
  const buffer = await workbook(s);
  guardXlsx(buffer);
  const same = await importWorkbook(buffer, s);
  assert.equal(same.operations.length, 0);
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(buffer as any);
  w.getWorksheet('Tasks')!.getCell('B2').value = 'Changed task';
  const updated = await importWorkbook(Buffer.from(await w.xlsx.writeBuffer()), s);
  assert.equal(updated.operations.length, 1);
  assert.equal(updated.operations[0].kind, 'task');
  w.getWorksheet('Tasks')!.getCell('B2').value = { formula: '1+1', result: 2 };
  const formulas = Buffer.from(await w.xlsx.writeBuffer());
  await assert.rejects(() => importWorkbook(formulas, s));
  const bad = Buffer.from(buffer);
  let at = -1;
  for (let i = 0; i < bad.length - 4; i++)
    if (bad.readUInt32LE(i) === 0x02014b50) {
      at = i;
      break;
    }
  bad.writeUInt32LE(99_000_000, at + 24);
  assert.throws(() => guardXlsx(bad));
  assert.ok((await resumeDocx(s, false)).length > 1000);
  assert.ok(resumeLatex(s, true).includes('FUTURE-STATE'));
});

test('portable backup includes images, remaps safely and restores with a new revision', async () =>
  fixture(async ({ post, get, store }: any) => {
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=';
    const image = await (await post('images', { base64: png })).json();
    assert.ok(image.id);
    await post('operations', {
      revision: 0,
      operations: [
        {
          kind: 'note',
          value: {
            id: 'note1',
            title: 'Synthetic image',
            category: 'Learning',
            body: 'Test',
            tags: [],
            attachments: [image.id],
            updatedAt: '2026-10-22',
          },
        },
      ],
    });
    const backup = await (await get('backup')).json();
    assert.equal(Object.keys(backup.images).length, 1);
    assert.equal((await post('import-backup/preview', backup)).status, 200);
    const restored = await (await post('import-backup/apply', { revision: 1, backup })).json();
    assert.equal(restored.revision, 2);
    assert.notEqual(restored.notes[0].attachments[0], image.id);
    assert.equal((await get('images/' + restored.notes[0].attachments[0])).status, 200);
    assert.equal(
      (await post('images', { base64: Buffer.from('<svg/>').toString('base64') })).status,
      400,
    );
    assert.equal((await post('restore', { revision: 2, file: '../../secret' })).status, 400);
    assert.equal(store.state.notes.length, 1);
  }));

test('AI key is memory-only and returned proposals never mutate the store', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'career-ai-'));
  const provider = new Provider(root);
  let seen: any;
  let disallowedKind = false;
  const { createServer } = await import('node:http');
  const mock = createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      seen = JSON.parse(body);
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          message: {
            content: JSON.stringify({
              summary: 'A synthetic note',
              operations: disallowedKind
                ? [{ kind: 'profile', value: initialState().profile }]
                : [
                    {
                      kind: 'note',
                      value: {
                        id: 'mock-note',
                        title: 'Mock',
                        category: 'Test',
                        body: 'Synthetic response',
                        tags: [],
                        attachments: [],
                        updatedAt: '2026-10-22',
                      },
                    },
                  ],
            }),
          },
        }),
      );
    });
  });
  mock.listen(0, '127.0.0.1');
  await new Promise<void>((r) => mock.once('listening', r));
  try {
    await provider.configure({
      type: 'ollama',
      endpoint: `http://127.0.0.1:${(mock.address() as any).port}`,
      model: 'mock',
      apiKey: 'synthetic-test-key',
    });
    assert.ok(
      !(await readFile(path.join(root, 'provider.json'), 'utf8')).includes('synthetic-test-key'),
    );
    assert.ok(!JSON.stringify(provider.info()).includes('synthetic-test-key'));
    const state = initialState();
    const proposal = await provider.propose('log', '30 min Python', state, false);
    assert.equal(proposal.operations.length, 1);
    assert.equal(state.notes.length, 0);
    assert.ok(!seen.messages[1].content.includes(state.tasks[0].title));
    disallowedKind = true;
    await assert.rejects(
      provider.propose('plan', 'Change my profile', state, false),
      /safe edit schema/,
    );
  } finally {
    await new Promise<void>((r) => mock.close(() => r()));
    await rm(root, { recursive: true, force: true });
  }
});

test('manual deletion creates recovery points, rejects references and invalid attachments', async () =>
  fixture(async ({ post, get }: any) => {
    const task = (await (await get('state')).json()).state.tasks[0];
    assert.equal(
      (await post('delete', { revision: 0, collection: 'tasks', id: task.id })).status,
      400,
    );
    assert.equal(
      (
        await post('operations', {
          revision: 0,
          operations: [
            {
              kind: 'note',
              value: {
                id: 'bad-image',
                title: 'Missing image',
                category: 'Test',
                body: '',
                tags: [],
                attachments: ['missing-image'],
                updatedAt: '2026-10-22',
              },
            },
          ],
        })
      ).status,
      400,
    );
    const session = {
      kind: 'session',
      value: {
        id: 'remove-me',
        date: '2026-10-22',
        minutes: 10,
        track: 'Backend',
        summary: 'Synthetic removable session',
        taskId: '',
      },
    };
    assert.equal((await post('operations', { revision: 0, operations: [session] })).status, 200);
    assert.equal(
      (await post('delete', { revision: 1, collection: 'sessions', id: 'remove-me' })).status,
      200,
    );
    const result = await (await get('state')).json();
    assert.equal(result.state.sessions.length, 0);
    assert.equal(result.state.revision, 2);
    assert.ok((await (await get('backups')).json()).length >= 2);
  }));
