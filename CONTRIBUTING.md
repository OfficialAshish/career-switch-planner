# Contributing

Small complete improvements welcome. Read ARCHITECTURE, SECURITY, DATA and DECISIONS first. Keep local-first/offline core; avoid adding accounts, telemetry, cloud infrastructure or framework rewrites without a clear proposal.

## Setup and checks

Node 24+, `npm ci`, `npm run check`, `npm run format:check`. Install Playwright Chromium once, then `npm run test:e2e`. Set CHROMIUM_PATH only if using an existing system browser. Browser tests start their own isolated temporary workspace. Windows and Linux CI do not deploy.

Add meaningful regression tests for schema, planner, persistence, API boundaries and data exchange. Preserve backwards compatibility or provide an explicit schema migration. Never weaken tests merely to turn a failure green. Use synthetic data; do not commit data/, real resumes, tokens, exports or provider payload logs. No arbitrary SQL/shell/filesystem model tools.

## Pull requests

State problem, contract/compatibility impact, implementation, tests, manual checks and limitations. Keep unrelated refactors separate. Include screenshots for visible desktop/mobile changes. Required accessibility: real labels, keyboard navigation/focus, readable contrast, responsive layouts and honest empty/error/loading states.

Use `[AREA] Scope: what changed — why` where helpful. Do not auto-deploy on branch pushes. MIT contribution; preserve attribution and third-party terms. For private security issues follow SECURITY.md rather than posting secrets publicly.
