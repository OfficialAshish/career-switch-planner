import type { State, Operation, Proposal } from '../shared/schema';
export let token = '';
export async function api<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch('/api/' + url, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Career-Token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    let error = 'Request failed';
    try {
      error = (await r.json()).error || error;
    } catch {}
    throw new Error(error);
  }
  return r.json();
}
export async function load() {
  const d = await api('state');
  token = d.csrf;
  return d as { state: State; notice: string };
}
export function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
export type Preview = { summary: string; operations: Operation[]; warnings?: string[] };
