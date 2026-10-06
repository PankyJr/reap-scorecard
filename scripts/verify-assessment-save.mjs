// Verifies that a procurement assessment can be created and saved end to end.
// Development utility only.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

for (const line of readFileSync(resolve('.env.local'), 'utf8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
}

const base = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000'
const email = process.env.REAP_TRAINING_EMAIL ?? 'reap.training.demo@example.com'
const password = process.env.REAP_TRAINING_PASSWORD ?? 'Reap!Training2026'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.setDefaultTimeout(20000)

const serverErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') serverErrors.push(m.text())
})
page.on('response', (r) => {
  if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`)
})

const log = (m) => console.log(m)

try {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  // The sign-in form is handled entirely in the client, so it must hydrate
  // before the click or the browser falls back to a native GET submit.
  await page.waitForTimeout(2500)
  await page.getByLabel(/email/i).first().fill(email)
  await page.getByLabel(/password/i).first().fill(password)
  await page.getByRole('button', { name: /sign in with email/i }).first().click()
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  log('signed in')

  await page.goto(`${base}/companies`, { waitUntil: 'networkidle' })
  const profile = page.getByRole('link', { name: /view profile/i }).first()
  if (!(await profile.isVisible().catch(() => false))) {
    log('no company found — creating one')
    await page.goto(`${base}/companies/new`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.locator('#name').fill('Save Verification Holdings (Pty) Ltd')
    await page.locator('#contact_person').fill('Lerato Mahlangu')
    await page.locator('#email').fill('operations@saveverification.example')
    await page.locator('#phone').fill('011 555 0100')
    await page.getByRole('button', { name: /save company/i }).first().click()
    await page.waitForURL(/\/companies\/[0-9a-f-]{36}/, { timeout: 30000 })
  } else {
    const href = await profile.getAttribute('href')
    await page.goto(`${base}${href}`, { waitUntil: 'networkidle' })
  }
  const companyId = page.url().match(/\/companies\/([0-9a-f-]{36})/)?.[1]
  if (!companyId) throw new Error(`could not resolve company id from ${page.url()}`)
  log(`company: ${companyId}`)

  await page.goto(
    `${base}/procurement/assessments/new?companyId=${companyId}`,
    { waitUntil: 'networkidle' },
  )
  await page.waitForTimeout(2000)
  log('assessment form open')

  await page.locator('#assessment_year').fill('2026')

  await page.getByRole('button', { name: /add supplier row/i }).first().click()
  await page.getByLabel('Supplier name').first().fill('Verification Supplier (Pty) Ltd')
  await page.getByLabel('Supplier B-BBEE spend').first().fill('1000000')

  // Supplier spend as TMPS only unlocks once a positive-spend row exists.
  const tmpsOption = page
    .getByRole('button', { name: /use supplier spend as tmps/i })
    .first()
  await tmpsOption.click()

  const save = page.getByRole('button', { name: /save procurement assessment/i }).first()
  await save.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  if (await save.isDisabled()) {
    throw new Error('save button is disabled — denominator likely zero')
  }
  await save.click()

  await page.waitForURL(/\/procurement\/assessments\/[0-9a-f-]{36}/, { timeout: 45000 })
  log(`SAVED: ${page.url()}`)
  log('RESULT: PASS')
} catch (error) {
  log(`RESULT: FAIL — ${error.message}`)
  log(`url at failure: ${page.url()}`)
  const banner = await page
    .locator('text=/failed|error|could not|cannot/i')
    .first()
    .textContent()
    .catch(() => null)
  if (banner) log(`on-screen message: ${banner.trim().slice(0, 300)}`)
  await page.screenshot({ path: 'tmp/verify-save-failure.png', fullPage: false }).catch(() => {})
  process.exitCode = 1
} finally {
  if (serverErrors.length) log(`console/server errors:\n${serverErrors.slice(0, 10).join('\n')}`)
  await browser.close()
}
