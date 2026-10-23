import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { initialState } from '../server/seed.js';
import { workbook } from '../server/exports.js';
import { reconcileWorkbook } from '../server/workbook-import.js';
import { parseState, applyOperations } from '../shared/schema.js';
import { syllabusImport, syllabusPrompt } from '../shared/syllabus.js';
const bytes = async (w: ExcelJS.Workbook) => Buffer.from(await w.xlsx.writeBuffer());
async function book(state = initialState()) {
  const w = new ExcelJS.Workbook();
  await w.xlsx.load((await workbook(state)) as any);
  return w;
}
function envelope(state = initialState()) {
  return {
    format: 'career-syllabus',
    version: 1,
    baseRevision: state.revision,
    summary: 'New learning batch; links are suggestions.',
    operations: [
      {
        kind: 'topic',
        value: {
          ...state.topics[0],
          id: 'new-topic',
          title: 'Functions practice',
          prerequisites: [],
        },
      },
    ],
  };
}
const markdown = (p: unknown) =>
  '# Proposed syllabus\n\n```career-syllabus\n' + JSON.stringify(p) + '\n```\n';

test('old backups default new collections and starter curriculum has no fabricated progress', () => {
  const state = initialState();
  const old: any = structuredClone(state);
  delete old.topics;
  delete old.promptTemplates;
  assert.deepEqual(parseState(old).topics, []);
  assert.ok(state.topics.length >= 15);
  assert.ok(state.topics.every((t) => t.status === 'Not started' && !t.evidence));
  assert.ok(state.topics.some((t) => t.area === 'System design'));
  assert.ok(state.topics.some((t) => t.area === 'AI / chatbots'));
  assert.ok(
    state.topics.find((t) => t.id === 'dsa-reason')!.prerequisites.includes('py-functions'),
  );
  state.profile.email = 'private-contact@example.test';
  assert.ok(!syllabusPrompt(state).includes(state.profile.email));
});
test('syllabus Markdown validates new work, rejects stale/duplicate/unsafe/malformed operations', () => {
  const state = initialState(),
    p = envelope(state);
  const result = syllabusImport(markdown(p), state);
  assert.equal(result.operations.length, 1);
  assert.equal(applyOperations(state, result.operations).topics.length, state.topics.length + 1);
  assert.throws(() => syllabusImport(markdown({ ...p, baseRevision: 2 }), state), /changed/);
  assert.throws(() => syllabusImport(markdown(p) + markdown(p), state), /exactly one/);
  const bad = structuredClone(p);
  bad.operations[0].value.status = 'Explain-ready';
  assert.throws(() => syllabusImport(markdown(bad), state), /unstarted/);
  const duplicate = structuredClone(p);
  duplicate.operations[0].value.id = state.topics[0].id;
  assert.throws(() => syllabusImport(markdown(duplicate), state), /NEW topic/);
  assert.throws(
    () =>
      syllabusImport(
        markdown({ ...p, operations: [{ kind: 'profile', value: state.profile }] }),
        state,
      ),
    /only topic/,
  );
  assert.throws(
    () => syllabusImport(markdown({ ...p, operations: [...p.operations, ...p.operations] }), state),
    /Duplicate/,
  );
});
test('syllabus rejects dangling links, dependency cycles and executable resource URLs', () => {
  const state = initialState(),
    p = envelope(state);
  p.operations[0].value.taskId = 'missing';
  assert.throws(() => syllabusImport(markdown(p), state), /linked task/);
  p.operations[0].value.taskId = '';
  p.operations[0].value.prerequisites = ['new-topic'];
  assert.throws(() => syllabusImport(markdown(p), state), /cycle/);
  p.operations[0].value.prerequisites = [];
  p.operations[0].value.resources[0].url = 'javascript:alert(1)';
  assert.throws(() => syllabusImport(markdown(p), state));
});
test('complete workbook roundtrip includes all records, profile, resources and long source/prompts', async () => {
  const state = initialState();
  state.resumeDocuments = [
    { id: 'latex', title: 'My source', source: '%' + 'hello α\n'.repeat(12000), updatedAt: 'now' },
  ];
  state.promptTemplates = [
    { id: 'prompt', title: 'Custom prompt', body: 'x'.repeat(60000), updatedAt: 'now' },
  ];
  const data = await workbook(state, { images: {}, researchRuns: [] });
  const result = await reconcileWorkbook(data, state);
  assert.ok(result.state);
  assert.deepEqual(result.state, state);
  assert.equal(result.changes.length, 0);
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(data as any);
  assert.equal(w.worksheets[0].name, 'Dashboard');
  assert.ok(w.getWorksheet('Resume source')!.rowCount > 3);
  assert.equal(w.getWorksheet('__Portable')!.state, 'veryHidden');
  assert.ok(w.getWorksheet('Dashboard')!.getCell('B4').formula.includes('SUM'));
});
test('workbook three-way merge preserves concurrent app changes and rejects overlapping edits', async () => {
  const state = initialState(),
    w = await book(state);
  w.getWorksheet('Syllabus')!.getCell('H2').value = 'Learning';
  const current = structuredClone(state);
  current.revision = 1;
  current.tasks[0].title = 'An app-only change';
  const result = await reconcileWorkbook(await bytes(w), current);
  assert.equal(result.state!.topics[0].status, 'Learning');
  assert.equal(result.state!.tasks[0].title, 'An app-only change');
  current.topics[0].status = 'Practicing';
  await assert.rejects(() => bytes(w).then((b) => reconcileWorkbook(b, current)), /Conflict/);
});
test('workbook edits profile, links, chunked source and prompts without source transformations', async () => {
  const state = initialState();
  state.resumeDocuments = [
    {
      id: 'tex',
      title: 'Original',
      source: '\\documentclass{article}\n% UTF8 α\n',
      updatedAt: 'now',
    },
  ];
  state.promptTemplates = [{ id: 'p', title: 'Prompt', body: 'Plan carefully', updatedAt: 'now' }];
  const w = await book(state),
    profile = w.getWorksheet('Profile')!;
  profile.eachRow((row, i) => {
    if (row.getCell(1).value === 'weeklyHours') profile.getCell(i, 2).value = 30;
  });
  w.getWorksheet('Resources')!.getCell('C2').value = 'Updated resource title';
  w.getWorksheet('Resume source')!.getCell('D2').value = '\\documentclass{article}\n% changed α\n';
  w.getWorksheet('Prompts')!.getCell('D2').value = 'Changed prompt';
  const result = await reconcileWorkbook(await bytes(w), state);
  assert.equal(result.state!.profile.weeklyHours, 30);
  assert.equal(result.state!.topics[0].resources[0].title, 'Updated resource title');
  assert.equal(result.state!.resumeDocuments[0].source, '\\documentclass{article}\n% changed α\n');
  assert.equal(result.state!.promptTemplates[0].body, 'Changed prompt');
});
test('explicit workbook deletions are validated, missing rows retained and formula payloads rejected', async () => {
  const state = initialState(),
    w = await book(state);
  w.getWorksheet('Sources')!.addRow([
    'source',
    'Test',
    'https://example.com/',
    'excerpt',
    '2026-10-01',
    '',
  ]);
  let r = await reconcileWorkbook(await bytes(w), state);
  assert.equal(r.state!.sources.length, 1);
  const current = r.state!;
  const w2 = await book(current);
  w2.getWorksheet('Sources')!.getCell('G2').value = 'YES';
  r = await reconcileWorkbook(await bytes(w2), current);
  assert.equal(r.state!.sources.length, 0);
  w2.getWorksheet('Sources')!.spliceRows(2, 1);
  r = await reconcileWorkbook(await bytes(w2), current);
  assert.equal(r.state!.sources.length, 1);
  w2.getWorksheet('Tasks')!.getCell('B2').value = { formula: 'HYPERLINK("https://evil.test")' };
  await assert.rejects(() => bytes(w2).then((b) => reconcileWorkbook(b, current)), /formulas/);
  const w3 = await book(state);
  w3.getWorksheet('Tasks')!.getCell('J2').value = 'YES';
  await assert.rejects(
    () => bytes(w3).then((b) => reconcileWorkbook(b, state)),
    /prerequisite|linked/,
  );
});
test('workbook rejects duplicate IDs, invalid resources and damaged chunk sequencing', async () => {
  const state = initialState(),
    w = await book(state);
  w.getWorksheet('Syllabus')!.getCell('A3').value = state.topics[0].id;
  await assert.rejects(() => bytes(w).then((b) => reconcileWorkbook(b, state)), /duplicate ID/);
  const w2 = await book(state);
  w2.getWorksheet('Resources')!.getCell('D2').value = 'file:///etc/passwd';
  await assert.rejects(() => bytes(w2).then((b) => reconcileWorkbook(b, state)));
  const w3 = await book(state);
  w3.getWorksheet('Resume source')!.addRow(['t', 'T', 2, 'text', 'now']);
  await assert.rejects(() => bytes(w3).then((b) => reconcileWorkbook(b, state)), /consecutive/);
});

