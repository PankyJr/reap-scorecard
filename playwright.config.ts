import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

/**
 * Tour tests (e2e/): sign in once as the staging review login, then run every
 * page's tour and the multi-page tours start to finish. They only read pages;
 * they never save anything. Run against a local server on staging data or the
 * staging preview:
 *
 *   E2E_BASE_URL=http://localhost:3001 npx playwright test
 *
 * Credentials: E2E_EMAIL / E2E_PASSWORD, or the git-ignored
 * tmp/staging-secrets/review-shared.json. Never production.
 */
const CACHED_CHROME =
  '/Users/pankymbhalati/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const executablePath = process.env.E2E_CHROME ?? (fs.existsSync(CACHED_CHROME) ? CACHED_CHROME : undefined)

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 30_000 },
  reporter: [['list'], ['json', { outputFile: 'e2e-results/report.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    viewport: { width: 1440, height: 900 },
    storageState: 'e2e/.auth/state.json',
    launchOptions: executablePath ? { executablePath } : {},
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    trace: 'retain-on-failure',
  },
})
