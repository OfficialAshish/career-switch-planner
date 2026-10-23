# Engineering progress — v0.3

## New delivered scope

- **Complete workbook data portability:** Dashboard-first summary, all tracking collections, profile, syllabus/resources, chunked exact LaTeX source and saved prompts, hidden baseline plus referenced raster images and saved research archives.
- **Reviewed reconciliation:** three-way same-workspace comparisons, conservative conflict rejection, explicit deletions/reference validation, stale revision checks and consented different-workspace replacement. Missing rows never silently delete work. No live/background sync.
- **Syllabus beyond DSA:** 33 unstarted practical concepts, role-customizable areas, dependencies, evidence/status, docs/course/video links and links to existing Plan outcomes. A detailed concept does not create a second session/estimate automatically.
- **Any-AI exchange:** editable bounded-context prompts, copy/download, saved prompt documents, configured structured provider generation, external Markdown JSON import, new-record-only validation and explicit review/apply. No API required for import/manual tracking.
- **Scrollable navigation:** fixed sidebar scrolls on short/mobile viewports; native topic dialogs keep keyboard focus and report errors in-dialog.
- **Compatibility:** old states gain empty topic/prompt collections and persistent workspace identity with the pre-migration file preserved. Reviewed research replacement discards only unchanged unused starter topics, preserving custom/progressed topics and their prerequisites/tasks.

## Local verification

- Node 24 / Linux: formatting, client/server TypeScript, **31 domain/API/export/protocol tests**, production build, **7 browser journeys**, shell launcher smoke and production dependency audit pass (zero vulnerabilities at the registry snapshot).
- Browser suite includes desktop/mobile overflow capture of all **11 routes**, topic editing/persistence, saved prompts, external Markdown import/apply, workbook editing/import/apply and short-screen sidebar scrolling.
- Workbook tests include full-source Unicode chunks, arrays, profile/resources/prompts, app-only edits, overlapping conflicts, same-ID safety, deletions/references, formula rejection, ZIP guards and full cross-workspace transfer with image remapping and explicit confirmation.
- LibreOffice recalculation/resave → app import: **zero unintended changes**, 33 topics retained, formulas and hidden portable baseline retained. Direct Microsoft Excel / Google Sheets round-trip is **not verified**.
- AI syllabus protocol is tested with a synthetic local provider, including rejecting manufactured explain-ready status. No real model-quality or paid-key claim.
- Public-source/privacy scan passes; owner resumes and token files remain outside the repository. Private editable resume ZIP remains a separate handoff.
- Ubuntu/Windows Actions verification for this new revision must be checked after pushing; prior green v0.2 CI is not proof of v0.3 behavior.

## Honest limits and recovery

See [DATA](DATA.md), [SYLLABUS](SYLLABUS.md) and [VERIFICATION](VERIFICATION.md). Workbook formulas summarize data, not the application's full dependency/velocity engine or AI/compiler execution. Full workbooks contain personal data, including hidden baseline/assets. Keys, provider config, binaries and PDF cache are excluded; large workspaces need JSON or a copy of the stopped data folder. Resource links are suggested, not all live-verified. Preparation and self-reported status do not guarantee hiring readiness.

Clone public main and run start.bat / bash start.sh. Keep external backups; local recovery revisions do not protect against disk loss. Research archive restore is auxiliary to the atomic workspace save; preserve the original import if it reports an archive error.

---

## Earlier release history

# Engineering progress — v0.2

## Shipped implementation

Local-first LaTeX editing and research-driven planning are implemented and pushed to `main` in https://github.com/OfficialAshish/career-switch-planner. No mandatory switch date, invented experience or guaranteed career result.

- Foundation release: `0f7c801` (v0.1.0).
- v0.2 implementation checkpoints: `581b69c` → `f299917` → `5deb22e` → `13d8d3e` → `6da0713` → `f42bdb4`.
- Public repository contains generic templates and synthetic test data only. Owner resumes, private workspaces and authentication files are outside it.

## Delivered v0.2 acceptance

