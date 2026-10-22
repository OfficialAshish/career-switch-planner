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
- All ten routes at desktop 1440px/mobile 390px, plus relevant dialogs/error/navigation/theme states in final review.

## Not verified / not promised

- Native Windows double-click/browser launching on a user’s actual machine. CI exercises Node/build/tests on Windows, not interactive BAT browser UX.
- Live Google Sheets import/dropdowns/conversion and image-object behavior. Basic workbook compatibility only; check on your account.
- A real Ollama model’s quality/performance or paid cloud-provider credentials/billing. Protocol uses a synthetic mock.
- Every question URL’s present availability/premium status. Catalog is titles/links with selected original fallback briefs, not a promise of free access.
- Every job/source website; dynamic/authenticated/paywalled pages may fail and require paste.
- LaTeX compilation for arbitrary Unicode, ATS scoring or identical Office/PDF pagination.
- Power loss on every filesystem, antivirus interference, very large workspaces or malicious local processes.
- Formal penetration test, accessibility certification or external code audit.

CI results and final remote SHA must be checked on the repository, not inferred from a workflow file. Any unavailable result is recorded as unavailable, not green.
