import { isDeepStrictEqual } from 'node:util';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { randomUUID } from 'node:crypto';
import { applyOperations, proposalSchema, type State, type Operation } from '../shared/schema.js';
import { planning, localDay, nextReview } from '../shared/planner.js';

export const tables = [
  [
    'Tasks',
    'task',
    'tasks',
    [
      'id',
      'title',
      'track',
      'estimateMinutes',
      'status',
      'prerequisites',
      'evidence',
      'priority',
      'createdAt',
    ],
  ],
  ['Sessions', 'session', 'sessions', ['id', 'date', 'minutes', 'track', 'summary', 'taskId']],
  [
    'Practice',
    'question',
    'questions',
    [
      'id',
      'number',
      'kind',
      'title',
      'pattern',
      'difficulty',
      'url',
      'fallback',
      'status',
      'notes',
    ],
  ],
  [
    'Attempts',
    'attempt',
    'attempts',
    ['id', 'questionId', 'date', 'result', 'minutes', 'notes', 'language'],
  ],
  [
    'Notes',
    'note',
    'notes',
    ['id', 'title', 'category', 'body', 'tags', 'attachments', 'updatedAt'],
  ],
  [
    'Projects',
    'project',
    'projects',
    ['id', 'title', 'status', 'summary', 'evidence', 'nextAction'],
  ],
  ['Claims', 'claim', 'claims', ['id', 'text', 'category', 'status', 'evidence']],
  ['Interview', 'story', 'stories', ['id', 'title', 'prompt', 'body', 'followups']],
  [
    'Applications',
    'job',
    'jobs',
    ['id', 'company', 'role', 'url', 'location', 'stage', 'jd', 'notes', 'nextAction'],
  ],
  ['Sources', 'source', 'sources', ['id', 'title', 'url', 'excerpt', 'checkedAt', 'notes']],
  ['Readiness', 'gate', 'gates', ['id', 'area', 'criteria', 'status', 'evidence']],
  [
    'Syllabus',
    'topic',
    'topics',
    [
      'id',
      'title',
      'area',
      'track',
      'objective',
      'prerequisites',
      'taskId',
      'status',
      'evidence',
      'notes',
      'updatedAt',
    ],
  ],
] as const;
const arrays = ['prerequisites', 'tags', 'attachments', 'followups'];
function textParts(value: string) {
  const parts: string[] = [];
  for (let at = 0; at < value.length;) {
    let end = Math.min(value.length, at + 30000);
    const code = value.charCodeAt(end - 1);
    if (end < value.length && code >= 0xd800 && code <= 0xdbff) end--;
    parts.push(value.slice(at, end));
    at = end;
  }
  return parts.length ? parts : [''];
}
export async function workbook(
  state: State,
  portable: { images: Record<string, string>; researchRuns: unknown[] } = {
    images: {},
    researchRuns: [],
  },
) {
  const w = new ExcelJS.Workbook();
  w.creator = 'Career Switch Planner';
  w.created = new Date();
  const d = w.addWorksheet('Dashboard');
  const guide = w.addWorksheet('Start here');
  guide.columns = [{ width: 27 }, { width: 100 }];
  guide.addRows([
    ['CAREER SWITCH PLANNER', 'Portable tracker • schema 1'],
    [
      'How to use',
      'Upload XLSX to Google Drive, open with Google Sheets and save as Google Sheets. Each friend owns a separate copy; share viewer/commenter links.',
    ],
    [
      'Import scope',
      'Export → edit plain data sheets → import → review → apply. Stable IDs reconcile records using a three-way baseline; conflicting app/Excel edits are rejected. Missing rows do not delete records. Set _delete to YES to explicitly delete; dangling references are rejected. No background/live sync.',
    ],
    [
      'Important',
      'All workspace records, resume source, prompts, attached images and saved research runs travel in this workbook. Keys, compiler binaries and cached PDFs never do. Hidden __Portable holds the baseline/assets: keep it intact. Limits: 10 MB XLSX; use JSON/data-folder backups for larger workspaces.',
    ],
    [
      'Lists',
      'prerequisites, tags, attachments and followups are JSON arrays. Resources has one row per learning link. Resume source / Prompts split long text into numbered 30,000-character parts: preserve order and IDs. Profile is field/value. Dates use YYYY-MM-DD.',
    ],
    [
      'Formula safety',
      'Formula cells are rejected on import. Text beginning = is exported as literal text. No macros or external workbook links are executed.',
    ],
    [
      'Google Sheets',
      'Import/export compatibility is designed around basic rows and formulas. Live Google import is not automated or verified here.',
    ],
    [
      'Status',
      'No invented practice or progress. Readiness gates require evidence. Dates are planning estimates, not job guarantees.',
    ],
  ]);
  d.columns = [{ width: 28 }, { width: 20 }, { width: 58 }];
  const p = planning(state);
  const n = state.sessions.length + 1;
  const sum = (track?: string) =>
    track
      ? `SUMIF(Sessions!D2:D20001,"${track}",Sessions!C2:C20001)/60`
      : `SUM(Sessions!C2:C20001)/60`;
  d.addRows([
    ['YOUR CONTROL ROOM', 'Value', 'Meaning'],
    [
      'Exported',
      localDay(),
      'Export date; formulas update data-sheet totals. App recomputes detailed forecasts on import',
    ],
    [
      'Weekly capacity',
      { formula: 'Profile!B9', result: state.profile.weeklyHours },
      'Hours; edit weeklyHours in Profile',
    ],
    [
      'All-time hours',
      { formula: sum(), result: state.sessions.reduce((a, s) => a + s.minutes, 0) / 60 },
      'Session time only; no double counting',
    ],
    [
      'This week',
      {
        formula:
          'SUMIFS(Sessions!C2:C20001,Sessions!B2:B20001,">="&(TODAY()-WEEKDAY(TODAY(),2)+1),Sessions!B2:B20001,"<"&(TODAY()+1))/60',
        result: p.actualMinutes / 60,
      },
      'Monday-start calendar week; dates are real spreadsheet dates',
    ],
    [
      'Remaining work',
      {
        formula: 'SUMIF(Tasks!E2:E20001,"<>done",Tasks!D2:D20001)/60',
        result: p.remainingMinutes / 60,
      },
      'Planned estimate hours; includes blocked work, not observed velocity',
    ],
    [
      'Forecast (app snapshot)',
      p.forecast || '—',
      'Detailed dependency/velocity forecast is recalculated in the app on import',
    ],
    [
      'Evidence gates',
      {
        formula: 'COUNTIF(Readiness!D2:D20001,"Verified")&"/"&COUNTA(Readiness!A2:A20001)',
        result: `${p.verifiedGates}/${state.gates.length}`,
      },
      'Not an offer probability',
    ],
    ...['DSA', 'SQL', 'Backend', 'AI', 'Systems', 'Interview', 'Career', 'Role'].map((t) => [
      `${t} total hours`,
      {
        formula: sum(t),
        result: state.sessions.filter((s) => s.track === t).reduce((a, s) => a + s.minutes, 0) / 60,
      },
      'All-time session hours',
    ]),
  ]);
  d.addRows([
    [
      'Outcomes done',
      {
        formula: 'COUNTIF(Tasks!E2:E20001,"done")',
        result: state.tasks.filter((t) => t.status === 'done').length,
      },
      'Completed outcomes',
    ],
    [
      'Topics explain-ready',
      {
        formula: 'COUNTIF(Syllabus!H2:H20001,"Explain-ready")',
        result: state.topics.filter((t) => t.status === 'Explain-ready').length,
      },
      'Self-assessed; record evidence',
    ],
    [
      'Topics total',
      { formula: 'COUNTA(Syllabus!A2:A20001)', result: state.topics.length },
      'Includes all learning areas',
    ],
    [
      'Practice independent',
      {
        formula:
          'COUNTIF(Practice!I2:I20001,"Independent")+COUNTIF(Practice!I2:I20001,"Explain-ready")',
        result: state.questions.filter((q) => ['Independent', 'Explain-ready'].includes(q.status))
          .length,
      },
      'DSA + SQL',
    ],
    ...(
      [
        'Notes',
        'Projects',
        'Claims',
        'Interview',
        'Applications',
        'Sources',
        'Readiness',
        'Attempts',
        'Resources',
        'Resume source',
        'Prompts',
      ] as const
    ).map((name) => [
      name + ' rows',
      {
        formula: `COUNTA('${name}'!A2:A30001)`,
        result:
          name === 'Resources'
            ? state.topics.reduce((n, t) => n + t.resources.length, 0)
            : name === 'Resume source'
              ? state.resumeDocuments.reduce((n, d) => n + textParts(d.source).length, 0)
              : name === 'Prompts'
                ? state.promptTemplates.reduce((n, d) => n + textParts(d.body).length, 0)
                : (
                    {
                      Notes: state.notes.length,
                      Projects: state.projects.length,
                      Claims: state.claims.length,
                      Interview: state.stories.length,
                      Applications: state.jobs.length,
                      Sources: state.sources.length,
                      Readiness: state.gates.length,
                      Attempts: state.attempts.length,
                    } as Record<string, number>
                  )[name],
      },
      'Count of data rows; long documents can span parts',
    ]),
    [
      'Budget-only forecast',
      {
        formula: 'IF(B3>0,TEXT(TODAY()+ROUNDUP(B6/B3*7,0),"yyyy-mm-dd"),"Set capacity")',
        result: p.forecast || '—',
      },
      'Rough estimate from remaining hours/capacity only; not the app dependency/velocity model',
    ],
    [
      'Important',
      'Data parity, not an executable app',
      'Excel does not run AI, research, video playback or LaTeX compilation. Formula forecasts are not hiring promises.',
    ],
  ]);
  const profile = w.addWorksheet('Profile');
  profile.columns = [
    { header: 'field', width: 28 },
    { header: 'value', width: 100 },
  ];
  Object.entries(state.profile).forEach(([k, v]) => profile.addRow([k, v]));
  const capacityRow = Object.keys(state.profile).indexOf('weeklyHours') + 2;
  d.getCell('B3').value = { formula: `Profile!B${capacityRow}`, result: state.profile.weeklyHours };
  const resources = w.addWorksheet('Resources');
  resources.columns = ['topicId', 'index', 'title', 'url', 'kind', 'notes'].map((header) => ({
    header,
    width: header === 'url' ? 60 : 32,
  }));
  state.topics.forEach((t) =>
    t.resources.forEach((r, i) => resources.addRow([t.id, i, r.title, r.url, r.kind, r.notes])),
  );
  for (const [name, key, field] of [
    ['Resume source', 'resumeDocuments', 'source'],
    ['Prompts', 'promptTemplates', 'body'],
  ] as const) {
    const sheet = w.addWorksheet(name);
    sheet.columns = ['id', 'title', 'part', field, 'updatedAt', '_delete'].map((header) => ({
      header,
      width: header === field ? 100 : 28,
    }));
    for (const doc of state[key]) {
      const body = doc[field as keyof typeof doc];
      const str = String(body);
      textParts(str).forEach((part, i) =>
        sheet.addRow([doc.id, doc.title, i + 1, part, doc.updatedAt, '']),
      );
    }
  }
  const manifest = w.addWorksheet('__Portable', { state: 'veryHidden' });
  manifest.addRow(['career-workbook-v2']);
  const encoded = JSON.stringify({ format: 'career-workbook', version: 2, state, ...portable });
  if (Buffer.byteLength(encoded) > 28 * 1024 * 1024)
    throw new Error('Workbook portable data exceeds 28 MB. Use a stopped data-folder copy.');
  textParts(encoded).forEach((part) => manifest.addRow([part]));
  for (const [name, , key, headers] of tables) {
    const s = w.addWorksheet(name);
    s.columns = headers.map((h) => ({
      header: h,
      key: h,
      width:
        h === 'id'
          ? 25
          : /body|text|summary|evidence|jd|excerpt|criteria|notes|fallback/.test(h)
            ? 65
            : /url/.test(h)
              ? 55
              : 25,
    }));
    for (const record of state[key])
      s.addRow(
        Object.fromEntries(
          headers.map((h) => [
            h,
            ['date', 'checkedAt'].includes(h) &&
            /^\d{4}-\d{2}-\d{2}$/.test(String((record as any)[h]))
              ? new Date((record as any)[h] + 'T12:00:00Z')
              : Array.isArray((record as any)[h])
                ? JSON.stringify((record as any)[h])
                : (record as any)[h],
          ]),
        ),
      );
    headers.forEach((h, i) => {
      if (['date', 'checkedAt'].includes(h)) s.getColumn(i + 1).numFmt = 'yyyy-mm-dd';
    });
    s.getCell(1, headers.length + 1).value = '_delete';
    s.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, s.rowCount), column: headers.length },
    };
    s.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];
    if (name === 'Tasks')
      for (let r = 2; r <= Math.max(200, s.rowCount); r++)
        s.getCell(r, 5).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"todo,doing,done,blocked"'],
        };
    if (name === 'Practice')
      for (let r = 2; r <= s.rowCount; r++)
        s.getCell(r, 9).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"Not started,Learning,Independent,Explain-ready"'],
        };
    if (name === 'Practice') {
      s.getCell(1, 12).value = 'Next review (snapshot)';
      s.getColumn(12).width = 24;
      state.questions.forEach((q, i) => (s.getCell(i + 2, 12).value = nextReview(state, q) || ''));
    }
  }
  for (const s of w.worksheets) {
    if (s.name === '__Portable') continue;
    s.views = [{ state: 'frozen', ySplit: 1 }];
    s.getRow(1).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    s.getRow(1).height = 32;
    s.getRow(1).eachCell(
      (c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245E7A' } }),
    );
    s.eachRow((r, i) => {
      if (i > 1) {
        r.height = s.name === 'Start here' ? 58 : s.name === 'Dashboard' ? 26 : 48;
        r.eachCell((c) => {
          c.font = { name: 'Calibri', size: 11, color: { argb: 'FF203544' } };
          c.alignment = {
            vertical: 'top',
            wrapText: true,
            ...(s.name === 'Dashboard' && /^B\d+$/.test(c.address)
              ? { horizontal: 'left' as const }
              : {}),
          };
          if (i % 2 === 0)
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5F8' } };
          if (typeof c.value === 'number') c.numFmt = '0.##';
        });
      }
    });
    s.pageSetup = {
      paperSize: 9,
      orientation: s.name === 'Dashboard' ? 'portrait' : 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: ['Start here', 'Dashboard'].includes(s.name) ? 1 : 0,
      printTitlesRow: '1:1',
    };
    s.pageSetup.printArea = `A1:${s.getColumn(s.columnCount).letter}${s.rowCount}`;
  }
  // Excel cell strings cannot exceed 32767 characters. Long source/prompt text is chunked above.
  for (const sheet of w.worksheets)
    sheet.eachRow((row) =>
      row.eachCell((cell) => {
        if (typeof cell.value === 'string' && cell.value.length > 32767)
          throw new Error(
            `${sheet.name}: cell exceeds Excel text limit; shorten it or use JSON backup.`,
          );
      }),
    );
  const output = Buffer.from(await w.xlsx.writeBuffer());
  if (output.length > 10 * 1024 * 1024)
    throw new Error('Workbook exceeds 10 MB; use JSON backup or a stopped data-folder copy.');
  return output;
}
export function guardXlsx(buffer: Buffer) {
  // Read ZIP central directory before XML inflation. Reject ZIP64, encryption, extreme compression and excessive entries.
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--)
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error('Invalid XLSX ZIP container.');
  const count = buffer.readUInt16LE(end + 10),
    offset = buffer.readUInt32LE(end + 16);
  if (!count || count > 500 || offset >= buffer.length || count === 65535)
    throw new Error('Workbook container exceeds limits.');
  let at = offset,
    total = 0;
  for (let n = 0; n < count; n++) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== 0x02014b50)
      throw new Error('Invalid workbook directory.');
    const flags = buffer.readUInt16LE(at + 8),
      compressed = buffer.readUInt32LE(at + 20),
      inflated = buffer.readUInt32LE(at + 24);
    if (flags & 1 || inflated === 0xffffffff || compressed === 0xffffffff)
      throw new Error('Encrypted/ZIP64 workbooks are not supported.');
    total += inflated;
    if (
      total > 40 * 1024 * 1024 ||
      inflated > 20 * 1024 * 1024 ||
      inflated / Math.max(1, compressed) > 250
    )
      throw new Error('Workbook inflated size or compression exceeds safe limits.');
    at +=
      46 +
      buffer.readUInt16LE(at + 28) +
      buffer.readUInt16LE(at + 30) +
      buffer.readUInt16LE(at + 32);
  }
}
export async function importWorkbook(buffer: Buffer, state: State) {
  // XLSX is parsed as data only. Resource limits are also enforced by request size and row count.
  guardXlsx(buffer);
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(buffer as any);
  const ops: Operation[] = [];
  const warnings: string[] = [];
  for (const [name, kind, key, headers] of tables) {
    const s = w.getWorksheet(name);
    if (!s) continue;
    if (s.rowCount > 20_001 || s.columnCount > 100)
      throw new Error('Workbook has too many rows or columns.');
    const indexes = new Map<string, number>();
    s.getRow(1).eachCell((c, i) => indexes.set(String(c.value), i));
    if (!headers.every((h) => indexes.has(h))) {
      warnings.push(`${name}: headers do not match; sheet skipped.`);
      continue;
    }
    for (let i = 2; i <= s.rowCount; i++) {
      const r = s.getRow(i);
      if (!r.getCell(indexes.get('id')!).value) continue;
      const value: any = {};
      for (const h of headers) {
        const cell = r.getCell(indexes.get(h)!);
        let v: any = cell.value ?? '';
        if (typeof v === 'object') {
          if (v instanceof Date) v = v.toISOString().slice(0, 10);
          else if (v.hyperlink) v = v.text;
          else
            throw new Error(
              `${name} row ${i}: formulas/rich objects are not supported. Paste plain values.`,
            );
        }
        if (arrays.includes(h)) {
          try {
            v = JSON.parse(String(v) || '[]');
          } catch {
            throw new Error(`${name} row ${i}: ${h} needs a JSON array.`);
          }
        }
        if (['number', 'minutes', 'estimateMinutes'].includes(h)) v = Number(v);
        value[h] = v;
      }
      if (kind === 'topic')
        value.resources = state.topics.find((t) => t.id === value.id)?.resources || [];
      const normalized = proposalSchema.parse({
        summary: 'Workbook row',
        operations: [{ kind, value }],
      }).operations[0].value;
      const existing = (state[key] as any[]).find((v) => v.id === value.id);
      if (!existing || !isDeepStrictEqual(existing, normalized))
        ops.push({ kind, value: normalized } as Operation);
      if (ops.length > 1000) throw new Error('Import at most 1,000 changed rows at once.');
    }
  }
  // Imports are allowed more than the AI's 30-op limit, but use the identical record validators.
  for (const op of ops) proposalSchema.parse({ summary: 'Workbook import', operations: [op] });
  applyOperations(state, ops);
  if (!ops.length)
    warnings.push(
      'No supported changes found. Use an export from this app; legacy spreadsheets need manual mapping.',
    );
  return { summary: `${ops.length} changed records from workbook`, operations: ops, warnings };
}
export function resumeText(state: State, future = false) {
  const p = state.profile;
  const claims = state.claims.filter((c) => future || c.status === 'Verified');
  return [
    p.name || 'Your name',
    p.headline,
    p.location,
    [p.email, p.phone, p.links].filter(Boolean).join(' | '),
    future ? 'FUTURE-STATE WORKING DRAFT — verify every claim before applying' : '',
    p.summary,
    'EXPERIENCE',
    p.employment,
    ...claims.filter((c) => c.category === 'Experience').map((c) => `• ${c.text}`),
    'PROJECTS',
    ...claims.filter((c) => c.category === 'Project').map((c) => `• ${c.text}`),
    'SKILLS',
    ...claims.filter((c) => c.category === 'Skill').map((c) => c.text),
    'EDUCATION',
    p.education,
  ].filter(Boolean);
}
export async function resumeDocx(state: State, future: boolean) {
  const lines = resumeText(state, future);
  return Packer.toBuffer(
    new Document({
      sections: [
        {
          children: lines.map(
            (t, i) =>
              new Paragraph({
                heading:
                  i === 0
                    ? HeadingLevel.TITLE
                    : ['EXPERIENCE', 'PROJECTS', 'SKILLS', 'EDUCATION'].includes(t)
                      ? HeadingLevel.HEADING_2
                      : undefined,
                children: [new TextRun({ text: t, size: i === 0 ? 36 : 21 })],
                spacing: { after: 120 },
              }),
          ),
        },
      ],
    }),
  );
}
export function resumeLatex(state: State, future: boolean) {
  const escape = (s: string) =>
    s.replace(
      /[\\{}$&#%_^~]/g,
      (c) =>
        ({
          '\\': '\\textbackslash{}',
          '{': '\\{',
          '}': '\\}',
          $: '\\$',
          '&': '\\&',
          '#': '\\#',
          '%': '\\%',
          _: '\\_',
          '^': '\\textasciicircum{}',
          '~': '\\textasciitilde{}',
        })[c]!,
    );
  return `\\documentclass[11pt,a4paper]{article}\n\\usepackage[margin=0.7in]{geometry}\n\\usepackage[T1]{fontenc}\n\\usepackage[utf8]{inputenc}\n\\begin{document}\n\\pagestyle{empty}\n${resumeText(
    state,
    future,
  )
    .map((s, i) =>
      i === 0
        ? `{\\LARGE\\bfseries ${escape(s)}}\\par\\medskip`
        : escape(s.replace(/^• /, '- ')) + '\\par\\smallskip',
    )
    .join('\n')}\n\\end{document}\n`;
}
