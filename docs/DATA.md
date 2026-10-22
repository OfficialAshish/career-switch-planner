# Data, backups and Excel exchange

## Data folder

`data/workspace.json` is canonical schema v1: revision, profile, tasks, sessions, questions, attempts, notes, projects, claims, stories, jobs, sources and gates. Record IDs are stable alphanumeric/hyphen/underscore strings. Arrays have bounded counts. Dates are YYYY-MM-DD local calendar dates; timestamps are strings. Unknown schema versions and unsupported fields are rejected, not silently dropped.

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

## Excel workbook

Server-side ExcelJS produces a readable tracker:

- Start here: instructions, scope, safety.
- Dashboard: snapshot metrics, basic SUM/SUMIF total-hour formulas and cached results.
- Tasks, Sessions, Practice, Attempts, Notes, Projects, Claims, Interview, Applications, Sources, Readiness: canonical records, stable IDs, readable columns, frozen headers/filters and selected dropdowns.
- Practice includes a **non-imported** next-review snapshot.

Editable columns are white/alternating rows; preserve first-row header names. Formula dashboard cells are derived. Strings beginning `=` are exported as strings, not executable formulas. No macros or external workbook links are generated.

### Import contract

1. Export from this app, edit plain values, save XLSX.
2. Upload it in Settings. The app matches exact sheet/header names and compares rows by `id`.
3. Review changes, then Apply. New IDs add; existing IDs replace their complete record. Blank IDs are ignored. **No deletion.** Up to 1,000 changed rows per import.
4. Lists (`tags`, `prerequisites`, `attachments`, `followups`) use JSON arrays, e.g. `["sql","review"]`. Preserve numeric types. Dates may be date strings or Excel date objects; formulas/rich objects in supported data cells are rejected, never evaluated.
5. No profile, binary images or provider settings through Excel. Existing attachment IDs must already exist locally; use JSON to move images.

ZIP input is capped at 10 MB compressed, inspected for entry counts and inflated sizes before parsing; encrypted/ZIP64/highly compressed containers rejected. These are defensive resource limits, not permission to serve arbitrary public uploads.

An unchanged workbook round-trips with zero operations. A modified Practice status can be superseded by an imported Attempt that updates that question. Final state uses the canonical operation order (questions before attempts); review both before importing.

### Google Sheets and friends

Each person imports their own workbook into Google Drive. Open with Google Sheets → Save as Google Sheets. Share Viewer/Commenter permission; send links, not repeated copies. This app has no Google OAuth, automatic sync or cross-file aggregation. Re-export XLSX to import supported records locally; plain-value data cells only. Google-specific embedded image objects do **not** round-trip as local images.

Live Google import is not verified by automated tests. Check dropdowns, dates, formulas and a small round-trip after conversion. This app’s importer deliberately does not guess older career ZIP tracker headers; migrate those manually or through a reviewed JSON adapter.

## Resume exports

Current mode uses Verified claims; future mode includes Planned/Working claims and a prominent draft warning. Profile summary/employment text is self-entered, not automatically audited. PDF uses browser Print; DOCX is editable and LaTeX is escaped source (compiler not bundled). No ATS ranking/format guarantee. Unicode LaTeX content may need an appropriate engine/font setup. Verify all links and metrics before submitting.
