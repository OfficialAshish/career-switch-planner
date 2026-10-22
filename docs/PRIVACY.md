# Privacy and data ownership

No app account, telemetry, analytics, ad SDK, central database or background cloud sync. The browser loads assets from the local server. Normal tracking does not contact external websites.

Your local JSON, images and backups can include resume contacts, job notes and sensitive career information. They are not encrypted by the app. The `data/` folder is ignored by Git, but that does not protect a manually uploaded archive, a cloud-synced folder or another OS user with file access.

External connections are explicit: clicking an external link opens that website; fetching a public source sends a request from your computer; requesting a provider proposal sends the chosen prompt/context to that provider. Package/model installation needs internet. Provider terms and possible retention/billing are outside the app.

Full JSON/Excel/DOCX/LaTeX/PDF exports may contain personal data. Review before sharing. Friends should share sanitized tracker viewer/commenter links rather than credentials or private employer artifacts. Do not upload someone else’s confidential information merely because a notes field accepts it.

To remove one record, use its editor’s Delete action (recovery copies remain). Referenced tasks cannot be deleted until dependencies and session links are removed manually. For complete deletion, stop the server, delete the data folder and any external exports/backups, clear provider environment variables and your browser downloads. This cannot recall copies already shared or sent to a provider. Never delete the only copy of valuable work without an intentional backup.
