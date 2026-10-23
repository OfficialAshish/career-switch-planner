# Optional AI: setup and boundaries

## Local Ollama

1. Install Ollama using its official documentation: https://ollama.com/ . Download a model appropriate to your machine. This initial download needs internet and may be several GB.
2. Ensure Ollama is listening on its default loopback endpoint. Do not expose it to your LAN to use this app.
3. In Settings choose Local Ollama, endpoint `http://127.0.0.1:11434`, and the exact model name shown by your Ollama installation.
4. Save, then try a small Quick log → Use optional AI request. Review every field before applying.

The app does not install models, run shell commands or automatically select a GPU model. Ollama mode accepts loopback only. A structured-output-capable instruct model is preferable. Weak/small models may fail validation; use the offline parser/manual editor rather than accepting malformed output.

## Compatible cloud/local API

Use an explicitly trusted OpenAI-compatible chat-completions provider. Endpoint is its base URL, often `https://provider.example/v1`; the server appends `/chat/completions`. The adapter sends `response_format: json_object`, temperature 0.2 and a 4096 output-token request. Providers with different requirements may reject this contract. Loopback compatible endpoints may use HTTP; remote endpoints require HTTPS. No redirects or URL-embedded credentials.

The key entered in Settings lives only in server memory. Restart clears it. Alternatively supply `OPENAI_API_KEY` in the server environment. The app never saves the key in provider.json, returns it, includes it in backups or logs request bodies. Clearing the in-memory key does not unset an environment-provided key. Remove that environment variable and restart if needed.

## What is sent

- Your request text, selected mode instructions and current UTC date.
- **Only if you tick context:** target role/capacity, up to 100 tasks (evidence truncated), 10 projects, 20 claims, readiness gates and up to 200 question IDs/titles.
- Not automatically: contact details, all notes, images, source list, session history or credentials. Text you deliberately paste can still contain those; inspect it before sending.

Cloud providers receive this content under their own terms. There is no telemetry or central app service. A configured remote endpoint is trusted to receive your request and key; do not paste an endpoint from an untrusted JD or model response.

## Safe proposal lifecycle

Request → bounded provider call → JSON parsing → strict allowed operation schema → dependency/reference validation → displayed full records → explicit Apply → expected revision check → backup and atomic save.

Maximum 30 AI operations, 20,000 input characters, 1 MB provider response and 60 seconds. Only one provider request at a time. AI proposals cannot modify profile facts or the practice catalog. No delete tool, shell, arbitrary file path, database access or browsing tool. A proposal may still be factually wrong: validation prevents invalid structure, not hallucinations. Review replacement records carefully; fields are complete upserts, not partial patches. Evidence statuses are your responsibility.

## Built-in modes

- Log: minimal truthful sessions/attempts/notes.
- Plan: competency/prerequisite refinement without resetting completed work.
- JD: grounded requirements, matches, gaps and interview preparation.
- Research: summarize supplied excerpts with URLs/dates and limitations.
- Resume: wording without invented metrics, preserving Planned/Working/Verified.
- Interview: real stories, placeholders for unknown incident facts, follow-ups.

Canonical editable developer contract: `shared/prompts.ts`. Restart/rebuild after source changes. The single-proposal dialog does not browse; use the bounded workflow below for server-orchestrated search and retrieval. A source excerpt can contain prompt injection; it is explicitly treated as data, and changes still require review.

## Failures

Timeout, unavailable model, HTTP failure, malformed JSON, invalid record or broken references produce an error and no workspace save. Retry a smaller request. No synthetic “success” fallback. Your unsent text remains in the dialog; copy it before closing. Real provider/model quality and cloud billing were not tested with paid credentials in the implementation environment; protocol behavior is tested with a synthetic local server.

## In-app role-aware research and planning (v0.2)

The **Research → Research & generate plan** workflow performs bounded online research on request. This is different from the older single-proposal Research button, which only summarizes supplied excerpts.

1. Configure your model in Settings. Use a capable instruct model supporting complete JSON records; comprehensive plans need more output than a short quick-log request.
2. Enter target role/goal, demonstrated baseline and gaps, optional JD, location constraints and actual weekly hours. Nonsoftware careers are supported through Role/Career/Interview tracks, not forced into DSA.
3. Optionally supply authoritative source URLs. Choose whether unused generic starter tasks/gates may be replaced. Completed, evidence-bearing, session-linked and custom tasks are preserved; dependencies needed by preserved work are retained.
4. Consent to online research. Optional workspace context remains off unless selected. The goal, JD and baseline are sent to the configured model; generated role queries go to the search engine and requested pages receive ordinary public requests. **Do not paste secrets or contact details.** Basic identifier filtering is not full anonymization.
5. The model generates up to three queries. Default best-effort DuckDuckGo HTML falls back to Bing RSS; those interfaces can block, change or return irrelevant results. For a supported API, enter a Brave Search API key in the workflow settings or use `BRAVE_SEARCH_API_KEY`. Keys entered in-app are memory-only. A search key is separate from your LLM key.
6. The server retrieves up to six public pages using pinned public DNS, HTTPS and bounded redirects/body/time. No logins, browser automation, paywall bypass, paid applications or job submissions. Supplied source URLs are attempted first.
7. Built-in prompts ask for actual role/JD gaps, prerequisites, estimated work, deliverables, measurable gates and interview practice, plus a research note separating supported findings, inference, contradictions and missing evidence. They require actual retrieved URLs and no invented pay, achievements or hiring guarantees. At least one retrieved URL must appear in the proposal's summary/research notes; this checks provenance format, **not factual entailment or source relevance**.
8. Review queries, excerpts, warnings and the full proposed records. Apply explicitly. Apply sets the **user-entered** weekly hours and saves tasks/projects/gates as uncompleted, retrieved sources and an audit note. It cannot manufacture sessions, attempts, verified claims or applications. If the workspace revision changed, regenerate before applying.

Runs and progress are saved in `data/research-runs`. A restart marks unfinished work Interrupted. Retry reuses retrieved evidence where possible; cancel stops future stages, but an already running bounded HTTP/model request may finish before the worker becomes idle. No hidden automatic retry or recurring background agent. A model invocation may time out after 60 seconds; a whole multi-stage workflow takes longer. Retry can incur provider charges. Up to 30 runs are retained; preserve/archive the stopped data folder before starting a separate workspace when full.

The synthesis mode requests up to **8192 output tokens** (other modes 4096); Ollama receives a 32768 context request. Providers/hardware may reject these settings or return truncated JSON. Invalid/missing-citation outputs fail visibly and never apply silently. These bounds do not guarantee research quality. Read original employer/professional sources, verify dates/country eligibility and challenge weak results before applying.

The model itself has no shell/filesystem/browser tools. The server orchestrates the fixed search/read steps and passes excerpts as untrusted data. Prompts are built in at `shared/prompts.ts`; query instructions live in `server/ai.ts`. Change them in source and rebuild if needed. A different career does not require editing these prompts first.

Full JSON backups include research history; restored unapplied runs must be regenerated. Recovery of the workspace alone is separate from run history. Provider/search keys are never included.

## Editable syllabus prompts and external AI

Syllabus has a separate context-aware prompt editor and strict Markdown exchange for use without any API. In-app generation and external imports use the same new-record-only validation; neither creates completed activity. Source-grounded online research remains a separate consent-based workflow. See [Syllabus](SYLLABUS.md).
