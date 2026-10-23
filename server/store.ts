import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseState, applyOperations, type State, type Operation } from '../shared/schema.js';
import { initialState } from './seed.js';
export class ConflictError extends Error {}
export async function atomicWrite(file: string, content: string | Buffer) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + `.${process.pid}.${Date.now()}.tmp`;
  const handle = await fs.open(temp, 'wx', 0o600);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.rename(temp, file);
  } catch (e) {
    await fs.rm(temp, { force: true });
    throw e;
  }
}
export class Store {
  state!: State;
  notice = '';
  private tail: Promise<unknown> = Promise.resolve();
  private lockPath: string;
  private ownsLock = false;
  constructor(public root: string) {
    this.lockPath = path.join(root, '.server.lock');
  }
  get file() {
    return path.join(this.root, 'workspace.json');
  }
  async init() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    try {
      const file = await fs.open(this.lockPath, 'wx', 0o600);
      await file.writeFile(String(process.pid));
      await file.close();
    } catch (e: any) {
      if (e.code !== 'EEXIST') throw e;
      const pid = Number(await fs.readFile(this.lockPath, 'utf8'));
      if (!Number.isInteger(pid) || pid < 1)
        throw new Error(
          'Invalid server lock. Inspect data/.server.lock; do not delete a live server lock.',
        );
      try {
        process.kill(pid, 0);
        throw new Error(
          'Another server may be using this data folder. Close it before starting a second instance.',
        );
      } catch (err: any) {
        if (err.code !== 'ESRCH') throw err;
        await fs.unlink(this.lockPath);
        const file = await fs.open(this.lockPath, 'wx', 0o600);
        await file.writeFile(String(process.pid));
        await file.close();
      }
    }
    this.ownsLock = true;
    try {
      const raw = JSON.parse(await fs.readFile(this.file, 'utf8'));
      this.state = parseState(raw);
      if (!raw.workspaceId) {
        await fs.copyFile(this.file, this.file + `.pre-v03-${Date.now()}`);
        await atomicWrite(this.file, JSON.stringify(this.state, null, 2));
      }
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        this.state = initialState();
        await atomicWrite(this.file, JSON.stringify(this.state, null, 2));
      } else {
        const backups = await this.backups();
        for (const backup of backups) {
          try {
            const recovered = parseState(
              JSON.parse(await fs.readFile(path.join(this.root, 'backups', backup), 'utf8')),
            );
            await fs.copyFile(this.file, this.file + `.corrupt-${Date.now()}`);
            this.state = recovered;
            await atomicWrite(this.file, JSON.stringify(recovered, null, 2));
            this.notice = `Recovered from ${backup}. The unreadable original was preserved. Review recent work.`;
            break;
          } catch {
            /* Keep looking; never replace corrupt data with an empty workspace. */
          }
        }
        if (!this.state) {
          await this.close();
          throw new Error(
            'Workspace is unreadable and no valid backup exists. Original data preserved. See docs/RECOVERY.md.',
          );
        }
      }
    }
  }
  async close() {
    if (this.ownsLock) {
      await this.tail;
      await fs.rm(this.lockPath, { force: true });
      this.ownsLock = false;
    }
  }
  async backups() {
    try {
      return (await fs.readdir(path.join(this.root, 'backups')))
        .filter((f) => /^revision-\d+-\d+\.json$/.test(f))
        .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    } catch (e: any) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }
  async replace(expected: number, input: State) {
    const work = this.tail.then(async () => {
      if (expected !== this.state.revision)
        throw new ConflictError(
          'Workspace changed in another tab. Reload and review before applying.',
        );
      const next = parseState(input);
      await atomicWrite(
        path.join(this.root, 'backups', `revision-${this.state.revision}-${Date.now()}.json`),
        JSON.stringify(this.state, null, 2),
      );
      next.revision = this.state.revision + 1;
      next.updatedAt = new Date().toISOString();
      await atomicWrite(this.file, JSON.stringify(next, null, 2));
      this.state = next;
      try {
        const old = (await this.backups()).slice(40);
        await Promise.all(
          old.map((f) => fs.rm(path.join(this.root, 'backups', f), { force: true })),
        );
      } catch {
        this.notice = 'Saved successfully; old-backup cleanup failed. Check disk permissions.';
      }
      return structuredClone(next);
    });
    this.tail = work.catch(() => undefined);
    return work;
  }
  async apply(expected: number, ops: Operation[]) {
    // Validation occurs against current data; revision guard rejects races before saving.
    return this.replace(expected, applyOperations(this.state, ops));
  }
}
