import path from 'node:path';
import { test, expect } from '@playwright/test';
test('offline quick log, persistence, notes, practice, capacity and safe future resume', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'A little progress. A stronger next move.' }),
  ).toBeVisible();
  await page
    .getByLabel('What did you work on?')
    .fill('45 min DSA — LC 3 solved without hints; synthetic UI test');
  await page.getByRole('button', { name: 'Review quick log' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Apply 2 changes' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('0.8', { exact: false }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('synthetic UI test', { exact: false }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: '＋ Add note' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Synthetic learning note');
  await page.getByLabel('Note', { exact: true }).fill('An honest explanation with an image.');
  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic learning note' })).toBeVisible();
  await page.getByRole('link', { name: 'Practice', exact: true }).click();
  await page.getByLabel('Find a question').fill('two sum');
  await expect(page.getByRole('link', { name: '1. Two Sum', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Log attempt' }).first().click();
  await page.getByLabel('Result (be honest)').selectOption('Independent');
  await page.getByRole('button', { name: 'Save attempt' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Synthetic Reviewer');
  await page.getByLabel('Weekly capacity (hours)').fill('25');
  await page.getByRole('button', { name: 'Save profile & recalculate' }).click();
  await expect(page.getByText('Synthetic Reviewer’s workspace')).toBeVisible();
  await page.getByRole('link', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: '＋ Claim' }).click();
  await page
    .getByLabel('Resume claim', { exact: true })
    .fill('Built a planned synthetic assistant');
  await page.getByLabel('Claim status').selectOption('Planned');
  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.locator('#resume-print')).not.toContainText(
    'Built a planned synthetic assistant',
  );
  await page.getByLabel('Future-state draft').check();
  await expect(page.locator('#resume-print')).toContainText('Built a planned synthetic assistant');
  await expect(page.locator('#resume-print')).toContainText('FUTURE-STATE');
});
test('all routes fit desktop and mobile; capture review artifacts', async ({ page }) => {
  const routes = [
    'Today',
    'Plan',
    'Practice',
    'Notes',
    'Projects & evidence',
    'Resume',
    'Interview',
    'Applications',
    'Research',
    'Settings',
    'Syllabus',
  ];
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto('/#' + encodeURIComponent(route));
      await expect(page.locator('h1')).toBeVisible();
      await page.screenshot({
        path: path.join(
          process.env.ARTIFACT_DIR || 'test-results/visual',
          `${width}-${route.replace(/[^a-z]/gi, '-')}.png`,
        ),
        fullPage: true,
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(overflow, `${route} overflow at ${width}`).toBe(false);
    }
  }
  expect(failures).toEqual([]);
});

test('dialog failures stay visible; screenshot upload and mobile navigation work', async ({
  page,
}) => {
  await page.goto('/#Today');
  await page.getByLabel('What did you work on?').fill('30 min Python practice');
  await page.getByRole('button', { name: 'Use optional AI' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Generate reviewable proposal' }).click();
  await expect(dialog.getByRole('alert')).toContainText('No AI provider configured');
  await page.screenshot({
    path: path.join(process.env.ARTIFACT_DIR || 'test-results/visual', 'ai-error-dialog.png'),
  });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('/#Notes');
  await page.getByRole('button', { name: '＋ Add note' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Raster screenshot test');
  await page.getByLabel('Attach a screenshot', { exact: false }).setInputFiles({
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(dialog.getByRole('img')).toBeVisible();
  await dialog.getByRole('img').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(process.env.ARTIFACT_DIR || 'test-results/visual', 'note-image-dialog.png'),
  });
  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(
    page.getByRole('img', { name: 'Screenshot for Raster screenshot test' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeVisible();
  await page.screenshot({
    path: path.join(process.env.ARTIFACT_DIR || 'test-results/visual', 'mobile-menu.png'),
  });
  await page.getByRole('button', { name: 'Close navigation' }).click();
  await expect(page.locator('aside')).not.toBeVisible();
  await page.goto('/#Settings');
  await page.getByLabel('Appearance').selectOption('dark');
  await page.getByRole('button', { name: 'Save profile & recalculate' }).click();
  await page.goto('/#Today');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: path.join(process.env.ARTIFACT_DIR || 'test-results/visual', 'mobile-dark-today.png'),
    fullPage: true,
  });
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(new URL(page.url()).origin)) external.push(r.url());
  });
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  expect(external).toEqual([]);
});

test('LaTeX studio preserves imported source, autosaves and renders downloadable PDF', async ({
  page,
}) => {
  page.on('dialog', (dialog) => dialog.accept());
  const fs = await import('node:fs/promises');
  const bytes = await fs.readFile('tests/fixtures/clean.pdf');
  await page.route('**/api/latex/status', (r) =>
    r.fulfill({ json: { installed: true, busy: false, supported: true, version: 'test' } }),
  );
  let compiledSource = '';
  await page.route('**/api/latex/compile', (r) => {
    compiledSource = r.request().postDataJSON().source;
    return r.fulfill({
      json: {
        pdf: bytes.toString('base64'),
        log: 'Synthetic compiler protocol fixture',
        sourceHash: 'test',
      },
    });
  });
  await page.goto('/#Resume');
  await page.getByRole('button', { name: 'LaTeX editor & PDF' }).click();
  const source =
    '\\documentclass{article}\r\n\\pagestyle{empty}\r\n\\begin{document}My exact source\\end{document}';
  await page.getByLabel('Import original .tex').setInputFiles({
    name: 'original-layout.tex',
    mimeType: 'text/plain',
    buffer: Buffer.from(source),
  });
  await expect
    .poll(async () => {
      const data = await (await page.request.get('/api/state')).json();
      return data.state.resumeDocuments.find((d: any) => d.title === 'original-layout')?.source;
    })
    .toBe(source);
  await page.getByLabel('I trust this LaTeX source to run locally').check();
  await page.getByRole('button', { name: 'Compile / retry PDF' }).click();
  await expect(page.getByRole('img', { name: 'PDF page 1 of 1' })).toBeVisible();
  expect(compiledSource).toBe(source);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download PDF', exact: true }).click();
  const download = await downloadPromise;
  expect(await fs.readFile((await download.path())!)).toEqual(bytes);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(process.env.ARTIFACT_DIR || 'test-results/visual', 'latex-studio-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(process.env.ARTIFACT_DIR || 'test-results/visual', 'latex-studio-mobile.png'),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
    false,
  );
  await page.getByLabel('LaTeX source', { exact: true }).fill(source + '\n% Edited layout');
  await expect(page.getByText('PDF is out of date', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download PDF', exact: true })).not.toBeVisible();
  await expect
    .poll(async () => {
      const data = await (await page.request.get('/api/state')).json();
      return data.state.resumeDocuments.find((d: any) => d.title === 'original-layout')?.source;
    })
    .toContain('Edited layout');
  await page.reload();
  await page.getByRole('button', { name: 'LaTeX editor & PDF' }).click();
  // The default selection is the first document. Select the imported document explicitly.
  await page
    .getByLabel('Resume document', { exact: true })
    .selectOption({ label: 'original-layout' });
  await expect(page.getByLabel('LaTeX source', { exact: true })).toHaveValue(/Edited layout/);
});

test('research planner requires consent and supports saved retry/review flow', async ({ page }) => {
  let stage = 'failed';
  let started = false;
  let applied = false;
  const run = {
    id: '55555555-5555-4555-8555-555555555555',
    input: { goal: 'Urban planner', weeklyHours: 12, replaceStarter: true },
    baseRevision: 0,
    status: 'failed',
    stage: 'Saved evidence ready for retry',
    createdAt: '2026-10-23',
    updatedAt: '2026-10-23',
    attempt: 1,
    queries: ['urban planner requirements'],
    results: [],
    sources: [
      {
        title: 'Primary guidance',
        url: 'https://example.org/guide',
        excerpt: 'Professional source evidence',
      },
    ],
    warnings: [],
    error: 'Search provider unavailable',
    proposal: null as any,
  };
  await page.route('**/api/research-runs', (r) =>
    r.fulfill({
      json: {
        runs: started
          ? [
              {
                ...run,
                status: stage,
                error: stage === 'failed' ? run.error : '',
                proposal:
                  stage === 'ready'
                    ? { summary: 'Role-specific portfolio and policy plan', operations: [] }
                    : null,
              },
            ]
          : [],
        search: { engine: 'Synthetic search fixture' },
      },
    }),
  );
  await page.route('**/api/research-runs/start', (r) => {
    expect(r.request().postDataJSON().onlineConsent).toBe(true);
    started = true;
    return r.fulfill({ status: 202, json: run });
  });
  await page.route('**/api/research-runs/retry', (r) => {
    stage = 'ready';
    return r.fulfill({ status: 202, json: { ...run, status: 'ready' } });
  });
  await page.goto('/#Research');
  await page.getByText('Target details, JD & research settings', { exact: true }).click();
  await page.getByLabel('Target role / switching goal').fill('Urban planner');
  const start = page.getByRole('button', { name: 'Research & generate plan', exact: true });
  await expect(start).toBeDisabled();
  await page
    .getByLabel('Allow online searches and public-page retrieval', { exact: false })
    .check();
  await start.click();
  await expect(page.getByRole('button', { name: 'Retry with saved evidence' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry with saved evidence' }).click();
  await expect(page.getByText('Role-specific portfolio and policy plan')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply reviewed research plan' })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(
      process.env.ARTIFACT_DIR || 'test-results/visual',
      'research-planner-desktop.png',
    ),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(
      process.env.ARTIFACT_DIR || 'test-results/visual',
      'research-planner-mobile.png',
    ),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
    false,
  );
});
