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
