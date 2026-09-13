import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 9292);
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

/**
 * Browser test configuration.
 *
 * Artefacts (HTML report, videos, traces, screenshots) are kept for
 * successful runs as well, so that a green run can be exported and
 * reviewed. A run only fails when a test actually fails: a mismatching
 * assertion, or a page/fixture that cannot be initialised.
 */
export default defineConfig({
  testDir: './test/e2e',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // No retries: a flaky pass would hide a real mismatch.
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }]
  ],

  use: {
    baseURL: BASE_URL,
    // 'on' rather than 'retain-on-failure': the report is meant to be
    // exportable after a successful run too.
    video: 'on',
    trace: 'on',
    screenshot: 'on'
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: /visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      testIgnore: /visual\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      testIgnore: /visual\.spec\.ts/,
      use: { ...devices['Desktop Safari'] }
    },
    {
      // Screenshot comparisons are rendering-environment specific and
      // are therefore kept in their own project, run separately.
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: {
    command: 'node script/static_server.js',
    url: `${BASE_URL}/test/matrix.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
