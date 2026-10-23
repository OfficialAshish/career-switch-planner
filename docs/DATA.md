# Data, backups and Excel exchange

## Data folder

`data/workspace.json` is canonical schema v1: workspaceId, revision, profile, tasks, sessions, questions, attempts, notes, projects, claims, stories, jobs, sources, gates, topics, promptTemplates and resumeDocuments. Older schema-v1 workspaces gain empty new collections and a stable workspace identity; the original is preserved before that identity is persisted. Record IDs are stable alphanumeric/hyphen/underscore strings. Arrays have bounded counts. Dates are YYYY-MM-DD local calendar dates; timestamps are strings. Unknown schema versions and unsupported fields are rejected, not silently dropped.

`data/provider.json` stores provider type/endpoint/model only. `data/images/` stores PNG/JPEG/WebP files under generated IDs. Attachments are never committed or placed in the static asset folder. Removed notes/images are not automatically garbage-collected because older backups may still reference them.

## Full portable backup

Download Settings → Full JSON backup:

```json
{
  "format": "career-switch-planner",
  "version": 1,
  "state": { "schemaVersion": 1, "revision": 0, "...": "canonical state" },
  "images": { "generated-id": "base64 raster bytes" }
}
```

The snippet is illustrative, not an importable template. Exported real files contain complete validated state. Maximum 18 MB aggregate referenced images, 5 MB each; request body 30 MB. Larger workspaces should be backed up by copying the **whole data folder while the server is stopped**.

Import first validates the envelope, state, references and images, then shows a replacement preview. Explicit confirmation saves the previous state and increments the local revision. Imported image IDs are remapped to protect older backup references. Unreferenced image bytes can remain after failed imports; they are not public, and may be cleaned only when no retained backup needs them. Never hand-edit a live workspace file.

## Excel workbook v2

**Dashboard is the first sheet.** It summarizes capacity, logged session hours (all time, current week and per track), remaining task estimate hours, completion, explain-ready topics, practice status, gates and row counts across the remaining data sheets. It has cached values for viewers and ordinary formulas for spreadsheet recalculation. A rough budget-only forecast formula is separate from the detailed **app forecast snapshot**, which is recomputed by the application after import; the Excel formula is not the dependency/observed-velocity algorithm.

### Editable sheets

| Sheet                               | Data                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Profile                             | All profile fields as field/value rows, including weeklyHours                      |
| Tasks, Sessions, Practice, Attempts | Outcomes, session hours, DSA/SQL catalog and practice history                      |
| Syllabus                            | Concept objective, area/track, topic prerequisites, task link, status and evidence |
| Resources                           | One resource per topic/index: title, URL, kind and notes                           |
| Notes, Projects, Claims, Interview  | Learning notes, project evidence, resume claims and interview stories              |
| Applications, Sources, Readiness    | Job pipeline, research excerpts and readiness gates                                |
| Resume source                       | Exact LaTeX documents, split into numbered parts to respect Excel cell limits      |
| Prompts                             | Saved editable prompts, split into numbered parts                                  |

Start here explains editing. Practice's next-review column is a **snapshot**, not an editable scheduling algorithm. Preserve all sheet/header names and stable IDs. Array fields use JSON arrays. Resources uses unique nonnegative indices per topic. Source/prompt parts are consecutive from 1 with matching title/date; source text is never reformatted or compiled on import. An empty source is a valid editable document. Formula/rich-object cells in data sheets are rejected; paste plain values. Summary formulas are never imported as data. The supported workbook has no macros/external workbook links; the app never executes them. Open unfamiliar spreadsheets with ordinary Office security precautions.

### Baseline and assets

