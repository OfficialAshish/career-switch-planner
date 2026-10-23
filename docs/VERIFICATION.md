# Verification record

This file distinguishes implemented behavior, automated evidence and environment-blocked checks. No claim of zero bugs or guaranteed career outcomes.

## Environment

Linux build workspace; Node 24.22.1, npm 11.19.1, system Chromium. Tests use isolated temporary folders and synthetic records. No real employer data, real user accounts, paid provider calls or deployment.

## Automated checks (latest final run recorded in PROGRESS)

- `npm run check`: TypeScript client/server, domain/API/export tests, production frontend/server build.
- `npm run format:check`: source formatting.
- `node scripts/smoke-launcher.mjs`: install/build/serve/stop via the OS launcher with an isolated data folder; browser auto-open suppressed.
- `npm run test:exports`: synthetic XLSX, DOCX and LaTeX fixtures for repeatable Office inspection.
- `npm audit --omit=dev --audit-level=moderate`: dependency audit; registry snapshot, not a security guarantee.
- `npm run test:e2e`: independent synthetic local server, functional user journey and all-route desktop/mobile capture/overflow checks.

### Covered contracts

- Generic seed: 150 unique DSA + 50 SQL references, zero invented sessions.
- Capacity changes move forecast; task completion and prerequisites; recall interval/reset behavior.
- Offline quick log: explicit time/result only, truthful fallback note.
- Invalid dates/cycles/evidence; safe atomic store, conflict rejection, lock, corrupt-state backup recovery.
- Host/Origin/CSRF restrictions; revisions; disabled AI; private research URL rejection.
- XLSX value round-trip, changed-record preview, formula rejection and inflated ZIP guard; DOCX/LaTeX outputs.
- Full JSON/image portable backup, remapped restore, raster rejection, traversal rejection.
- Mock Ollama protocol, key absent from persisted settings/output, no mutation from generation alone.
- Browser: quick-log review/apply, persistent reload, note creation, practice attempt, profile/capacity, current versus planned resume visibility.
- All eleven routes at desktop 1440px/mobile 390px, plus relevant dialogs/error/navigation/theme states in final review.

## Not verified / not promised

- Native Windows double-click/browser launching on a user’s actual machine. CI exercises Node/build/tests on Windows, not interactive BAT browser UX.
- Live Google Sheets import/dropdowns/conversion and image-object behavior. Basic workbook compatibility only; check on your account.
- A real Ollama model’s quality/performance or paid cloud-provider credentials/billing. Protocol uses a synthetic mock.
- Every question URL’s present availability/premium status. Catalog is titles/links with selected original fallback briefs, not a promise of free access.
- Every job/source website; dynamic/authenticated/paywalled pages may fail and require paste.
- Arbitrary LaTeX/font compatibility, ATS scoring or pixel-identical PDF pagination across machines. The native compiler itself is tested; see below.
- Power loss on every filesystem, antivirus interference, very large workspaces or malicious local processes.
- Formal penetration test, accessibility certification or external code audit.

CI results and final remote SHA must be checked on the repository, not inferred from a workflow file. Any unavailable result is recorded as unavailable, not green.

## v0.2 additional evidence

- 18 Node tests and 5 browser journeys pass locally, including source/backup preservation, imported CRLF text, trusted compilation consent, PDF preview/download, stale-output protection, research retry/persistence/interruption/citation failure, nonsoftware planning and preservation of progressed/custom work.
- Official Tectonic install/checksum, actual PDF generation, cached offline compilation and invalid source rejection pass on Linux and Windows in Actions run [39919168777](https://github.com/OfficialAshish/career-switch-planner/actions/runs/39919168777). Windows standard-directory lookup was fixed after the native smoke exposed the issue.
- A retry timing test was corrected to wait for durable persistence and worker idle, rather than starting another worker while the previous failure was still saving. Apply also refuses an active worker.
- Keyless DuckDuckGo returned a challenge in the test environment; Bing RSS fallback returned real results and a page was retrieved. These are best-effort integrations, not a supported search-service SLA. No Brave key or paid model was tested.
- Both generic resume templates compiled with the real native compiler. The owner-specific latest attachment was separately rendered as a private one-page editable source/PDF, never public test data. It retains owner wording and placeholder links; it is not an independent fact check.
- A fresh public clone at `6da0713` passed locked installation, formatting, 18 tests, build, 5 browser journeys and shell launcher smoke. Check Actions for the newest pushed revision; older green runs do not prove later changes.

## v0.3 additional evidence

- New coverage exercises the topic/Markdown contract, stale responses, duplicate IDs, cycles, unsafe URLs, old schema defaults, stable workspace identity migration, full workbook records and long Unicode source/prompt preservation.
- Workbook tests cover semantic no-op round-trip, profile/resource/source/prompt edits, conservative three-way conflicts, unchanged app edits, explicit deletions, dangling references, malformed part sequencing, formula rejection, portable raster-image transfer and different-workspace replacement confirmation.
- Browser suite now covers **11 routes** at desktop/mobile, manual syllabus evidence/progress and persistence, editable context prompts, external Markdown preview/apply, reviewed Excel changes and actual sidebar overflow on a 390×420 screen.
- A synthetic exported workbook was opened/recalculated/resaved through local **LibreOffice**, then imported: **zero unintended record changes**, all 33 topics retained, capacity formula cached as 19 and hidden baseline retained. LibreOffice changes veryHidden to hidden, which the import tolerates. Microsoft Excel and Google Sheets were not directly exercised.
- Suggested starter resource locations were selected from known official documentation/course pages; they are labeled suggestions and were **not all fetched/checked live**. A model or strict schema cannot guarantee resource quality or career readiness.
- See PROGRESS for exact latest counts/revision. New AI syllabus generation uses a local synthetic structured-response provider; this verifies protocol and safety checks, not a real model's planning quality.

- Office recalculation exposed a date-text comparison issue in the weekly summary. Export now writes actual date cells (ISO display), uses numeric date bounds and retains ISO state values on import. LibreOffice recalculation of a known 45-minute current-week fixture gives **0.75 hours**; a dedicated regression checks the date cell type, formula and exact CRLF source preservation.
