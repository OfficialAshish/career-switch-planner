# Engineering progress

## Status

Working local-first v0.1 application implemented, visually reviewed and tested. Final handoff verification is in progress; see the latest GitHub checks for the exact revision. No calendar deadline, salary promise or guaranteed placement is built into the plan.

- Repository: https://github.com/OfficialAshish/career-switch-planner
- Branch: `main`; initial README commit `ec86791` preserved.
- Public source contains generic templates only. Personal archives, starter workspaces and credentials are outside the repository.

## Completed acceptance

| Package          | Evidence                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dynamic planning | Editable capacity/scope, prerequisite order, time logged once, remaining estimates, forecast ranges and pace calibration; domain tests            |
| Persistence      | Strict schema/reference validation, atomic saves, revision conflicts, single-process lock, 40 recovery points; API/store tests                    |
| Local security   | Loopback binding, Host/Origin/CSRF checks, bounded imports/provider responses, private network source-reader restrictions; synthetic tests        |
| Interface        | Ten React routes; quick capture, practice/recall, notes/screenshots, projects/gates, claims/resumes, interviews, applications, research, settings |
| Optional AI      | Disabled by default; Ollama/compatible providers, memory-only key, context opt-in, review before applying, no shell/delete/profile/catalog edits  |
| Files            | JSON/image backup and restore preview; XLSX plain-value upserts; DOCX/LaTeX/print resume; automated exchange tests                                |
| Setup            | Windows BAT and shell launchers; initial dependency install/build, then local server; isolated launcher smoke tests                               |
| Open source      | MIT license, README, contribution/security guides, architecture, data, AI, recovery, privacy, decisions and verification documentation            |

## Verification ledger

- Linux: Node 24.22.1, npm 11.19.1, system Chromium.
- `npm run check`: client/server type checks, **13 tests**, production build pass.
- `npm run test:e2e`: **3 browser tests** pass, including all ten routes at 1440px/390px, capture/reload, practice, resume modes, visible dialog errors, screenshot uploads, mobile navigation and dark theme.
- Manual visual inspection: each route at desktop/mobile, AI error, image editor, navigation and dark mobile states. Fixed missing icon glyphs, modal footer/error visibility and route scroll retention found during review.
- `node scripts/smoke-launcher.mjs`: Linux shell launcher builds and serves an isolated synthetic workspace.
- Fresh public clone at `c30ba61`: clean install, formatting, type/test/build and browser checks passed; a final-revision clean clone check follows this checkpoint.
- `npm audit`: zero reported vulnerabilities in the local full dependency snapshot; registry audit is not a security guarantee.
- GitHub Actions run **39850892067**, revision **4242d625**: **Ubuntu and Windows passed**, including launcher smoke tests and Chromium journeys. Later release-polish commits require their own checks.
- Synthetic XLSX audit: valid package, 13 sheets, 8 formulas, no external links, zero issues. ISO date strings intentionally retain canonical import format (reported as two text-date warnings). Dashboard rendered and reviewed; print layout refined afterward.
- `npm run test:exports` creates repeatable synthetic Office fixtures under ignored `test-results/exports`; no private workspace is used.

## Known limits

Native interactive Windows double-click/browser UX, actual Google Sheets conversion, real Ollama/paid-provider quality, all external question/job URLs, LaTeX compilation and formal accessibility/security audits were not performed. Source reader is an explicit public-page fetcher, not autonomous web search. See `VERIFICATION.md` and `ROADMAP.md`.

## Recovery and continuation

Inspect the working tree before syncing. Read this file, `DECISIONS.md`, `ARCHITECTURE.md` and known limitations. Never overwrite unrelated work or commit `data/`, `.env`, credentials or personal documents. Completed checkpoints are pushed to `main`; Git history and the private Notion engineering tracker retain recovery context. No access token is part of source or Git remote URLs.
