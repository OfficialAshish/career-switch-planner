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

Maximum 30 AI operations, 20,000 input characters, 1 MB provider response and 60 seconds. Only one provider request at a time. No delete tool, shell, arbitrary file path, database access or browsing tool. A proposal may still be factually wrong: validation prevents invalid structure, not hallucinations. Review replacement records carefully; fields are complete upserts, not partial patches. Evidence statuses are your responsibility.

## Built-in modes

- Log: minimal truthful sessions/attempts/notes.
- Plan: competency/prerequisite refinement without resetting completed work.
- JD: grounded requirements, matches, gaps and interview preparation.
- Research: summarize supplied excerpts with URLs/dates and limitations.
- Resume: wording without invented metrics, preserving Planned/Working/Verified.
- Interview: real stories, placeholders for unknown incident facts, follow-ups.

Canonical editable developer contract: `shared/prompts.ts`. Restart/rebuild after source changes. The AI cannot perform autonomous live market research; fetch/paste source material first. A source excerpt can contain prompt injection; it is explicitly treated as data, and changes still require review.

## Failures

Timeout, unavailable model, HTTP failure, malformed JSON, invalid record or broken references produce an error and no workspace save. Retry a smaller request. No synthetic “success” fallback. Your unsent text remains in the dialog; copy it before closing. Real provider/model quality and cloud billing were not tested with paid credentials in the implementation environment; protocol behavior is tested with a synthetic local server.
