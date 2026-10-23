import React, { useState, useEffect, useRef } from 'react';
import type { State, Topic } from '../shared/schema';
import { tracks } from '../shared/schema';
import { syllabusPrompt } from '../shared/syllabus';
import { api, type Preview } from './api';

function download(text: string, name: string) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Syllabus({ state, onState }: { state: State; onState: (s: State) => void }) {
  const [search, setSearch] = useState(''),
    [area, setArea] = useState('All'),
    [editor, setEditor] = useState<Topic>(),
    [prompt, setPrompt] = useState(''),
    [markdown, setMarkdown] = useState(''),
    [preview, setPreview] = useState<Preview>(),
    [base, setBase] = useState(state.revision),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function propose(path: string, body?: unknown) {
    setPreview(await api(path, body));
    setBase(state.revision);
  }
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (editor && !dialog.current?.open) dialog.current?.showModal();
  }, [!!editor]);
  const blank = (): Topic => ({
    id: crypto.randomUUID(),
    title: '',
    area: 'Python foundations',
    track: 'Backend',
    objective: '',
    prerequisites: [],
    taskId: '',
    status: 'Not started',
    evidence: '',
    notes: '',
    resources: [],
    updatedAt: new Date().toISOString(),
  });
  return (
    <section className="syllabus">
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="callout">
          {message}
        </p>
      )}
      <p>
        Track concepts, hands-on work and explanation—not just DSA. Resources open directly from
        each topic. A linked plan outcome shares the same time budget: log its minutes once in
        Today. Explain-ready is your assessment, not an automatic audit.
      </p>
      <div className="toolbar">
        <button className="primary" onClick={() => setEditor(blank())}>
          + Add topic
        </button>
        <button disabled={busy} onClick={() => run(() => propose('syllabus/starter'))}>
          Review starter syllabus
        </button>
      </div>
      <div className="form-grid">
        <label className="field">
          Find a concept
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="field">
          Learning area
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {['All', ...new Set(state.topics.map((t) => t.area))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        {state.topics.filter((t) => t.status === 'Explain-ready').length}/{state.topics.length}{' '}
        explain-ready · {state.topics.filter((t) => t.resources.length).length} with resources.
        Starter links are suggestions, not live-verified endorsements.
      </p>
      <div className="cards">
        {state.topics
          .filter(
            (t) =>
              (area === 'All' || t.area === area) &&
              JSON.stringify(t).toLowerCase().includes(search.toLowerCase()),
          )
          .map((t) => (
            <article className="card" key={t.id}>
              <span className="tag">
                {t.area} · {t.status}
              </span>
              <h3>{t.title}</h3>
              <p>{t.objective}</p>
              <p className="muted">
                {t.prerequisites.length
                  ? 'First: ' +
                    t.prerequisites
                      .map((id) => state.topics.find((p) => p.id === id)?.title || id)
                      .join('; ')
                  : 'No topic prerequisites'}
              </p>
              {t.taskId ? (
                <p>
                  Plan: {state.tasks.find((x) => x.id === t.taskId)?.title}{' '}
                  <a href="#Plan">Open plan</a>
                </p>
              ) : (
                <p className="muted">
                  No scheduled outcome linked; add one in Plan if this needs separate hours.
                </p>
              )}
              <ul>
                {t.resources.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.title} ↗
                    </a>{' '}
                    <small>
                      {r.kind} · {r.notes}
                    </small>
                  </li>
                ))}
              </ul>
              {t.notes && <p className="muted">{t.notes}</p>}
              {t.evidence && <p>Evidence: {t.evidence}</p>}
              <button onClick={() => setEditor(structuredClone(t))}>Edit topic / progress</button>
            </article>
          ))}
      </div>
      <article className="card">
        <h2>Build a syllabus with any AI—or no API</h2>
        <p>
          Generate an editable prompt from saved target, capacity, task titles/status and readiness
          criteria. Contact details, private evidence and API keys are excluded. Review the prompt
          before sharing it with any provider. For source-grounded online research use Research
          first and paste the relevant excerpts here.
        </p>
        <div className="toolbar">
          <button onClick={() => setPrompt(syllabusPrompt(state))}>
            Build fresh context prompt
          </button>
          <button
            onClick={() =>
              setPrompt(
                state.promptTemplates.find((p) => p.id === 'syllabus-prompt')?.body ||
                  syllabusPrompt(state),
              )
            }
          >
            Load saved prompt
          </button>
        </div>
        <label className="field">
          Editable syllabus prompt
          <textarea rows={16} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </label>
        <p className="muted">
          Refresh context after workspace changes: every response is tied to its prompt revision.
          Saved prompts do not silently refresh.
        </p>
        <div className="toolbar">
          <button disabled={!prompt} onClick={() => download(prompt, 'syllabus-prompt.md')}>
            Download prompt .md
          </button>
          <button
            disabled={!prompt}
            onClick={() =>
              run(async () => {
                await navigator.clipboard.writeText(prompt);
                setMessage('Prompt copied. Review it before sending.');
              })
            }
          >
            Copy prompt
          </button>
          <button
            disabled={!prompt || busy}
            onClick={() =>
              run(async () => {
                const updated = prompt.replace(
                  /"baseRevision":\s*\d+/g,
                  '"baseRevision":' + (state.revision + 1),
                );
                onState(
                  await api('operations', {
                    revision: state.revision,
                    operations: [
                      {
                        kind: 'promptTemplate',
                        value: {
                          id: 'syllabus-prompt',
                          title: 'Syllabus prompt',
                          body: updated,
                          updatedAt: new Date().toISOString(),
                        },
                      },
                    ],
                  }),
                );
                setPrompt(updated);
                setMessage(
                  'Prompt saved; its revision was advanced for this prompt-only save. Review before sharing.',
                );
              })
            }
          >
            Save prompt locally
          </button>
          <button
            className="primary"
            disabled={!prompt || busy}
            onClick={() => run(() => propose('syllabus/generate', { prompt }))}
          >
            {busy ? 'Working…' : 'Generate with configured AI / retry'}
          </button>
        </div>
        <p>
          No configured provider? Take the prompt to another AI and import its response below.
          In-app generation sends only the prompt you review; it does not browse. Keep batches
          small. Imports never overwrite existing progress.
        </p>
        <label className="field">
          Import AI response Markdown
          <input
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                run(async () => {
                  if (f.size > 2_000_000) throw new Error('Maximum 2 MB.');
                  const text = await f.text();
                  setMarkdown(text);
                  await propose('syllabus/import', { markdown: text });
                });
              e.target.value = '';
            }}
          />
        </label>
        <label className="field">
          Or paste response Markdown
          <textarea rows={8} value={markdown} onChange={(e) => setMarkdown(e.target.value)} />
        </label>
        <button
          disabled={!markdown || busy}
          onClick={() => run(() => propose('syllabus/import', { markdown }))}
        >
          Validate & preview Markdown
        </button>
        {preview && (
          <div className="callout">
            <h3>Review syllabus changes</h3>
            <p>{preview.summary}</p>
            {preview.warnings?.map((w) => (
              <p key={w}>{w}</p>
            ))}
            <details>
              <summary>{preview.operations.length} proposed records</summary>
              <pre>{JSON.stringify(preview.operations, null, 2)}</pre>
            </details>
            <div className="toolbar">
              <button onClick={() => setPreview(undefined)}>Discard</button>
              <button
                className="primary"
                disabled={busy || !preview.operations.length || base !== state.revision}
                onClick={() =>
                  run(async () => {
                    onState(
                      await api('operations', { revision: base, operations: preview.operations }),
                    );
                    setPreview(undefined);
                    setMessage(
                      'Syllabus applied locally. New plan estimates may change the forecast.',
                    );
                  })
                }
              >
                Apply reviewed syllabus
              </button>
            </div>
            {base !== state.revision && <p>Workspace changed; validate again.</p>}
          </div>
        )}
      </article>
      {editor && (
        <dialog ref={dialog} aria-label="Edit syllabus topic" onCancel={() => setEditor(undefined)}>
          <header>
            <h2>Edit syllabus topic</h2>
            <button onClick={() => setEditor(undefined)}>Close</button>
          </header>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                onState(
                  await api('operations', {
                    revision: state.revision,
                    operations: [
                      { kind: 'topic', value: { ...editor, updatedAt: new Date().toISOString() } },
                    ],
                  }),
                );
                setEditor(undefined);
              });
            }}
          >
            <label className="field">
              Title
              <input
                required
                value={editor.title}
                onChange={(e) => setEditor({ ...editor, title: e.target.value })}
              />
            </label>
            <label className="field">
              Area
              <input
                required
                value={editor.area}
                onChange={(e) => setEditor({ ...editor, area: e.target.value })}
              />
            </label>
            <label className="field">
              Track
              <select
                aria-label="Track"
                value={editor.track}
                onChange={(e) => setEditor({ ...editor, track: e.target.value as Topic['track'] })}
              >
                {tracks.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Objective / exercise / explanation check
              <textarea
                value={editor.objective}
                onChange={(e) => setEditor({ ...editor, objective: e.target.value })}
              />
            </label>
            <label className="field">
              Status
              <select
                aria-label="Status"
                value={editor.status}
                onChange={(e) =>
                  setEditor({ ...editor, status: e.target.value as Topic['status'] })
                }
              >
                {['Not started', 'Learning', 'Practicing', 'Explain-ready'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Linked plan outcome
              <select
                aria-label="Linked plan outcome"
                value={editor.taskId}
                onChange={(e) => setEditor({ ...editor, taskId: e.target.value })}
              >
                <option value="">None</option>
                {state.tasks.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Prerequisite topic IDs (comma-separated)
              <input
                value={editor.prerequisites.join(',')}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    prerequisites: e.target.value
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <label className="field">
              Evidence
              <textarea
                value={editor.evidence}
                onChange={(e) => setEditor({ ...editor, evidence: e.target.value })}
              />
            </label>
            <label className="field">
              Notes
              <textarea
                value={editor.notes}
                onChange={(e) => setEditor({ ...editor, notes: e.target.value })}
              />
            </label>
            <h3>Resources</h3>
            {editor.resources.map((r, i) => (
              <div className="callout" key={i}>
                {(['title', 'url', 'notes'] as const).map((k) => (
                  <label className="field" key={k}>
                    {k}
                    <input
                      required={k !== 'notes'}
                      value={r[k]}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          resources: editor.resources.map((x, j) =>
                            i === j ? { ...x, [k]: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <select
                  aria-label="Resource kind"
                  value={r.kind}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      resources: editor.resources.map((x, j) =>
                        i === j ? { ...x, kind: e.target.value as typeof r.kind } : x,
                      ),
                    })
                  }
                >
                  {['Docs', 'Video', 'Course', 'Exercise'].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setEditor({ ...editor, resources: editor.resources.filter((_, j) => j !== i) })
                  }
                >
                  Remove resource
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={editor.resources.length >= 10}
              onClick={() =>
                setEditor({
                  ...editor,
                  resources: [...editor.resources, { title: '', url: '', notes: '', kind: 'Docs' }],
                })
              }
            >
              + Resource
            </button>
            <footer>
              {state.topics.some((t) => t.id === editor.id) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm('Delete this topic? Prerequisite references must be removed first.')
                    )
                      run(async () => {
                        onState(
                          await api('delete', {
                            revision: state.revision,
                            collection: 'topics',
                            id: editor.id,
                          }),
                        );
                        setEditor(undefined);
                      });
                  }}
                >
                  Delete topic
                </button>
              )}
              <button type="button" onClick={() => setEditor(undefined)}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                Save topic locally
              </button>
            </footer>
          </form>
        </dialog>
      )}
    </section>
  );
}
