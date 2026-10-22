import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const root = await mkdtemp(path.join(tmpdir(), 'career-launcher-'));
const windows = process.platform === 'win32';
const port = 4391;
let output = '';
const child = spawn(
  windows ? 'cmd.exe' : 'bash',
  windows ? ['/d', '/c', 'start.bat'] : ['start.sh'],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(port),
      CAREER_DATA_DIR: root,
      NO_BROWSER: '1',
      CAREER_NONINTERACTIVE: '1',
    },
  },
);
child.stdout.on('data', (d) => (output = (output + d.toString()).slice(-8000)));
child.stderr.on('data', (d) => (output = (output + d.toString()).slice(-8000)));
let ended = false;
const stopped = new Promise((resolve) =>
  child.once('close', () => {
    ended = true;
    resolve();
  }),
);
async function stop() {
  if (!ended) {
    if (windows)
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    else {
      try {
        const info = await fetch(`http://127.0.0.1:${port}/api/state`);
        await info.body?.cancel();
      } catch {}
      child.kill('SIGTERM');
    }
    await Promise.race([stopped, new Promise((r) => setTimeout(r, 5000))]);
  }
}
try {
  const deadline = Date.now() + 120000;
  while (!output.includes('is ready:')) {
    if (ended || Date.now() > deadline)
      throw new Error('Launcher did not start successfully.\n' + output);
    await new Promise((r) => setTimeout(r, 200));
  }
  const r = await fetch(`http://127.0.0.1:${port}/api/state`);
  const d = await r.json();
  if (!r.ok || d.state.schemaVersion !== 1)
    throw new Error('Launched API did not return a valid workspace.');
  console.log(
    `PASS: ${windows ? 'Windows BAT' : 'shell'} launcher builds and serves a synthetic local workspace (browser auto-open disabled).`,
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await stop();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
