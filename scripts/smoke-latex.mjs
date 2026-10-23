// Optional real native compiler smoke test; downloads only checksum-pinned upstream binaries/packages.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { LatexCompiler } from '../dist/server/server/latex.js';
const root = await mkdtemp(path.join(tmpdir(), 'career-tex-'));
try {
  const compiler = new LatexCompiler(root);
  await compiler.install();
  const source = String.raw`\documentclass{article}\pagestyle{empty}\begin{document}Synthetic clean PDF\end{document}`;
  const first = await compiler.compile(source, true);
  assert.equal(Buffer.from(first.pdf, 'base64').subarray(0, 5).toString(), '%PDF-');
  const second = await compiler.compile(source, false);
  assert.equal(second.sourceHash, first.sourceHash);
  await assert.rejects(
    compiler.compile(
      '\\documentclass{article}\\begin{document}\\undefinedcontrol\\end{document}',
      false,
    ),
  );
  console.log(
    'PASS: official compiler install, real PDF, cached offline compilation and syntax error rejection.',
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