The **very-hidden `__Portable` sheet** stores chunked validated export state, referenced raster images and up to 30 research runs. It enables conflict-aware reconciliation and moving the complete tracked workspace. **Keep it intact.** Hidden is not encrypted: exported workbooks contain personal profile, notes, contacts and source data. Never share a full workbook as though it were a sanitized progress screenshot. Provider/search keys, provider configuration, downloaded compiler binaries/packages and compiled PDF cache are deliberately excluded. Compile saved source again after moving machines. Portable export is not a full disk-loss backup; keep periodic external JSON/data-folder backups too.

### Import / reconcile

1. Export a fresh XLSX from this app, edit plain values and save as XLSX.
2. Import in Settings. Preview lists changed records and warnings. No state changes occur before Apply.
3. In the **same workspace** (stable workspaceId), an unchanged exported row does not overwrite a newer app edit. A row edited only in Excel is upserted. Identical changes are a no-op. If the same record changed differently in both places, **the import is rejected**: export fresh and reconcile manually. This is deliberately conservative at record level; Profile is merged field-by-field.
4. Missing rows do **not** delete records. Mark `_delete` as `YES` to explicitly delete a record; all document parts need the mark. Broken references/cycles/duplicate IDs are rejected before applying. Removing a Resources row edits that topic's resource list; it does not delete the topic. Pending `_delete` rows remain in Excel formula totals until you apply and re-export.
5. A workbook from a **different workspace** is a full tracked-state replacement, not a guessed merge. A separate checkbox and server confirmation are required. Existing state is saved as a recovery point first. Unchanged records, source, prompts and images are restored as well as edited records. Research archives are merged independently; existing run IDs are preserved and imported unapplied runs must be regenerated.
6. Apply checks the current revision again, validates state/references/images, remaps image IDs and atomically saves the workspace. Source is not automatically trusted/compiled. Auxiliary research archive errors are reported through the workspace notice; keep the original workbook if that occurs.
7. **Export a fresh workbook after applying.** There is no background synchronization, file watcher or simultaneous shared editing. Excel cannot run AI, browse research, play course videos or compile LaTeX. Data parity is not executable feature parity.

Legacy pre-v0.3 workbooks lacking a baseline retain limited plain-row upsert import with a warning; they have no reliable conflict detection or full asset portability. Arbitrary older trackers are not silently mapped. The legacy `/api/import-xlsx` endpoint remains a limited upsert interface; the UI uses `/api/workbook/preview` and `/api/workbook/apply` for v2 reconciliation.

Limits: 10 MB compressed XLSX; 28 MB portable JSON; 18 MB referenced image bytes / 5 MB each; bounded ZIP expansion/entry counts/compression ratio; at most 2,000 changes per reconciliation (1,000 legacy upserts); max 30,001 worksheet rows and 100 columns. Text is split at safe Unicode boundaries into at most 30,000 characters per source/prompt/baseline part. Other fields retain schema limits and cannot exceed Excel's 32,767-character cell limit. Larger workspaces use JSON or a copy of the **stopped** data folder. Core workflows are tested with ExcelJS and LibreOffice; Microsoft Excel / Google Sheets full round-trip preservation is not assumed—third-party tools can discard hidden sheets, styles or source whitespace. Keep an original app export.

## Resume exports

Current mode uses Verified claims; future mode includes Planned/Working claims and a prominent draft warning. Profile summary/employment text is self-entered, not automatically audited. PDF uses browser Print; DOCX is editable and LaTeX is escaped source (compiler not bundled). No ATS ranking/format guarantee. Unicode LaTeX content may need an appropriate engine/font setup. Verify all links and metrics before submitting.

## v0.2 additions

`resumeDocuments` defaults to an empty array in old workspaces and stores complete UTF-8 sources, not regenerated claim exports. Full portable JSON also contains `researchRuns`; old imports default to none. Unapplied restored runs lose their proposal and must regenerate against the current workspace. Excel exchange intentionally excludes these source/run records. Compiler cache/tools are excluded from JSON but retained by a stopped-folder backup. A portable archive is capped at 28 MB; use a stopped-folder backup if larger.