| Area              | Implementation / evidence                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact source      | UTF-8 `.tex` import, source-preserving autosave, revision checks, multiple documents, manual source download; API/browser tests                                              |
| Resume layout     | Compact classic centered-name/black-rule and blue professional templates; owner source remains independent from structured claims                                            |
| Real PDF          | Optional checksum-pinned Tectonic 0.17 install; explicit trust/package-network controls; real compilation, local PDF.js preview, stale-result guard, complete clean download |
| No watermark      | Compiler output is source-owned; no app branding, warning, URL or footer injected                                                                                            |
| Role-aware intake | Goal, demonstrated baseline, JD, location, capacity, optional URLs/context; nonsoftware Role track                                                                           |
| Research          | Model-generated bounded queries; DuckDuckGo → Bing RSS fallback or optional Brave API; pinned-DNS public HTTPS retrieval with redirect/body/time bounds                      |
| Planning          | Built-in source-grounding/uncertainty prompts, retrieved citation requirement, strict records and references, progress preservation, explicit full review/apply              |
| Retry/recovery    | Durable run stages, retained evidence, explicit retry/cancel, interrupted-run recovery, stale-revision rejection and atomic workspace recovery points                        |
| Privacy           | Keys memory/environment only; no model shell/file tools; no silent achievements/applications; opt-in network/context                                                         |
| Portability       | Old workspace compatibility; full JSON includes LaTeX documents and run history; Excel scope stays intentionally narrow                                                      |

## Verification ledger

- Linux Node 24.22.1/npm 11.19.1/system Chromium: formatting, client/server TypeScript, **18 domain/API/export tests**, production build and **5 browser journeys** pass.
- Browser tests cover original CRLF source retention, autosave/reload, actual PDF canvas rendering and byte-identical download from a synthetic compiler fixture, stale-PDF guard, research consent/retry/review, plus existing ten-route desktop/mobile workflows.
- Native Linux smoke: official compiler archive digest/install, real PDF generation, cached offline build and invalid-source rejection pass. Both generic templates also compiled with real Tectonic.
- GitHub Actions **39919168777**, revision `13d8d3e`: **Ubuntu and Windows succeeded**, including native compiler install/real PDF/offline cache/error tests, launcher smoke, production audit and Chromium journeys. Later revisions must have their own results checked in Actions; a workflow file alone is not success.
- Fresh public clone at `6da0713`: locked clean installation, formatting, type checks, 18 tests, build, 5 browser journeys and shell launcher smoke pass. Later `f42bdb4` changes only panel width; local full tests/browser checks pass.
- Production dependency audit snapshot: **zero reported vulnerabilities**, not a security guarantee.
- New editor/research screens individually reviewed at desktop/mobile. Review fixes include explicit accessible labels, reset source-trust consent, bounded failed live compilation, visible stale results, full-width intake and screenshot scroll normalization.
- Keyless live search fallback and actual public-page retrieval were exercised. Real provider quality, paid API credentials and all websites are not verified. Model protocol/JSON/context/key boundaries use a synthetic local server.
- Owner-supplied one-page resume was privately transcribed into fixed-layout editable text and an easier reflowing variant; both compile to one page. Fixed-layout text and link destinations were compared with the reference (whitespace/bullet/equivalent punctuation normalized). No personal source/PDF was committed. Original placeholder links remain explicitly called out in the private handoff.

## Recovery

Clone public `main`, read README, `docs/LATEX.md`, `docs/AI.md`, `docs/RECOVERY.md`, `docs/DATA.md` and `docs/VERIFICATION.md`. Personal state lives in ignored `data/`. Stop before copying that folder. Keep external full JSON/folder backups; local recovery revisions do not protect against disk loss.

## Honest limits

- Native compiler is not an OS sandbox. Compile owner-reviewed source only. Single-file `.tex`; no multi-file asset manager. Fonts/packages must be available; cached offline builds need a prior warm cache. macOS/ARM archive configurations still require native owner testing.
- Source citation and schema checks do not verify entailment, source relevance, salary, eligibility, achievements or hiring readiness. Search can be blocked; use supplied authoritative URLs/Brave and review warnings.
- Model speed/quality and paid-provider billing, Google Sheets conversion, native interactive Windows browser UX, arbitrary LaTeX/fonts, ATS outcomes, every external URL and formal audits are not promised.
- Research history has a 30-run cap; source documents a 20-document cap. Archive the stopped folder before a separate workspace when full. No encrypted-at-rest storage, hosted multiuser service, cloud sync or automatic applications.

## Security handoff

Never commit `data/`, `.env`, private resumes or credentials. The token pasted in chat is exposed and must be revoked by its owner. Temporary local authentication is deleted after final remote confirmation; deletion cannot remove a secret from chat history.
