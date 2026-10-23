# Security policy

This is a **single-user local application**. Never expose its port through a public proxy, tunnel, LAN binding or internet host. There is no authentication/multi-user authorization model.

## Implemented protections

- Explicit `127.0.0.1` binding; exact localhost/127.0.0.1 Host and Origin allowlists including port; cross-site fetch rejection.
- Per-process request token for mutating API routes, no permissive CORS, no frames, no external scripts/fonts, restrictive CSP, no-store API responses.
- Strict Zod record and operation schemas; bounded body sizes, record arrays, imports and AI calls; reference/cycle checks; expected-revision conflicts.
- Atomic JSON writes, single-process lock, prior-state backups and corruption recovery without an empty reset.
- Raster-only bounded image uploads with magic-byte checks; generated file names and validated IDs. No SVG/HTML/JS attachment upload.
- HTTPS-only public-page retrieval with private/reserved IPv4 blocking, pinned DNS, validated redirects, no credentials/cookies, bounded body and timeout. IPv6-only sources are not supported.
- Explicit provider selection; no URL-embedded credentials; remote AI requires HTTPS. No provider redirects. Keys memory/environment only.
- AI proposals cannot execute tools, arbitrary paths, shell, SQL or deletes; full preview and explicit Apply. Source text is never rendered as HTML.
- Workbook ZIP resource guard, formula rejection in imported data and plain-text exports; no macros.

## Boundaries and residual risks

No encryption at rest, OS sandbox, malicious-local-process protection, browser-extension isolation or multi-device locking. Loopback is not identity. A local process with file access can read data or call the API. Use OS account permissions/disk encryption. Raster magic-byte validation is not a full image decoder or antivirus; upload trusted small images. Local backups and removed attachments remain on disk. Downloaded documents contain personal data.

Trusted provider endpoints may receive an environment API key; verify endpoint ownership before enabling one. The research reader is not a universal SSRF library for public hosting and deliberately favors blocking. An untrusted model can make structurally valid but factually false edits; human review remains essential.

The project does not auto-update, deploy, install Node, install models or run cloud infrastructure. Review third-party dependency updates. The lockfile pins current versions; a uuid 11.1.1 override resolves GHSA-w5hq-g745-h8pq in ExcelJS’s transitive dependency. ExcelJS uses UUID v4; export/import behavior is tested after the override.

## Reporting

Do not open a public issue containing credentials, personal resumes, client data or exploit payloads with private data. Use GitHub’s private vulnerability reporting if enabled on this repository; otherwise contact a maintainer through a private channel listed on their GitHub profile. Provide a synthetic reproduction and affected commit. No security audit or zero-vulnerability guarantee is implied by passing tests.

## Optional native compiler and online research

LaTeX compilation is opt-in and accepts only explicitly trusted source. `--untrusted`, no shell escape, temporary cwd, minimal environment and time/output bounds are defense in depth, **not an OS sandbox**. Compile owner-reviewed source only. Installer archives are pinned to Tectonic 0.17.0 with SHA-256 checks. Research uses fixed search adapters and the public-HTTPS reader, with pinned DNS/redirect checks and body/time bounds. Retrieved text/JDs are untrusted prompts. Schema/citation checks do not establish factual truth or source relevance; review remains necessary. No model shell/file tools or automatic plan application are exposed.
