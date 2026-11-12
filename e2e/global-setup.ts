import fs from 'node:fs'
import { chromium, type FullConfig } from '@playwright/test'
import { baseUrl, credentials } from './env'

/** Sign in once and keep the session for every test. */
export default async function globalSetup(config: FullConfig) {
  const base = baseUrl()
  const { email, password } = credentials()
  const launch = config.projects[0]?.use?.launchOptions ?? {}
  const browser = await chromium.launch(launch)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${base}/login`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.fill('#email', email)
  await page.fill('#password', password)
  await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 120_000 }), page.getByRole('button', { name: /^sign in$/i }).click()])
  fs.mkdirSync('e2e/.auth', { recursive: true })
  await page.context().storageState({ path: 'e2e/.auth/state.json' })
  await browser.close()
}
