import { boundedBody } from './network.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { atomicWrite } from './store.js';
// Fixed official 0.17.0 release archives; SHA-256 values published by GitHub releases.
const builds: Record<string, [string, string]> = {
  'linux-x64': [
    'x86_64-unknown-linux-musl.tar.gz',
    '8533d07f9ccbd7a65824b9e0459041bca34af1eb33daba48f59215593753a3b7',
  ],
  'linux-arm64': [
    'aarch64-unknown-linux-musl.tar.gz',
    'b10954a95404f3ab2328d2fa59a5ebab8e657f893fab096f98be8db7c0c979b8',
  ],
  'win32-x64': [
    'x86_64-pc-windows-msvc.zip',
    'f61ce51f0b0ade1015b7de7ef368541c5424e9756ecbd0d7af97d6d48030845f',
  ],
  'darwin-x64': [
    'x86_64-apple-darwin.tar.gz',
    '7c90ef5b6ddb1eb1937e4337add5237b79338e4b9676459fa91187d24d6cdf80',
  ],
  'darwin-arm64': [
    'aarch64-apple-darwin.tar.gz',
    'a3f1cac7c5678f01661a92212f58480ae3b0634115d880dbc59e2953ded45667',
  ],
};
export function execute(
  command: string,
  args: string[],
  cwd: string,
  timeout = 90_000,
  env?: NodeJS.ProcessEnv,
) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    const killOnExit = () => {
      child.kill('SIGKILL');
    };
    process.once('exit', killOnExit);
    let output = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeout);
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (d) => {
        output = (output + d.toString()).slice(-12_000);
      });
    child.on('error', (e) => {
      clearTimeout(timer);
      process.removeListener('exit', killOnExit);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      process.removeListener('exit', killOnExit);
      if (timedOut) reject(new Error('Compiler timed out. Simplify the document and retry.'));
      else if (code !== 0) reject(new Error(output || `Process exited ${code}`));
      else resolve(output);
    });
  });
}
export class LatexCompiler {
  busy = false;
  constructor(public root: string) {}
  get tools() {
    return path.join(this.root, 'tools');
  }
  get binary() {
    return (
      (process.env.CAREER_TECTONIC_PATH ? path.resolve(process.env.CAREER_TECTONIC_PATH) : '') ||
      path.join(this.tools, process.platform === 'win32' ? 'tectonic.exe' : 'tectonic')
    );
  }
  async info() {
    let installed = false;
    try {
      await fs.access(this.binary);
      installed = true;
    } catch {}
    return {
      installed,
      busy: this.busy,
      version: '0.17.0',
      supported: Boolean(builds[`${process.platform}-${process.arch}`]),
    };
  }
  async install() {
    if (this.busy) throw new Error('A compiler operation is already running.');
    if (process.env.CAREER_TECTONIC_PATH)
      throw new Error('Using an external compiler path. Install/manage that compiler yourself.');
    const build = builds[`${process.platform}-${process.arch}`];
    if (!build)
      throw new Error(
        'No bundled compiler for this platform. Install Tectonic and set CAREER_TECTONIC_PATH.',
      );
    this.busy = true;
    const temp = path.join(this.root, 'latex-tmp', 'install-' + randomUUID());
    try {
      await fs.mkdir(temp, { recursive: true, mode: 0o700 });
      const url = `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.17.0/tectonic-0.17.0-${build[0]}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!response.ok)
        throw new Error(`Compiler download HTTP ${response.status}. Retry installation.`);
      const buffer = await boundedBody(response, 40_000_000);
      if (buffer.length > 40_000_000) throw new Error('Compiler archive too large.');
      if (createHash('sha256').update(buffer).digest('hex') !== build[1])
        throw new Error('Compiler checksum mismatch. Nothing was installed.');
      const archive = path.join(
        temp,
        build[0].endsWith('.zip') ? 'compiler.zip' : 'compiler.tar.gz',
      );
      await fs.writeFile(archive, buffer);
      // Only one known filename is extracted from the checksum-pinned archive.
      const executable = process.platform === 'win32' ? 'tectonic.exe' : 'tectonic';
      await execute('tar', ['-xf', archive, '-C', temp, executable], temp);
      await fs.mkdir(this.tools, { recursive: true, mode: 0o700 });
      await fs.copyFile(path.join(temp, executable), this.binary);
      await fs.chmod(this.binary, 0o700);
      return { ...(await this.info()), busy: false };
    } finally {
      this.busy = false;
      await fs.rm(temp, { recursive: true, force: true });
    }
  }
  async compile(source: string, allowNetwork: boolean) {
    if (this.busy) throw new Error('Compiler busy. Retry when the current operation finishes.');
    if (!(await this.info()).installed)
      throw new Error('Install the optional Tectonic compiler first.');
    if (!source.trim() || source.length > 200_000)
      throw new Error('Use a nonempty .tex document under 200,000 characters.');
    this.busy = true;
    const temp = path.join(this.root, 'latex-tmp', randomUUID());
    try {
      await fs.mkdir(temp, { recursive: true, mode: 0o700 });
      await fs.writeFile(path.join(temp, 'resume.tex'), source, { mode: 0o600 });
      // A local native compiler, NOT an OS sandbox. Only explicitly trusted owner-authored sources may be compiled.
      const env: NodeJS.ProcessEnv = {
        TECTONIC_UNTRUSTED_MODE: '1',
        TECTONIC_CACHE_DIR: path.join(this.root, 'tex-cache', 'Tectonic'),
        XDG_CACHE_HOME: path.join(this.root, 'tex-cache'),
        HOME: temp,
        USERPROFILE: temp,
        LOCALAPPDATA: path.join(this.root, 'tex-cache'),
        APPDATA: path.join(this.root, 'tex-cache'),
        TMP: temp,
        TEMP: temp,
      };
      for (const key of ['PATH', 'SystemRoot', 'WINDIR', 'FONTCONFIG_PATH'])
        if (process.env[key]) env[key] = process.env[key];
      // Windows Known Folder APIs need the real OS profile paths; package cache remains explicit.
      if (process.platform === 'win32')
        for (const key of [
          'USERPROFILE',
          'APPDATA',
          'LOCALAPPDATA',
          'HOMEDRIVE',
          'HOMEPATH',
          'ProgramData',
        ])
          if (process.env[key]) env[key] = process.env[key];
      const log = await execute(
        this.binary,
        [
          '--untrusted',
          '--keep-logs',
          ...(allowNetwork ? [] : ['--only-cached']),
          '--outdir',
          temp,
          'resume.tex',
        ],
        temp,
        120_000,
        env,
      );
      const pdf = await fs.readFile(path.join(temp, 'resume.pdf'));
      if (pdf.length > 10_000_000 || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-')))
        throw new Error('Compiler did not produce a supported PDF.');
      return {
        pdf: pdf.toString('base64'),
        log,
        sourceHash: createHash('sha256').update(source).digest('hex'),
      };
    } finally {
      this.busy = false;
      await fs.rm(temp, { recursive: true, force: true });
    }
  }
}
