import { defineConfig } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4318';
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 45000,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    launchOptions: {
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'node scripts/test-server.mjs',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 20000,
      },
  reporter: [['list'], ['html', { open: 'never' }]],
});
