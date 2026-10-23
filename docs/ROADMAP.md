# Roadmap: proposed, not implemented

Prioritize user value and privacy over feature count.

## Small next improvements

- Multi-file LaTeX assets, richer source editing, research-history archiving UI and stronger source relevance/ranking checks. Current workflows remain bounded and review-required.

1. A reviewed legacy-tracker mapping wizard with sample fixtures, not guessed column conversion.
2. Dedicated all-session/attempt history editors and undo after manual deletion (current corrections use recent-session editor, record forms, recovery points and Excel).
3. Modularize route components as they grow; maintain one canonical schema and operation boundary.
4. Better local baseline intake and estimated-time calibration, including explicit review/application capacity reservations.
5. More offline guided technical Q&A cards and rubric-driven mock feedback using user-provided evidence.
6. More source-reader fixtures, image dimension checks, import fuzzing and failure-injection filesystem tests.

## Requires design before building

- Backup schema migrations as versions evolve.
- Optional encrypted backup format with recoverable key management, not a cosmetic password field.
- A deliberate provider capability negotiation layer for models that lack JSON response format support.
- Selective read-only buddy snapshots with privacy preview; never silently auto-share personal notes.

## Deliberately out of current scope

Hosted multi-user SaaS, public server deployment, automated applications, salary prediction, automatic resume fabrication, unbounded browsing, model shell tools, GitHub-token sync and production-grade recruiter databases. Any future remote version requires authentication, authorization, tenancy, hardened upload/SSRF controls and a new threat model.
