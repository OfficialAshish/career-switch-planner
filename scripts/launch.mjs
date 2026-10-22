import { spawn } from 'node:child_process';
const port = Number(process.env.PORT || 4317);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('PORT must be an integer from 1024 to 65535');
  process.exit(1);
}
const child = spawn(process.execPath, ['dist/server/server/index.js'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  env: process.env,
});
let opened = false;
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (!opened && chunk.toString().includes('is ready:')) {
    opened = true;
    if (process.platform === 'win32') {
      const browser = spawn('cmd.exe', ['/d', '/c', 'start', '', `http://127.0.0.1:${port}`], {
        stdio: 'ignore',
      });
      browser.on('error', () => {});
    }
  }
});
child.on('error', () => {
  console.error('Could not launch the server. Run npm start for details.');
  process.exit(1);
});
child.on('exit', (code) => process.exit(code || 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