test('foreign workbooks clone all unchanged records, not just rows edited since export', async () => {
  const original = initialState();
  original.notes.push({
    id: 'my-note',
    title: 'Retain me',
    category: 'Learning',
    body: 'body',
    tags: [],
    attachments: [],
    updatedAt: 'now',
  });
  original.resumeDocuments.push({
    id: 'source',
    title: 'Source',
    source: 'x'.repeat(29999) + '😀' + 'y'.repeat(29999) + '😀',
    updatedAt: 'now',
  });
  const result = await reconcileWorkbook(await workbook(original), initialState());
  assert.equal(result.transfer, true);
  assert.equal(result.state!.notes[0].title, 'Retain me');
  assert.equal(result.state!.resumeDocuments[0].source, original.resumeDocuments[0].source);
  assert.equal(result.state!.workspaceId, original.workspaceId);
});

test('external syllabus can add planned deliverables and gates but cannot invent achievements', () => {
  const state = initialState();
  const p: any = envelope(state);
  p.operations.push({
    kind: 'project',
    value: {
      id: 'role-project',
      title: 'Portfolio exercise',
      status: 'Planned',
      summary: 'Build and explain a role-specific artifact',
      evidence: '',
      nextAction: 'Scope a small first step',
    },
  });
  p.operations.push({
    kind: 'gate',
    value: {
      id: 'role-gate',
      area: 'Role assessment',
      criteria: 'Demonstrate an unfamiliar exercise and defend choices',
      status: 'Not started',
      evidence: '',
    },
  });
  p.operations.push({
    kind: 'story',
    value: {
      id: 'role-drill',
      title: 'Practice',
      prompt: 'Tell me about a relevant problem',
      body: '[Actual situation and personal contribution]',
      followups: ['What did you own?'],
    },
  });
  assert.equal(syllabusImport(markdown(p), state).operations.length, 4);
  p.operations[1].value.status = 'Evidence ready';
  assert.throws(() => syllabusImport(markdown(p), state), /Planned/);
  p.operations[1].value.status = 'Planned';
  p.operations[2].value.id = state.gates[0].id;
  assert.throws(() => syllabusImport(markdown(p), state), /NEW IDs/);
});

