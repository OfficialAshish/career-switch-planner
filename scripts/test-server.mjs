import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
const dir = await mkdtemp(path.join(tmpdir(), 'career-browser-'));
const child = spawn(process.execPath, ['dist/server/server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || '4318', CAREER_DATA_DIR: dir },
});
child.on('exit', async (code) => {
  await rm(dir, { recursive: true, force: true });
  process.exit(code || 0);
});
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
