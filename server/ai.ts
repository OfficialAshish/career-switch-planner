import { z } from 'zod';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from './store.js';
import { proposalSchema, type State } from '../shared/schema.js';
import { SYSTEM_PROMPT, modes } from '../shared/prompts.js';
export const providerSchema = z.object({
  type: z.enum(['disabled', 'ollama', 'compatible']),
  endpoint: z.string().max(2048), model: z.string().max(150),
  apiKey: z.string().max(1000).optional(), clearKey: z.boolean().optional(),
}).strict();
type Config = z.infer<typeof providerSchema>;
export function validateEndpoint(config: Config) {
  if (config.type === 'disabled') return;
  const u = new URL(config.endpoint);
  if (u.username || u.password || u.search || u.hash) throw new Error('Provider URL must not contain credentials, queries or fragments.');
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
  if (!local && u.protocol !== 'https:') throw new Error('Remote providers require HTTPS.');
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Unsupported provider protocol.');
  if (config.type === 'ollama' && !local) throw new Error('Ollama mode is loopback-only. Use an explicitly trusted HTTPS compatible provider for remote services.');
  if (!config.model.trim()) throw new Error('Enter the exact model name available at your provider.');
}
export class Provider {
  private config: Config = { type: 'disabled', endpoint: 'http://127.0.0.1:11434', model: '' };
  private key = '';
  private busy = false;
  constructor(private root: string) {}
  async init() {
    try {
      const parsed = providerSchema.parse(JSON.parse(await fs.readFile(path.join(this.root, 'provider.json'), 'utf8')));
      // Never load a key from a persisted provider record.
      this.config = { type: parsed.type, endpoint: parsed.endpoint, model: parsed.model };
      validateEndpoint(this.config);
    } catch (e: any) { if (e.code !== 'ENOENT') this.config = { type: 'disabled', endpoint: 'http://127.0.0.1:11434', model: '' }; }
  }
  info() { return { ...this.config, keyAvailable: Boolean(this.key || process.env.OPENAI_API_KEY), busy: this.busy }; }
  async configure(input: unknown) {
    const config = providerSchema.parse(input); validateEndpoint(config);
    this.config = { type: config.type, endpoint: config.endpoint.replace(/\/+$/, ''), model: config.model };
    if (config.clearKey) this.key = '';
    else if (config.apiKey) this.key = config.apiKey;
    await atomicWrite(path.join(this.root, 'provider.json'), JSON.stringify(this.config, null, 2));
    return this.info();
  }
  async propose(mode: keyof typeof modes, input: string, state: State, includeContext: boolean) {
    if (this.config.type === 'disabled') throw new Error('No AI provider configured. Offline quick capture and manual editing still work.');
    if (this.busy) throw new Error('An AI request is already running. Wait for it to finish.');
    if (!input.trim() || input.length > 20_000) throw new Error('Use between 1 and 20,000 characters.');
    this.busy = true;
    try {
      const context = includeContext ? {
        targetRole: state.profile.targetRole, weeklyHours: state.profile.weeklyHours,
        tasks: state.tasks.map(t => ({ ...t, evidence: t.evidence.slice(0, 300) })).slice(0, 100),
        projects: state.projects.slice(0, 10), claims: state.claims.slice(0, 20),
        gates: state.gates, questions: state.questions.map(q => ({ id: q.id, title: q.title })).slice(0, 200),
      } : { warning: 'No workspace context included; do not assume personal experience or existing task/question IDs.' };
      const content = JSON.stringify({ instruction: modes[mode], today: new Date().toISOString().slice(0, 10), userInput: input, workspace: context });
      const ollama = this.config.type === 'ollama';
      const endpoint = this.config.endpoint + (ollama ? '/api/chat' : '/chat/completions');
      const key = this.key || process.env.OPENAI_API_KEY || '';
      const response = await fetch(endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60_000),
        headers: { 'Content-Type': 'application/json', ...(!ollama && key ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify({
          model: this.config.model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }],
          ...(ollama ? { stream: false, format: 'json', options: { num_predict: 4096, temperature: .2 } } : { temperature: .2, max_tokens: 4096, response_format: { type: 'json_object' } }),
        }),
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Provider returned HTTP ${response.status}. Check model, endpoint and credentials; no edits were applied.`); }
      if (!response.body) throw new Error('Provider returned no body.');
      const reader = response.body.getReader(); let size = 0; const pieces: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > 1_000_000) { await reader.cancel(); throw new Error('Provider response exceeded the safety limit.'); }
        pieces.push(value);
      }
      const json = JSON.parse(Buffer.concat(pieces).toString('utf8'));
      let result = ollama ? json.message?.content : json.choices?.[0]?.message?.content;
      if (typeof result !== 'string') throw new Error('Provider returned no structured content.');
      result = result.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      try { return proposalSchema.parse(JSON.parse(result)); }
      catch { throw new Error('The model response did not match the safe edit schema. No changes were made. Try a smaller, clearer request or use manual editing.'); }
    } finally { this.busy = false; }
  }
}