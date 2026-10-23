import React, { useEffect, useState, useRef } from 'react';
import type { State } from '../shared/schema';
import type { ResearchInput, ResearchRun } from '../shared/research-contract';
import { api } from './api';
export function ResearchPlanner({ state, onState }: { state: State; onState: (s: State) => void }) {
  const [goal, setGoal] = useState(state.profile.targetRole),
    [baseline, setBaseline] = useState(''),
    [jd, setJd] = useState(''),
    [location, setLocation] = useState(state.profile.location),
    [hours, setHours] = useState(state.profile.weeklyHours),
    [urls, setUrls] = useState(''),
    [consent, setConsent] = useState(false),
    [context, setContext] = useState(false),
    [replace, setReplace] = useState(false),
    [key, setKey] = useState(''),
    [search, setSearch] = useState(''),
    [serverBusy, setServerBusy] = useState(false),
    [runs, setRuns] = useState<ResearchRun[]>([]),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const polling = useRef(true);
  async function refresh() {
    const data = await api('research-runs');
    polling.current =
      Boolean(data.search.busy) || data.runs.some((r: ResearchRun) => r.status === 'running');
    setServerBusy(Boolean(data.search.busy));
    setRuns(data.runs);
    setSearch(data.search.engine);
  }
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const data = await api('research-runs');
        if (active) {
          polling.current =
            Boolean(data.search.busy) || data.runs.some((r: ResearchRun) => r.status === 'running');
          setServerBusy(Boolean(data.search.busy));
          setRuns(data.runs);
          setSearch(data.search.engine);
        }
      } catch (e: any) {
        if (active) setError(e.message);
      }
    }
    void poll();
    const timer = setInterval(() => {
      if (polling.current) void poll();
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function action(fn: () => Promise<any>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const run = runs.find((r) => r.id === selected) || runs[0];
  const running = serverBusy || runs.some((r) => r.status === 'running');
  return (
    <section className="research-planner panel">
      <h2>Research &amp; build my plan</h2>
      <p>
        Describe your target role and baseline. The workflow asks your configured LLM for focused
        searches, retrieves up to six public pages, then drafts role-specific outcomes, projects,
        readiness gates and interview preparation. Research is saved and retryable.{' '}
        <strong>No workspace edits happen until you review and apply.</strong>
      </p>
      <details>
        <summary>Target details, JD &amp; research settings</summary>
        <div className="form-grid">
          <label className="field full">
            <span>Target role / switching goal</span>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. AI + backend + full-stack engineer, or a completely different profession"
            />
          </label>
          <label className="field full">
            <span>Current experience, skills, gaps and constraints</span>
            <textarea
              value={baseline}
              onChange={(e) => setBaseline(e.target.value)}
              placeholder="What can you already demonstrate? What needs work? Do not include secrets or client data."
            />
          </label>
          <label className="field full">
            <span>Target job description (optional)</span>
            <textarea value={jd} onChange={(e) => setJd(e.target.value)} />
          </label>
          <label className="field">
            <span>Research location / remote eligibility</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="field">
            <span>Planning hours per week</span>
            <input
              type="number"
              min="1"
              max="60"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </label>
          <label className="field full">
            <span>Authoritative source URLs (optional, one per line)</span>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="Optional employer, official curriculum or professional-body pages. Private network addresses are blocked."
            />
          </label>
        </div>
        <details>
          <summary>Optional reliable search provider</summary>
          <p>
            Default: keyless DuckDuckGo HTML with Bing RSS fallback; both may be rate-limited or
            challenged. Optionally enter a Brave Search API key for its supported search API. Search
            keys are memory-only and never saved or exported. Current engine: {search || 'loading'}.
          </p>
          <label className="field">
            <span>Brave Search API key (memory only)</span>
            <input
              type="password"
              value={key}
              autoComplete="off"
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              void action(async () => {
                await api('research-runs/search-settings', { key });
                setKey('');
              })
            }
          >
            Save / clear search key
          </button>
        </details>
      </details>
      <div className="research-consents">
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Allow online searches and public-page retrieval for this request. Queries go to the search
          service; supplied details/evidence go to my configured LLM.
        </label>
        <label className="check">
          <input type="checkbox" checked={context} onChange={(e) => setContext(e.target.checked)} />
          Include selected workspace tasks, projects, claims and gates as LLM context
        </label>
        <label className="check">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          On apply, replace only unused default starter tasks and untouched default gates; preserve
          progress, custom records and linked work
        </label>
      </div>
      <button
        type="button"
        className="primary"
        disabled={!consent || goal.trim().length < 3 || busy || running}
        onClick={() =>
          void action(async () => {
            const input: ResearchInput = {
              goal,
              baseline,
              jd,
              location,
              weeklyHours: hours,
              sourceUrls: urls
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
              onlineConsent: true,
              includeContext: context,
              replaceStarter: replace,
            };
            const created = await api<ResearchRun>('research-runs/start', input);
            setSelected(created.id);
          })
        }
      >
        {running ? 'Research in progress…' : 'Research & generate plan'}
      </button>
      {error && (
        <p role="alert" className="banner error">
          {error}
        </p>
      )}
      <p className="muted">
        This is bounded research, not an exhaustive market audit. Salary, vacancies, country
        eligibility and source freshness still need checking. No credentials, paid applications or
        job submissions are performed. Explicit retries may call your paid model again.
      </p>
      {runs.length > 0 && (
        <label className="field">
          <span>Saved research runs</span>
          <select
            aria-label="Saved research runs"
            value={run?.id || ''}
            onChange={(e) => setSelected(e.target.value)}
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.input.goal.slice(0, 65)} — {r.status} · attempt {r.attempt}
              </option>
            ))}
          </select>
        </label>
      )}
      {run && (
        <article className="research-run">
          <div className="section-title">
            <h3>{run.input.goal}</h3>
            <span className="tag">{run.status}</span>
          </div>
          <p role="status">{run.stage}</p>
          <small>
            Attempt {run.attempt} · workspace revision {run.baseRevision} · saved {run.updatedAt}
          </small>
          {run.error && (
            <p role="alert" className="banner error">
              {run.error}
            </p>
          )}
          <details>
            <summary>
              Queries, retrieved sources &amp; warnings ({run.sources.length} sources)
            </summary>
            <ul>
              {run.queries.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            {run.sources.map((s) => (
              <article key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
                <p>{s.excerpt.slice(0, 700)}…</p>
              </article>
            ))}
            {run.warnings.map((w, i) => (
              <p className="callout" key={i}>
                {w}
              </p>
            ))}
          </details>
          {run.proposal && (
            <>
              <h3>Review proposed changes</h3>
              <p className="preline">{run.proposal.summary}</p>
              <p>
                Applying sets your explicitly entered weekly capacity to {run.input.weeklyHours}{' '}
                hours. Generated tasks start as todo, projects as Planned and gates as Not started.
                Retrieved source records and an audit note are also saved on apply.{' '}
                {run.input.replaceStarter
                  ? 'Unused default starter tasks/gates will be replaced.'
                  : 'Existing tasks remain; this adds a role-specific plan.'}
              </p>
              <details>
                <summary>Full proposed records ({run.proposal.operations.length})</summary>
                <pre className="compiler-log">
                  {JSON.stringify(run.proposal.operations, null, 2)}
                </pre>
              </details>
            </>
          )}
          <div className="actions toolbar">
            {run.status === 'running' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void action(() => api('research-runs/cancel', { id: run.id }))}
              >
                Cancel workflow
              </button>
            ) : (
              run.status !== 'applied' && (
                <button
                  type="button"
                  disabled={busy || running}
                  onClick={() => void action(() => api('research-runs/retry', { id: run.id }))}
                >
                  {run.status === 'ready'
                    ? 'Regenerate against current workspace'
                    : 'Retry with saved evidence'}
                </button>
              )
            )}
            {run.status === 'ready' && (
              <button
                type="button"
                className="primary"
                disabled={busy || running}
                onClick={() => {
                  if (
                    !window.confirm(
                      'Apply this reviewed research plan? A recovery point will be created.',
                    )
                  )
                    return;
                  void action(async () => {
                    onState(
                      await api<State>('research-runs/apply', {
                        id: run.id,
                        revision: state.revision,
                      }),
                    );
                  });
                }}
              >
                Apply reviewed research plan
              </button>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
