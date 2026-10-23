import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';

test('syllabus manual progress, editable context prompt, external Markdown preview and apply', async ({
  page,
}) => {
  await page.goto('/#Syllabus');
  await expect(
    page.getByRole('heading', { name: 'Learn, build, explain. Beyond a question list.' }),
  ).toBeVisible();
  await page.getByLabel('Find a concept').fill('Python values');
  await page.getByRole('button', { name: 'Edit topic / progress' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit syllabus topic' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Status', { exact: true }).selectOption('Learning');
  await dialog
    .getByLabel('Evidence', { exact: true })
    .fill('I tested aliasing and dictionary counts.');
  await dialog.getByRole('button', { name: 'Save topic locally' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Python foundations · Learning', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Python foundations · Learning', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Build fresh context prompt' }).click();
  const prompt = page.getByLabel('Editable syllabus prompt');
  await expect(prompt).toHaveValue(/baseRevision/);
  const state = await page.evaluate(async () => (await (await fetch('/api/state')).json()).state);
  const id = 'ui-topic-' + Date.now();
  const proposal = {
    format: 'career-syllabus',
    version: 1,
    baseRevision: state.revision,
    summary: 'A synthetic externally generated concept.',
    operations: [
      {
        kind: 'topic',
        value: {
          ...state.topics[0],
          id,
          title: 'Synthetic imported syllabus',
          status: 'Not started',
          evidence: '',
          prerequisites: [],
        },
      },
    ],
  };
  await page
    .getByLabel('Or paste response Markdown')
    .fill('```career-syllabus\n' + JSON.stringify(proposal) + '\n```');
  await page.getByRole('button', { name: 'Validate & preview Markdown' }).click();
  await expect(page.getByRole('heading', { name: 'Review syllabus changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Apply reviewed syllabus' }).click();
  await page.getByLabel('Find a concept').fill('Synthetic imported syllabus');
  await expect(page.getByRole('heading', { name: 'Synthetic imported syllabus' })).toBeVisible();
  await page.getByRole('button', { name: 'Build fresh context prompt' }).click();
  await page.getByRole('button', { name: 'Save prompt locally' }).click();
  await expect(page.getByRole('status')).toContainText('Prompt saved');
});

test('workbook UI previews an edited topic, applies it and sidebar scrolls on short mobile screens', async ({
  page,
}) => {
  await page.goto('/#Settings');
  const response = await page.request.get('/api/export.xlsx');
  expect(response.ok()).toBeTruthy();
  const w = new ExcelJS.Workbook();
  await w.xlsx.load((await response.body()) as any);
  w.getWorksheet('Syllabus')!.getCell('H2').value = 'Practicing';
  const file = Buffer.from(await w.xlsx.writeBuffer());
  await page.getByLabel('Import Excel tracker (preview reconciliation)').setInputFiles({
    name: 'edited-tracker.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: file,
  });
  await expect(page.getByRole('heading', { name: 'Workbook reconciliation' })).toBeVisible();
  await page.getByRole('button', { name: 'Apply reviewed workbook' }).click();
  await expect(page.getByRole('heading', { name: 'Workbook reconciliation' })).not.toBeVisible();
  await page.goto('/#Syllabus');
  await page.getByLabel('Find a concept').fill('Python values');
  await expect(page.getByText('Python foundations · Practicing', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 420 });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  const sidebar = page.locator('aside');
  expect(await sidebar.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
  expect(await sidebar.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await sidebar.getByRole('link', { name: 'Syllabus', exact: true }).scrollIntoViewIfNeeded();
  await expect(sidebar.getByRole('link', { name: 'Syllabus', exact: true })).toBeVisible();
});
