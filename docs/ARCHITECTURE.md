# Implemented architecture

## Components

```text
Browser: React / TypeScript / local assets
  │ same-origin JSON + per-process request token
  ▼
Node 24 / Express on 127.0.0.1 only
  ├─ Zod record validation + referential checks
  ├─ shared deterministic planner / offline parser
  ├─ serialized revision-checked atomic file store
  │    ├─ data/workspace.json
  │    ├─ data/backups/ (40 previous states)
  │    └─ data/images/ (retained raster attachments)
  ├─ ExcelJS and docx exporters (server only)
  ├─ OPTIONAL provider → Ollama loopback or trusted compatible endpoint
  └─ OPTIONAL source reader → validated public HTTPS address
```

## Source ownership

- `shared/schema.ts`: canonical schema v1, operation allowlist, record identity, dependencies and references. Frontend/server share types; server is authoritative.
- `shared/planner.ts`: local calendar weeks, remaining work, prerequisite ordering, forecast and spaced recall.
- `shared/prompts.ts`: reusable AI contract and six request modes.
- `seed/questions.json`, `server/seed.ts`: generic syllabus/templates, no fabricated activity.
- `server/store.ts`: process lock, recovery, atomic write/fsync, serialized mutations, revision conflicts.
- `server/app.ts`: HTTP boundary, CSRF/Host/Origin/CSP, validated endpoints, exports and restore.
- `server/ai.ts`: bounded provider adapter. No model receives the data folder or a filesystem tool.
- `server/research.ts`: bounded page retrieval, pinned public IPv4 DNS, redirect revalidation, text extraction.
- `server/attachments.ts`, `server/exports.ts`: raster files and portable documents.
- `src/main.tsx`: route views, reusable record editor, preview dialog, user actions. `src/api.ts`: request boundary. `src/style.css`: local responsive styles.
- `scripts/`: reproducible install/start and isolated browser-test server.

## Save transaction

Client sends expected revision and validated operations. Server constructs next state, validates IDs/references/cycles and required images, queues the write, checks revision, saves previous JSON, fsyncs a new temp file and renames it into place. Only then is the new state returned. Conflicts are HTTP 409; UI keeps open form text and offers reload, never silently merges it. For a restore, validate the whole backup before writing; imported image IDs are remapped so older recovery points retain their original files.

Atomic rename does not guarantee survival of every hardware/power/filesystem failure. Directory fsync is not portable here. Keep external backups. A lock prevents normal duplicate servers; this is not a distributed database.

## Planner contract

- Weekly capacity is shared by all preparation, project, revision, mock and career work; no daily streak requirement.
- Remaining work: zero for a completed task; otherwise estimate minus linked logged time, with at least 15 minutes remaining until explicitly completed.
- After 5 completed tasks with time logs, use median actual/estimated ratio, bounded 0.5–2.0. Before that, use estimates and label low confidence.
- Forecast: remaining weighted minutes / weekly capacity, converted to calendar days. Range uses 0.8×–1.35× sensitivity, **not a statistically calibrated confidence interval**.
- Weekly blocks respect dependencies and current-week logged capacity. Blocked tasks remain in total scope; their unblock delay is unknown. Queue is capped at 104 weeks; no guaranteed completion date is inferred from it.
- A task completion is a user attestation. Readiness gates separately require evidence; the app does not independently audit it.
- Practice reviews: consecutive independent results schedule +3/+7/+21 days; hinted/failed results schedule +1 day. Manual question status and recall history are separate from elapsed study hours.

## Trust boundaries

No login because there is no network-user model. Browser origin and loopback safeguards reduce web-origin attacks, not attacks by another local process or a compromised browser extension. Personal data is plain local JSON and images. Source/JD/model text is untrusted. It never becomes executable HTML, shell arguments or raw database queries. Exception: a deliberately imported, owner-reviewed LaTeX source can be passed unchanged to the optional native compiler after explicit trust consent; that boundary is not an OS sandbox. AI has schema-limited proposals only, always reviewed.

Proposed future improvements live in ROADMAP, not in this diagram as if already built.

## v0.2 components

`shared/latex-template.ts` generates clean generic templates; `src/LatexStudio.tsx` owns source/PDF editing, while `server/latex.ts` installs and invokes the optional compiler. `shared/research-contract.ts` defines durable run records; `server/research-workflow.ts` orchestrates bounded query/search/read/synthesis and reviewed atomic application. `server/research.ts` handles DNS-pinned public retrieval/search adapters; `server/network.ts` provides bounded response reads. Model output never becomes a shell tool or a verified achievement.

## v0.3 syllabus and workbook reconciliation

`shared/syllabus.ts` owns the portable fenced-JSON Markdown contract, fresh context prompts, starter learning content and new-record-only validators. `src/Syllabus.tsx` supports manual edits/progress/resource links and configured/external AI. `server/workbook-import.ts` reconciles workbook rows against the embedded baseline and stable workspace identity; same-workspace edits are three-way checked and foreign-workspace transfers require replacement consent. `server/exports.ts` emits Dashboard-first full data sheets, separate resources, chunked text documents and hidden portable baseline/assets. Keys, provider configuration and compiler caches are not portable workspace data. Import preview/apply revalidate references, images and revisions; archive import is auxiliary and not in the atomic state transaction.
