# Decisions

- **DEC-001 — Local Node + React, no accounts.** Bind to `127.0.0.1`; persist under ignored `data/`. Not a LAN server, hosted SaaS or GitHub-sync app.
- **DEC-002 — Canonical validated JSON.** Atomic writes, serialized mutations, revision checks and rotating backups. Avoid native database installation for a one-person portable tool.
- **DEC-003 — Competencies, not February.** Optional goal date; remaining-work forecasts and prerequisite-aware weekly planning. Never predict offers from hours.
- **DEC-004 — AI proposes, server validates, person approves.** No shell execution, arbitrary paths or unattended destructive agent. Deterministic quick logging works without a model.
- **DEC-005 — Provider credentials remain separate.** Memory-only keys by default; optional environment-based configuration. Never export keys or include them in prompts.
- **DEC-006 — Portable data.** JSON is full-fidelity. Excel is an interoperable activity tracker with clearly bounded import semantics; documents are generated views of editable source.
- **DEC-007 — Public code, private user material.** Use generic examples and original practice scaffolding; do not publish the owner's resume, compensation or career archive.
- **DEC-008 — One launcher after prerequisites.** Node 24+ and npm required. First dependency installation requires internet; installed core runs offline. Do not silently install system runtimes or weaken security.