import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * Browser end-to-end tests against the **real** stack: the built SPA, the
 * API built from this repository, its database, and the sign-in simulator
 * (`tools/auth-simulator`) in place of the INNLAB Hub, Core and Cognito.
 * Nothing is faked with `page.route`, except where a test injects a fault
 * on purpose (a service that does not answer).
 *
 * Before running (CI does all of it, see `Jenkinsfile`):
 *
 *   pnpm db:up                                   # Postgres and the test inbox
 *   AUTH_SIMULATOR_CONFIRM=simulated-sign-in-only pnpm auth:simulated:up
 *   pnpm --filter @innlab/api db:migration:run && pnpm --filter @innlab/api db:seed
 *   pnpm --filter @innlab/api build
 *   pnpm --filter @innlab/web test:full-stack
 *
 * The config starts the API and the SPA itself (on ports of their own, so
 * a development server keeps running). `E2E_START_SERVERS=false` reuses
 * ones already up, at `E2E_WEB_URL` and `E2E_API_URL`.
 *
 * Browsers: `E2E_BROWSERS`, comma separated, out of `chromium`, `firefox`
 * and `msedge` (Microsoft Edge must be installed: the Jenkins image has
 * it). Default: `chromium,firefox`.
 *
 * The tests share three simulated users and the same database, so they run
 * one at a time.
 */
const CI = Boolean(process.env.CI);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4174);
const API_PORT = Number(process.env.E2E_API_PORT ?? 3200);
const WEB_URL = process.env.E2E_WEB_URL ?? `http://localhost:${String(WEB_PORT)}`;
const API_URL = process.env.E2E_API_URL ?? `http://localhost:${String(API_PORT)}/api/v1`;
const SIMULATOR_URL = process.env.E2E_SIMULATOR_URL ?? 'http://localhost:8090';
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://irl_user:irl_dev_password@localhost:5433/irl_diagnostic';

const BROWSERS: Record<string, Project['use']> = {
  chromium: { ...devices['Desktop Chrome'] },
  firefox: { ...devices['Desktop Firefox'] },
  msedge: { ...devices['Desktop Edge'], channel: 'msedge' },
};
const wanted = (process.env.E2E_BROWSERS ?? 'chromium,firefox')
  .split(',')
  .map((b) => b.trim())
  .filter((b) => b !== '');

export default defineConfig({
  testDir: './tests/full-stack',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  outputDir: 'test-results/full-stack',
  reporter: CI
    ? [
        ['list'],
        ['junit', { outputFile: 'test-results/full-stack/junit.xml' }],
        ['json', { outputFile: 'test-results/full-stack/results.json' }],
        ['html', { open: 'never', outputFolder: 'playwright-report/full-stack' }],
      ]
    : 'list',
  use: {
    baseURL: WEB_URL,
    // Evidence of every run: the trace of each test, and screenshots.
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    acceptDownloads: true,
  },
  projects: wanted.map((name) => {
    const use = BROWSERS[name];
    if (use === undefined) throw new Error(`Unknown browser in E2E_BROWSERS: ${name}`);
    return { name, use };
  }),
  webServer:
    process.env.E2E_START_SERVERS === 'false'
      ? undefined
      : [
          {
            // The API as `pnpm --filter @innlab/api build` leaves it.
            command: process.env.E2E_API_COMMAND ?? 'node ../api/dist/main.js',
            url: `${API_URL}/health/live`,
            reuseExistingServer: !CI,
            timeout: 60_000,
            env: {
              NODE_ENV: 'test',
              APP_PORT: String(API_PORT),
              WEB_ORIGIN: WEB_URL,
              DATABASE_URL,
              COGNITO_JWKS_URI: `${SIMULATOR_URL}/.well-known/jwks.json`,
              COGNITO_ISSUER: process.env.E2E_SIMULATOR_ISSUER ?? 'http://localhost:8090',
              INNLAB_API_BASE_URL: `${SIMULATOR_URL}/api`,
              CORE_INTERNAL_KEY: 'simulated-internal-key',
              // The report mail goes to the test inbox, never outside.
              REPORT_NOTIFY_TO: 'innlab-e2e@innlab.example.com',
              SMTP_HOST: process.env.E2E_SMTP_HOST ?? 'localhost',
              SMTP_PORT: process.env.E2E_SMTP_PORT ?? '1025',
              SMTP_USER: '',
              SMTP_PASS: '',
              SMTP_FROM: 'noreply@innlab.example.com',
              LOG_LEVEL: 'warn',
            },
          },
          {
            command: `pnpm exec vite build --outDir dist-e2e && pnpm exec vite preview --outDir dist-e2e --port ${String(WEB_PORT)} --strictPort`,
            url: WEB_URL,
            reuseExistingServer: !CI,
            timeout: 180_000,
            env: {
              VITE_API_BASE_URL: API_URL,
              VITE_CORE_URL: SIMULATOR_URL,
              VITE_CORE_API_URL: `${SIMULATOR_URL}/api`,
            },
          },
        ],
});
