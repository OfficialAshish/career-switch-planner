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
