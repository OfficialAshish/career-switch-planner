# Engineering progress

## Next step
Implement the shared schema, deterministic planner and safe local persistence.

## Baseline
- Existing repository: one initial README commit, `ec86791`; no application or unrelated changes.
- Repository: https://github.com/OfficialAshish/career-switch-planner
- Branch: `main` (new application repository, existing initial commit preserved).
- Public source contains generic templates only. Personal archive/resumes and credentials stay outside this repository.

## Work packages
| Package | Acceptance | Status |
|---|---|---|
| Bootstrap | Reproducible package/lockfile; remote recovery checkpoint | in-progress |
| Domain and persistence | Validated data, atomic saves, backups, revision conflicts, dynamic planning tests | todo |
| Local API/security | Loopback only, Host/Origin/CSRF, bounded input, private credentials, safe attachments | todo |
| UI | Responsive React workspace; quick logging, practice, notes, plan, projects, resumes, interviews, jobs, research | todo |
| AI and research | Optional bounded proposals; explicit review; local/cloud providers; pasted JD/source research | todo |
| Portability | JSON backup including images; Excel export/import with documented scope | todo |
| Launch/setup | Windows BAT plus shell launcher; clear prerequisites and offline behavior | todo |
| Verification/handoff | Tests/build/browser checks, docs, pushed commits, confirmed remote SHA | todo |

## Recovery
Inspect working tree before syncing. Read this file, DECISIONS, architecture and known limitations.
Never overwrite unrelated work or commit `data/`, `.env`, credentials or personal documents.
Commits are pushed after each complete logical checkpoint. Record failures truthfully.

## Evidence
- Node v24.22.1, npm 11.19.1 available in Linux build environment.
- Package registry and GitHub reachable.
- Windows launch cannot be executed natively in this Linux environment; static review and Windows CI will be distinguished from local execution.