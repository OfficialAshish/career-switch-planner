import React, { useState } from 'react';
import { api, fileBase64 } from './api';
import type { State } from '../shared/schema';
export function WorkbookExchange({
  state,
  onState,
}: {
  state: State;
  onState: (s: State) => void;
}) {
  const [file, setFile] = useState(''),
    [preview, setPreview] = useState<any>(),
    [revision, setRevision] = useState(state.revision),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [confirmReplacement, setConfirmReplacement] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label className="field">
        Import Excel tracker (preview reconciliation)
        <input
          type="file"
          accept=".xlsx"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
              run(async () => {
                setPreview(undefined);
                setFile('');
                setConfirmReplacement(false);
                if (f.size > 10 * 1024 * 1024) throw new Error('Maximum 10 MB.');
                const base64 = await fileBase64(f);
                const p = await api('workbook/preview', { base64 });
                setFile(base64);
                setPreview(p);
                setRevision(state.revision);
              });
            e.target.value = '';
          }}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {preview && (
        <div className="callout">
          <h3>Workbook reconciliation</h3>
          <p>{preview.summary}</p>
          {preview.warnings.map((w: string) => (
            <p key={w}>{w}</p>
          ))}
          <details>
            <summary>Review all changed records</summary>
            <pre style={{ maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(preview.changes, null, 2)}
            </pre>
          </details>
          <p>
            Attached images and archived research runs are transferred too. Never import an
            untrusted workbook. Deletions must use _delete=YES; missing rows are preserved.
          </p>
          <label className="field">
            {preview.transfer && (
              <span>
                <input
                  type="checkbox"
                  checked={confirmReplacement}
                  onChange={(e) => setConfirmReplacement(e.target.checked)}
                />{' '}
                I understand this different-workspace import replaces my current workspace records.
              </span>
            )}
          </label>
          <div className="actions">
            <button
              onClick={() => {
                setPreview(undefined);
                setFile('');
              }}
            >
              Discard
            </button>
            <button
              className="primary"
              disabled={
                busy || revision !== state.revision || (preview.transfer && !confirmReplacement)
              }
              onClick={() =>
                run(async () => {
                  onState(
                    await api('workbook/apply', { base64: file, revision, confirmReplacement }),
                  );
                  setPreview(undefined);
                  setFile('');
                })
              }
            >
              Apply reviewed workbook
            </button>
          </div>
          {revision !== state.revision && (
            <p>Workspace changed. Import again to review a fresh reconciliation.</p>
          )}
        </div>
      )}
    </div>
  );
}
