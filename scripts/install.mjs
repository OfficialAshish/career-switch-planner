import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const hash = createHash('sha256')
  .update(await readFile('package-lock.json'))
  .digest('hex');
let old = '';
try {
  old = await readFile('node_modules/.career-lock', 'utf8');
} catch {}
if (hash !== old) {
  console.log(
    'Installing locked dependencies (internet required on first run or after dependency changes)…',
  );
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status || 1);
  await writeFile('node_modules/.career-lock', hash);
}
