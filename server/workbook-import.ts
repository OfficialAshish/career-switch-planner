import { isDeepStrictEqual } from 'node:util';
import ExcelJS from 'exceljs';
import { guardXlsx, tables, importWorkbook } from './exports.js';
import { parseState, operationSchema, type State } from '../shared/schema.js';

const equal = isDeepStrictEqual;
function plain(cell: ExcelJS.Cell): string | number | boolean {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object')
    throw new Error(
      `${cell.address}: formulas, hyperlinks and rich objects are not imported. Paste plain values.`,
    );
  return v;
}
export async function reconcileWorkbook(buffer: Buffer, current: State) {
  guardXlsx(buffer);
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(buffer as any);
  const manifest = w.getWorksheet('__Portable');
  if (!manifest) {
    const legacy = await importWorkbook(buffer, current);
    return {
      legacy,
      summary: legacy.summary,
      changes: legacy.operations,
      warnings: [
        ...legacy.warnings,
        'Legacy workbook: limited upserts, no baseline conflict detection or portable assets. Export a fresh workbook for full reconciliation.',
      ],
    };
  }
  if (manifest.rowCount > 1500 || plain(manifest.getCell('A1')) !== 'career-workbook-v2')
    throw new Error('Invalid workbook baseline.');
  let encoded = '';
  for (let i = 2; i <= manifest.rowCount; i++) encoded += String(plain(manifest.getCell(i, 1)));
  if (encoded.length > 28 * 1024 * 1024) throw new Error('Workbook baseline too large.');
  const portable = JSON.parse(encoded);
  if (portable.format !== 'career-workbook' || portable.version !== 2)
    throw new Error('Unsupported workbook version.');
  const base = parseState(portable.state);
  const transfer = base.workspaceId !== current.workspaceId;
  const target = transfer ? base : current,
    next = structuredClone(target);
  const changes: { kind: string; id: string; action: string; value?: unknown }[] = [],
    warnings: string[] = [];
  function merge(key: keyof State, kind: string, value: any, remove = false) {
    const baseList = base[key] as any[],
      currentList = next[key] as any[];
    const before = baseList.find((x) => x.id === value.id),
      now = currentList.find((x) => x.id === value.id);
    if (remove && !before)
      throw new Error(`${kind} ${value.id}: cannot delete an ID not present at export.`);
    if (!remove && equal(value, before)) return;
    if (!equal(now, before) && !equal(now, remove ? undefined : value))
      throw new Error(
        `Conflict: ${kind} ${value.id} changed both in the app and workbook. Export again and reconcile manually.`,
      );
    if (equal(now, remove ? undefined : value)) return;
    const index = currentList.findIndex((x) => x.id === value.id);
    if (remove) {
      if (index >= 0) currentList.splice(index, 1);
    } else {
      operationSchema.parse({ kind, value });
      if (index < 0) currentList.push(value);
      else currentList[index] = value;
    }
    changes.push({
      kind,
      id: value.id,
      action: remove ? 'delete' : 'upsert',
      ...(!remove ? { value } : {}),
    });
  }
  function sheetRows(name: string, headers: readonly string[]) {
    const sheet = w.getWorksheet(name);
    if (!sheet)
      throw new Error(
        `Missing ${name} sheet. Keep all system sheets; use _delete for explicit deletions.`,
      );
    if (sheet.rowCount > 30001 || sheet.columnCount > 100)
      throw new Error(`${name}: too many rows or columns.`);
    const indexes = new Map<string, number>();
    sheet.getRow(1).eachCell((c, i) => {
      const h = String(plain(c));
      if (indexes.has(h)) throw new Error(`${name}: duplicate header ${h}`);
      indexes.set(h, i);
    });
    if (!headers.every((h) => indexes.has(h)))
      throw new Error(`${name}: headers changed. Preserve export column names.`);
    const rows: any[] = [];
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row: any = {};
      for (const h of [...headers, '_delete']) {
        const col = indexes.get(h);
        row[h] = col ? plain(sheet.getCell(i, col)) : '';
      }
      if (!row[headers[0]]) continue;
      rows.push(row);
    }
    return rows;
  }
  const resources = new Map<string, any[]>();
  for (const row of sheetRows('Resources', ['topicId', 'index', 'title', 'url', 'kind', 'notes'])) {
    if (String(row._delete).toUpperCase() === 'YES') continue;
    const list = resources.get(String(row.topicId)) || [];
    list.push(row);
    resources.set(String(row.topicId), list);
  }
  for (const [name, kind, key, headers] of tables) {
    const seen = new Set<string>();
    for (const row of sheetRows(name, headers)) {
      if (seen.has(String(row.id))) throw new Error(`${name}: duplicate ID ${row.id}.`);
      seen.add(String(row.id));
      const remove = String(row._delete).toUpperCase() === 'YES';
      delete row._delete;
      if (!remove)
        for (const h of headers) {
          if (['prerequisites', 'tags', 'attachments', 'followups'].includes(h)) {
            try {
              row[h] = JSON.parse(String(row[h]) || '[]');
            } catch {
              throw new Error(`${name}: ${h} must be JSON array.`);
            }
          }
          if (['number', 'minutes', 'estimateMinutes'].includes(h)) row[h] = Number(row[h]);
        }
      if (kind === 'topic' && !remove) {
        const list = resources.get(String(row.id)) || [];
        const indices = list.map((r) => Number(r.index));
        if (
          indices.some((n) => !Number.isInteger(n) || n < 0) ||
          new Set(indices).size !== indices.length
        )
          throw new Error('Resource indices must be unique nonnegative integers per topic.');
        row.resources = list
          .sort((a, b) => Number(a.index) - Number(b.index))
          .map(({ title, url, kind, notes }) => ({ title, url, kind, notes }));
      }
      merge(key, kind, row, remove);
    }
  }
  for (const topicId of resources.keys())
    if (!next.topics.some((t) => t.id === topicId))
      throw new Error(`Resource refers to missing topic ${topicId}.`);
  const profileEntries = sheetRows('Profile', ['field', 'value']);
  const fields = new Set<string>();
  for (const row of profileEntries) {
    const key = String(row.field) as keyof State['profile'];
    if (!(key in base.profile) || fields.has(key))
      throw new Error('Unknown or duplicate Profile field.');
    fields.add(key);
    const value = ['weeklyHours', 'noticeDays'].includes(key) ? Number(row.value) : row.value;
    if (equal(value, base.profile[key])) continue;
    if (!equal(target.profile[key], base.profile[key]) && !equal(target.profile[key], value))
      throw new Error(`Conflict: Profile ${key} changed in both places.`);
    if (!equal(target.profile[key], value)) {
      (next.profile as any)[key] = value;
      changes.push({ kind: 'profile', id: key, action: 'update', value });
    }
  }
  if (fields.size !== Object.keys(base.profile).length)
    throw new Error('Keep every Profile field row.');
  for (const [name, key, kind, field] of [
    ['Resume source', 'resumeDocuments', 'resumeDocument', 'source'],
    ['Prompts', 'promptTemplates', 'promptTemplate', 'body'],
  ] as const) {
    const docs = new Map<string, any[]>();
    for (const row of sheetRows(name, ['id', 'title', 'part', field, 'updatedAt'])) {
      const list = docs.get(String(row.id)) || [];
      list.push(row);
      docs.set(String(row.id), list);
    }
    for (const [id, parts] of docs) {
      if (parts.some((p) => String(p._delete).toUpperCase() === 'YES')) {
        if (!parts.every((p) => String(p._delete).toUpperCase() === 'YES'))
          throw new Error(`${name}: mark all parts YES to delete a document.`);
        merge(key, kind, { id }, true);
        continue;
      }
      parts.sort((a, b) => Number(a.part) - Number(b.part));
      if (
        parts.some(
          (p, i) =>
            Number(p.part) !== i + 1 ||
            p.title !== parts[0].title ||
            p.updatedAt !== parts[0].updatedAt,
        )
      )
        throw new Error(`${name}: parts must be consecutive with matching title/date.`);
      merge(key, kind, {
        id,
        title: parts[0].title,
        [field]: parts.map((p) => String(p[field])).join(''),
        updatedAt: parts[0].updatedAt,
      });
    }
  }
  // Missing worksheet rows are intentionally not deletions. Explicit _delete prevents accidental data loss.
  if (changes.length > 2000) throw new Error('Import at most 2,000 changed records at once.');
  parseState(next);
  warnings.push(
    'Import is a reviewed reconciliation, not live sync. Missing rows are kept; _delete=YES explicitly deletes. Keys/compiler caches are never transferred.',
  );
  if (transfer)
    warnings.unshift(
      'DIFFERENT WORKSPACE: this is a full workspace replacement, not a merge. Existing workspace records will be replaced by the workbook data; a local recovery point is saved first. Research archives are merged separately.',
    );
  return {
    transfer,
    state: next,
    portable: { ...portable, state: next },
    summary: `${transfer ? 'Restore a different workspace with ' + next.tasks.length + ' tasks, ' + next.topics.length + ' topics and ' + next.notes.length + ' notes. ' : ''}${changes.length} reviewed workbook changes; portable images and saved research history included.`,
    changes,
    warnings,
  };
}
