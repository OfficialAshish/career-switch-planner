import React, { useEffect, useRef, useState } from 'react';
import type { State } from '../shared/schema';
import { styledResume } from '../shared/latex-template';
import { api } from './api';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
function decode(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
function PdfPreview({ pdf }: { pdf: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let doc: any;
    let task: any;
    const renders: any[] = [];
    setError('');
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        task = pdfjs.getDocument({ data: decode(pdf) });
        doc = await task.promise;
        if (disposed) return;
        root.current?.replaceChildren();
        for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
          if (disposed) break;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute('aria-label', `PDF page ${i} of ${doc.numPages}`);
          canvas.setAttribute('role', 'img');
          root.current?.append(canvas);
          const render = page.render({ canvas, viewport });
          renders.push(render);
          await render.promise;
        }
      } catch (e: any) {
        if (!disposed) setError('Preview could not render: ' + e.message);
      }
    })();
    return () => {
      disposed = true;
      for (const r of renders) r.cancel();
      void (doc?.destroy() || task?.destroy());
    };
  }, [pdf]);
  return (
    <>
      <div className="pdf-pages" ref={root} />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <small>
        Preview shows up to 10 pages. The PDF download contains the complete compiler output.
      </small>
    </>
  );
}
export function LatexStudio({ state, onState }: { state: State; onState: (s: State) => void }) {
  const first = state.resumeDocuments[0];
  const [draft, setDraft] = useState(
    first || {
      id: crypto.randomUUID(),
      title: 'My resume',
      source: styledResume(state),
      updatedAt: new Date().toISOString(),
    },
  );
  const [info, setInfo] = useState<any>(),
    [error, setError] = useState(''),
    [saveError, setSaveError] = useState(''),
    [busy, setBusy] = useState(''),
    [trusted, setTrusted] = useState(false),
    [network, setNetwork] = useState(false),
    [live, setLive] = useState(false),
    [installConsent, setInstallConsent] = useState(false),
    [pdf, setPdf] = useState(''),
    [compiled, setCompiled] = useState(''),
    [log, setLog] = useState(''),
    [saved, setSaved] = useState(Boolean(first));
  const latest = useRef(state);
  latest.current = state;
  const saving = useRef(false);
  const savedText = useRef(first ? JSON.stringify([first.id, first.title, first.source]) : '');
  const current = useRef(draft);
  current.current = draft;
  const sequence = useRef(0);
  const failedSource = useRef('');
  useEffect(() => {
    api('latex/status')
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, []);
  async function save() {
    if (saving.current) return;
    saving.current = true;
    const value = { ...current.current, updatedAt: new Date().toISOString() };
    try {
      const next = await api<State>('latex/document', {
        revision: latest.current.revision,
        document: value,
      });
      savedText.current = JSON.stringify([value.id, value.title, value.source]);
      onState(next);
      setSaved(current.current.source === value.source && current.current.title === value.title);
      setSaveError('');
    } catch (e: any) {
      setSaveError(
        e.message + ' Your editor text is retained; copy/download it before refreshing.',
      );
    } finally {
      saving.current = false;
    }
  }
  useEffect(() => {
    const changed = JSON.stringify([draft.id, draft.title, draft.source]) !== savedText.current;
    if (!changed) return;
    setSaved(false);
    const t = setTimeout(() => void save(), 800);
    return () => clearTimeout(t);
  }, [draft.id, draft.title, draft.source, state.revision]);
  async function compile() {
    if (!trusted || busy) return;
    const source = current.current.source;
    const seq = ++sequence.current;
    setBusy('Compiling PDF…');
    setError('');
    try {
      const result = await api('latex/compile', { source, trusted, allowNetwork: network });
      if (seq === sequence.current) {
        setPdf(result.pdf);
        setCompiled(source);
        setLog(result.log);
      }
    } catch (e: any) {
      failedSource.current = source;
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  useEffect(() => {
    if (
      !live ||
      !trusted ||
      !info?.installed ||
      draft.source === compiled ||
      draft.source === failedSource.current ||
      busy
    )
      return;
    const t = setTimeout(() => void compile(), 1300);
    return () => clearTimeout(t);
  }, [draft.source, live, trusted, info?.installed, compiled, busy]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (
        JSON.stringify([current.current.id, current.current.title, current.current.source]) !==
        savedText.current
      ) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);
  const [pdfUrl, setPdfUrl] = useState(''),
    [texUrl, setTexUrl] = useState('');
  useEffect(() => {
    if (!pdf) return;
    const url = URL.createObjectURL(new Blob([decode(pdf)], { type: 'application/pdf' }));
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdf]);
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([draft.source], { type: 'text/plain;charset=utf-8' }));
    setTexUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.source]);
  function select(id: string) {
    if (
      !saved &&
      !window.confirm(
        'Switch documents? Unsaved editor text will be replaced. Download it first if a save failed.',
      )
    )
      return;
    const d = state.resumeDocuments.find((d) => d.id === id);
    if (d) {
      setDraft(d);
      savedText.current = JSON.stringify([d.id, d.title, d.source]);
      setSaved(true);
      setPdf('');
      setCompiled('');
      setError('');
    }
  }
  return (
    <section className="latex-studio">
      <p className="banner">
        Edit the real LaTeX source. No app watermark, branding, warning or content is injected into
        a compiled PDF. Imported source is kept unchanged. Editing source does not silently modify
        your structured resume claims.
      </p>
      <div className="actions toolbar">
        <label className="field">
          <span>Resume document</span>
          <select
            value={state.resumeDocuments.some((d) => d.id === draft.id) ? draft.id : ''}
            onChange={(e) => select(e.target.value)}
          >
            <option value="" disabled>
              New unsaved document
            </option>
            {state.resumeDocuments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            if (!saved && !confirm('Replace unsaved editor text?')) return;
            setDraft({
              id: crypto.randomUUID(),
              title: 'New resume',
              source: styledResume(state),
              updatedAt: new Date().toISOString(),
            });
            setPdf('');
            setCompiled('');
          }}
        >
          New from verified claims
        </button>
        <label className="field">
          <span>Import original .tex</span>
          <input
            type="file"
            accept=".tex,text/plain"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 200000) {
                setError('Maximum source size is 200 KB.');
                return;
              }
              if (!saved && !confirm('Replace unsaved editor text?')) return;
              setDraft({
                id: crypto.randomUUID(),
                title: f.name.replace(/\.tex$/i, ''),
                source: await f.text(),
                updatedAt: new Date().toISOString(),
              });
              setPdf('');
              setCompiled('');
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <details className="panel">
        <summary>Compiler setup &amp; privacy</summary>
        <p>
          Tectonic runs locally with shell escape disabled, a minimal environment and a time limit.
          It is a native compiler, <strong>not a complete OS sandbox</strong>: compile only source
          you trust. Never compile an unreviewed file from the internet or an LLM. Source is not
          sent to a cloud compiler.
        </p>
        <p>
          Optional installation downloads a checksum-pinned Tectonic binary into data/tools. First
          compilation may need fonts/packages from the official bundle. Once cached, leave network
          access off for offline use. A missing package produces an error, not a substituted layout.
        </p>
        {!info?.installed && (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={installConsent}
                onChange={(e) => setInstallConsent(e.target.checked)}
              />
              Allow downloading the optional compiler from its official GitHub release
            </label>
            <button
              type="button"
              disabled={!installConsent || Boolean(busy)}
              onClick={async () => {
                setBusy('Installing compiler…');
                setError('');
                try {
                  await api('latex/install', { consent: true });
                  setInfo(await api('latex/status'));
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy('');
                }
              }}
            >
              Install local PDF compiler
            </button>
          </>
        )}
        <p>
          {info?.installed
            ? 'Compiler installed.'
            : 'Compiler not installed. Source editing, autosave and .tex export still work.'}
        </p>
      </details>
      <div className="actions toolbar">
        <label className="check">
          <input type="checkbox" checked={trusted} onChange={(e) => setTrusted(e.target.checked)} />
          I trust this LaTeX source to run locally
        </label>
        <label className="check">
          <input type="checkbox" checked={network} onChange={(e) => setNetwork(e.target.checked)} />
          Allow compiler package downloads
        </label>
        <label className="check">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          Live PDF after edits
        </label>
      </div>
      <div className="actions toolbar">
        <button
          type="button"
          className="primary"
          disabled={!trusted || !info?.installed || Boolean(busy)}
          onClick={() => void compile()}
        >
          {busy || 'Compile / retry PDF'}
        </button>
        <button type="button" onClick={() => void save()}>
          Save source now
        </button>
        <a className="button" href={texUrl} download={draft.title + '.tex'}>
          Download .tex
        </a>
        {pdfUrl && compiled === draft.source && (
          <a className="button" href={pdfUrl} target="_blank" rel="noreferrer">
            Open / print PDF
          </a>
        )}
        {pdfUrl && compiled === draft.source && (
          <a className="button" href={pdfUrl} download={draft.title + '.pdf'}>
            Download PDF
          </a>
        )}
        <span role="status">
          {saved ? 'Source saved locally' : 'Saving source…'}
          {pdf && compiled !== draft.source ? ' · PDF is out of date' : ''}
        </span>
      </div>
      {(error || saveError) && (
        <pre role="alert" className="error compiler-log">
          {saveError || error}
        </pre>
      )}
      <div className="studio-grid">
        <section className="panel">
          <label className="field">
            <span>Document title</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="field">
            <span>LaTeX source</span>
            <textarea
              className="latex-code"
              spellCheck={false}
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            />
          </label>
        </section>
        <section className="panel">
          <h2>Compiled PDF preview</h2>
          {pdf ? (
            <PdfPreview pdf={pdf} />
          ) : (
            <div className="empty">
              Compile your source to see the actual printable PDF, not an HTML approximation.
            </div>
          )}
        </section>
      </div>
      {log && (
        <details className="panel">
          <summary>Compiler log</summary>
          <pre className="compiler-log">{log}</pre>
        </details>
      )}
    </section>
  );
}
