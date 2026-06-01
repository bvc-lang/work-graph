// @ts-check
import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.WORKGRAPH_BACKLOG_UI_PORT || '4188';
const e2eOrigin = `http://127.0.0.1:${e2ePort}`;

const traceMode =
  process.env.PW_TRACE === '1' || process.env.PW_TRACE === 'on' ? 'on' : 'on-first-retry';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: e2eOrigin,
    trace: traceMode,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/run-e2e-operator-dashboard-server.mjs',
    url: e2eOrigin,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ...process.env,
      WORKGRAPH_BACKLOG_UI_PORT: e2ePort,
    },
  },
});
