import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * Browser end-to-end tests: one spec per user story (`tests/e2e/`). They run
 * against the production build served by `vite preview`; the backend is
 * intercepted in each spec (`page.route`) and the INNLAB session is seeded
 * in `localStorage`, so no Cognito or API is needed. The same journey
 * against the real stack is `playwright.full-stack.config.ts`.
 *
 * Browsers: `E2E_BROWSERS` (comma separated: `chromium`, `firefox`,
 * `msedge`); Chromium alone by default.
 */
const BROWSERS: Record<string, Project['use']> = {
  chromium: { ...devices['Desktop Chrome'] },
  firefox: { ...devices['Desktop Firefox'] },
  msedge: { ...devices['Desktop Edge'], channel: 'msedge' },
};
const wanted = (process.env.E2E_BROWSERS ?? 'chromium')
  .split(',')
  .map((b) => b.trim())
  .filter((b) => b !== '');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ['list'],
        ['junit', { outputFile: 'test-results/mocked/junit.xml' }],
        ['json', { outputFile: 'test-results/mocked/results.json' }],
        ['html', { open: 'never', outputFolder: 'playwright-report/mocked' }],
      ]
    : 'list',
  outputDir: 'test-results/mocked',
  use: {
    baseURL: 'http://localhost:4173',
    trace: process.env.CI ? 'on' : 'on-first-retry',
    screenshot: process.env.CI ? 'on' : 'off',
  },
  projects: wanted.map((name) => {
    const use = BROWSERS[name];
    if (use === undefined) throw new Error(`Unknown browser in E2E_BROWSERS: ${name}`);
    return { name, use };
  }),
  webServer: {
    command: 'pnpm exec vite build && pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
