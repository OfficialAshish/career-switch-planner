# LaTeX studio: your source, your PDF

Open **Resume → LaTeX editor & PDF**. The studio is separate from the structured claim editor: editing one never silently overwrites the other.

## Start with an existing resume

1. Choose **Import original .tex**. The app preserves the UTF-8 source, including line breaks; it does not rebuild it from structured claims.
2. Edit the document title and source. Changes autosave after 800 ms to `data/workspace.json`, with normal revision conflicts and recovery copies. A visible save error means **download/copy your text before leaving**.
3. Expand **Compiler setup & privacy**. Explicitly allow the optional official compiler download, then install. No cloud compiler account is needed.
4. Review your source, then select the trust checkbox. For the first build, allow package downloads; press Compile. Missing fonts/packages are reported, not substituted with an allegedly identical layout.
5. After the packages are cached, turn package-network access off. Enable live compilation if desired: edits trigger a debounced compile. A failed source is not automatically retried endlessly; fix it or press Compile explicitly.
6. Preview the actual PDF pages, then download the complete PDF or open it for printing. If the source changes, the old PDF is marked stale and cannot be mistaken for a current download. Printing an existing PDF does not add the app's URL/header.

There is **no app watermark, branding, footer or inserted warning** in compiler output. Text already present in an imported source—including its own draft warning—remains user-owned text. Removing an app watermark is unnecessary because none is injected. Verify factual claims before applications.

## Templates and layout

New documents can use **Compact classic** (centered name/contact line, black section rules, compact sans-serif text, right-aligned heading helper) or **Blue professional**. Both use only explicitly Verified structured claims at creation; later changes are manual. They are starting layouts, not an automatic promise of one-page pagination.

Use `\roleheading{Title}{Location | Dates}` in the compact template. Adjust geometry margins, font sizes, `\ressection` spacing, item spacing and content directly. Imported coordinate-based sources can move a line by editing its x/y values; they preserve a fixed visual layout but do **not** automatically reflow paragraphs. A normal flow-based source rewraps text automatically.

A PDF alone is not editable LaTeX. This app does not claim universal PDF-to-LaTeX conversion. Import a source supplied by its author, or create a transcription and compare it against the PDF. Personal example files are intentionally not shipped in the public repository.

## Compiler and platform requirements

- Optional **Tectonic 0.17.0**, fixed official GitHub release archives with SHA-256 verification before extraction. Linux x64/arm64, Windows x64 and macOS x64/arm64 archives are configured; Linux x64 and Windows x64 are exercised in CI. Other platforms require owner testing.
- The installer uses the OS `tar` utility. Modern Windows includes `tar.exe`; if unavailable, install/manage Tectonic yourself and set `CAREER_TECTONIC_PATH` to its absolute executable path.
- Binary: `data/tools`; package cache: `data/tex-cache`. Both are ignored by Git. First dependency/package downloads require internet. Cache reuse allows offline compilation only for already available packages/fonts.
- Fonts are not embedded in `.tex` sources. Arial/fontspec examples need Arial installed. For portable templates use available TeX fonts. This app does not redistribute proprietary fonts.
- Source is currently a **single file**. No image/BibTeX/custom-class asset upload or multi-file project manager. Use self-contained resumes; existing multi-file sources may need flattening first.
- Max 20 documents, 200,000 source characters each; 120-second compiler timeout; 10 MB output PDF; browser preview up to ten pages, download all pages.
- Source documents are included in full JSON backups. They do not round-trip through Excel. Compiler binaries/cache are not in the JSON export; stopped-folder backups preserve them.

## Security boundary

Tectonic runs with `--untrusted`, shell escape disabled, a private temporary working directory, a minimal environment without provider keys, bounded output and a timeout. **This is not an OS sandbox.** A native compiler is a larger attack surface; compile only source you have reviewed and trust. Do not feed unreviewed internet/LLM LaTeX to it. The trust checkbox resets when switching/importing documents.

“Network off” means Tectonic's `--only-cached` mode, not a system firewall. Source is not uploaded to a cloud compiler, but an enabled package fetch contacts upstream bundle servers. Use OS sandboxing/network controls if you need stronger isolation.