test('prompt includes bounded saved baseline while excluding contact fields and raw evidence', () => {
  const state = initialState();
  state.profile.summary = 'A synthetic Python developer';
  state.profile.email = 'never-include@example.test';
  state.tasks[0].evidence = 'private raw evidence';
  const prompt = syllabusPrompt(state);
  assert.ok(prompt.includes(state.profile.summary));
  assert.ok(!prompt.includes(state.profile.email));
  assert.ok(!prompt.includes(state.tasks[0].evidence));
  assert.ok(prompt.length < 60000);
});

test('weekly dashboard uses numeric spreadsheet dates and source preserves CRLF exactly', async () => {
  const state = initialState();
  state.sessions.push({
    id: 'weekly',
    date: '2026-10-22',
    minutes: 45,
    track: 'DSA',
    summary: 'Known date fixture',
    taskId: '',
  });
  state.resumeDocuments.push({
    id: 'crlf',
    title: 'Exact CRLF',
    source: '\\documentclass{article}\r\n% exact bytes\r\n',
    updatedAt: 'now',
  });
  const w = await book(state);
  assert.ok(w.getWorksheet('Sessions')!.getCell('B2').value instanceof Date);
  assert.equal(w.getWorksheet('Sessions')!.getCell('B2').numFmt, 'yyyy-mm-dd');
  assert.ok(!w.getWorksheet('Dashboard')!.getCell('B5').formula.includes('TEXT('));
  const result = await reconcileWorkbook(await bytes(w), state);
  assert.equal(result.state!.sessions[0].date, state.sessions[0].date);
  assert.equal(result.state!.resumeDocuments[0].source, state.resumeDocuments[0].source);
  assert.equal(result.changes.length, 0);
});
