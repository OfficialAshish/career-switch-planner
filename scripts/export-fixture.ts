// Reusable synthetic fixture for XLSX/Office QA; never loads a real user's data.
import { mkdir, writeFile } from 'node:fs/promises';
import { initialState } from '../server/seed.js';
import { workbook, resumeDocx, resumeLatex } from '../server/exports.js';
const root = process.env.EXPORT_QA_DIR || 'test-results/exports';
await mkdir(root, { recursive: true });
const state = initialState();
state.profile.name = 'Synthetic Example';
state.sessions.push({
  id: 'fixture-session',
  date: '2026-10-22',
  minutes: 45,
  track: 'DSA',
  summary: 'Synthetic export fixture',
  taskId: '',
});
await writeFile(root + '/tracker.xlsx', await workbook(state));
await writeFile(root + '/resume.docx', await resumeDocx(state, true));
await writeFile(root + '/resume.tex', resumeLatex(state, true));
console.log('Synthetic export fixtures written.');
