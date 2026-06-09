import { defineConfig, devices } from '@playwright/test';

// E2E runs against a dev server on a dedicated port with its own throwaway DB,
// so it never touches local dev data. global-setup wipes the test DB first.
const PORT = 3100;
const DB_PATH = './.e2e/conference.db';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 15_000,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: String(PORT), DB_PATH },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
