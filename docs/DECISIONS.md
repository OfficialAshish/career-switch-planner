# Decisions

- **DEC-001 — Local Node + React, no accounts.** Bind to `127.0.0.1`; persist under ignored `data/`. Not a LAN server, hosted SaaS or GitHub-sync app.
- **DEC-002 — Canonical validated JSON.** Atomic writes, serialized mutations, revision checks and rotating backups. Avoid native database installation for a one-person portable tool.
- **DEC-003 — Competencies, not February.** Optional goal date; remaining-work forecasts and prerequisite-aware weekly planning. Never predict offers from hours.
- **DEC-004 — AI proposes, server validates, person approves.** No shell execution, arbitrary paths or unattended destructive agent. Deterministic quick logging works without a model.
- **DEC-005 — Provider credentials remain separate.** Memory-only keys by default; optional environment-based configuration. Never export keys or include them in prompts.
- **DEC-006 — Portable data.** JSON is full-fidelity. Excel is an interoperable activity tracker with clearly bounded import semantics; documents are generated views of editable source.
- **DEC-007 — Public code, private user material.** Use generic examples and original practice scaffolding; do not publish the owner's resume, compensation or career archive.
- **DEC-008 — One launcher after prerequisites.** Node 24+ and npm required. First dependency installation requires internet; installed core runs offline. Do not silently install system runtimes or weaken security.

## DEC-009 — Excel dependency safety

Use a pinned uuid 11.1.1 override rather than downgrading ExcelJS to an old major. ExcelJS calls v4, whose CommonJS interface remains available. Re-run workbook round-trip, import rejection and exporter tests after updates. Registry audit reported zero vulnerabilities after this change; this is not a security guarantee.

## DEC-010 — Manual deletion, never model deletion

Permit explicit, confirmed deletion of editable manual records with expected revision and a backup. Reject broken references instead of cascading silently. AI still has no delete operation. Retain image files for recovery points; full privacy deletion requires intentional stopped-folder cleanup.

## DEC-011 — No inferred legacy import or universal model compatibility

Workbook import accepts this app's documented sheets/plain values and shows exact upserts. Unknown legacy headers are not guessed. The model adapter supports bounded Ollama/OpenAI-compatible JSON contracts; unsupported provider behavior errors visibly instead of silently corrupting state. These limits are disclosed, not hidden behind a fake success.
