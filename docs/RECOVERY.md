# Recovery and troubleshooting

## Resume development after an interrupted environment

1. Inspect local `git status`, branch and uncommitted work before fetching. Preserve unrelated work.
2. Read PROGRESS, DECISIONS and VERIFICATION; check the remote branch SHA. Do not restart completed work blindly.
3. Clone if the sandbox was lost, install Node 24+, run `npm ci` and `npm run check`.
4. Public source has no personal data. Restore your private JSON backup or stopped-server data-folder copy separately.

## Startup

- **Node not found/too old:** install Node 24 LTS+ from its official website and open a new terminal.
- **First run without internet:** install dependencies while connected once. No bundled Node/modules/models are distributed.
- **Port busy:** close the earlier server. Or set `PORT` (e.g. 4320) before launch. Do not change binding to 0.0.0.0.
- **Browser did not open:** read terminal and manually open the printed URL. Windows opening is a convenience, not data storage.
- **Build failure:** keep the error; run `npm ci` and `npm run check`. Do not delete data as a troubleshooting ritual.
- **Watched development:** `npm run dev` builds UI once and watches server TS; frontend edits require another build. Production start uses dist, not source TS.

## Data and locks

Every committed save backs up the previous JSON state under `data/backups/`; up to 40 revisions are retained. UI → Settings → Local recovery. Restoring increments revision and backs up current state first. Images are retained so recovery points can reference them.

A valid current file is never replaced merely because it contains no sessions. If JSON is corrupt, startup tries the newest valid backup, preserves the unreadable original as `.corrupt-...`, and displays a notice. With no valid backup it stops rather than seeding an empty replacement.

`.server.lock` contains a PID. A live PID blocks a second server. A definitely stale PID can be reclaimed. If an unrelated process reused that PID, startup may conservatively block; verify the process is not using this folder before removing the stale lock. Never remove a live server’s lock or run two servers on one data folder.

Atomic replacement can fail due to antivirus, permissions or full disk, especially on Windows. Free space, stop the server safely, preserve data/temp files, then retry. Back up externally; local recovery does not survive disk loss.

## Conflict / failed save

Another tab may have changed the revision. Copy unsaved draft text, load latest from the error banner and review/reapply. The app will not silently overwrite newer work. Keep a single editing tab for simplest use. A failed model/import proposal does not save workspace state. Image uploads can remain unreferenced if a later form is canceled.

## AI and research

- No model configured: use offline parser or set provider/model.
- Missing model/HTTP failure: verify exact provider endpoint/model and credentials; no fake response is substituted.
- Timeout/invalid JSON: smaller request or more capable local model. Protocol is bounded at 60 seconds and 1 MB output.
- Source blocked/redirect/IPv6-only/dynamic page: paste a trustworthy excerpt with source URL/date. No bypass of authentication or paywalls.

## Moving/updating safely

Export full JSON or copy the stopped data folder first. Pull source updates, run the launcher (lockfile changes trigger npm ci), verify a small real save and export again. Never run `git clean -xfd` in a working clone: it would delete ignored data. For a large workspace, stopped-folder copy is the complete backup path. Provider keys must be re-entered after restart/migration.
