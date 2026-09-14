#!/usr/bin/env node
/**
 * Visual evidence pass against a deployed staging (or review) URL.
 *
 * Deterministic data/persistence checks live in scripts/staging-full-scorecard-e2e.ts.
 * This script drives a real browser and writes screenshots under artifacts/staging-smoke/
 * (gitignored — may include beneficiary names from the uploaded workbook).
 *
 * Required environment variables:
 *   STAGING_URL
 *   STAGING_ADMIN_EMAIL
 *   STAGING_ADMIN_PASSWORD
 *   STAGING_ADMIN_COMPANY_ID
 *   STAGING_NONADMIN_EMAIL
 *   STAGING_NONADMIN_PASSWORD
 *   STAGING_SED_WORKBOOK          Absolute or repo-relative path to the SED .xlsx fixture
 *
 * Optional:
 *   STAGING_SMOKE_OUT            Screenshot output directory (default: artifacts/staging-smoke)
 *   STAGING_EXPECTED_VALID_ROWS  Default 3
 *   STAGING_EXPECTED_TOTAL       Platform recognised total as a number string (default 420000)
 *   STAGING_EXPECTED_POINTS      Default 5
 *   STAGING_NPAT                 Default 42000000
 *   STAGING_TARGET_PERCENT       Default 0.01
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

function requireEnv(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return String(value).trim()
}

const BASE = requireEnv('STAGING_URL').replace(/\/$/, '')
const OUT = process.env.STAGING_SMOKE_OUT?.trim() || 'artifacts/staging-smoke'
const WORKBOOK = requireEnv('STAGING_SED_WORKBOOK')

const admin = {
  email: requireEnv('STAGING_ADMIN_EMAIL'),
  password: requireEnv('STAGING_ADMIN_PASSWORD'),
  companyId: requireEnv('STAGING_ADMIN_COMPANY_ID'),
}
const nonAdmin = {
  email: requireEnv('STAGING_NONADMIN_EMAIL'),
  password: requireEnv('STAGING_NONADMIN_PASSWORD'),
}

const expectedValidRows = Number(process.env.STAGING_EXPECTED_VALID_ROWS ?? '3')
const expectedTotal = Number(process.env.STAGING_EXPECTED_TOTAL ?? '420000')
const expectedPoints = Number(process.env.STAGING_EXPECTED_POINTS ?? '5')
const npat = String(process.env.STAGING_NPAT ?? '42000000')
const targetPercent = String(process.env.STAGING_TARGET_PERCENT ?? '0.01')

if (!Number.isFinite(expectedValidRows) || !Number.isFinite(expectedTotal) || !Number.isFinite(expectedPoints)) {
  throw new Error('STAGING_EXPECTED_* values must be finite numbers')
}
if (!fs.existsSync(WORKBOOK)) {
  throw new Error(`SED workbook not found at ${WORKBOOK}`)
}

// en-ZA currency spacing (non-breaking space may appear in the DOM).
const expectedTotalDisplay = `R${expectedTotal.toLocaleString('en-ZA')}`.replace(/\u00a0/g, ' ')
const expectedPointsFixed = expectedPoints.toFixed(2)

fs.mkdirSync(OUT, { recursive: true })

const results = []
const shot = async (page, name) => {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}
const check = (label, ok, detail = '') => {
  // Never echo passwords, emails beyond a masked form, or beneficiary row payloads.
  results.push({ label, ok, detail: detail ? String(detail).slice(0, 120) : '' })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail).slice(0, 120)}` : ''}`)
}

const waitForHydration = async (page) => {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(1500)
}

const signIn = async (page, email, password) => {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await waitForHydration(page)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Sign in with email")')
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90_000 })
}

const dismissGuide = async (page) => {
  for (const label of ['Skip guide', 'Close guide']) {
    const btn = page.getByRole('button', { name: label }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {})
      await page.waitForTimeout(300)
    }
  }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
let assessmentId = null

try {
  await signIn(page, admin.email, admin.password)
  check('Admin sign-in on deployed staging', true, new URL(page.url()).pathname)

  await page.goto(`${BASE}/scorecards/new?companyId=${encodeURIComponent(admin.companyId)}`, {
    waitUntil: 'domcontentloaded',
  })
  await waitForHydration(page)
  await dismissGuide(page)
  await page.waitForSelector('text=What do you want to calculate?')
  const scopeText = await page.locator('body').innerText()
  check(
    'Scope selector shows All available elements / Single element / Selected elements',
    scopeText.includes('All available elements') &&
      scopeText.includes('Single element') &&
      scopeText.includes('Selected elements'),
  )
  check('Old "Full available scorecard" wording is gone', !scopeText.includes('Full available scorecard'))
  await shot(page, '01-scope-selector')

  await page.click('button:has-text("Start Scorecard Assessment")')
  await page.waitForURL(/\/scorecards\/calculator\/[0-9a-f-]+/, { timeout: 60_000 })
  assessmentId = page.url().match(/calculator\/([0-9a-f-]+)/)?.[1] ?? null
  check('Assessment created', Boolean(assessmentId), assessmentId ? 'id-captured' : 'missing')

  const elementUrl = `${BASE}/scorecards/calculator/${assessmentId}/elements/socio_economic_development`
  await page.goto(elementUrl, { waitUntil: 'domcontentloaded' })
  await waitForHydration(page)

  await page.setInputFiles('input[type="file"][name="file"]', WORKBOOK)
  await page.click('button:has-text("Upload and validate")')
  await page.waitForURL(/imported=1/, { timeout: 90_000 })
  await page.waitForSelector('text=Worksheet')
  const importText = (await page.locator('body').innerText()).replace(/\u00a0/g, ' ')
  check('Worksheet detected as SED', /Worksheet\s*\n?\s*SED/.test(importText))
  check(
    `${expectedValidRows} valid rows`,
    new RegExp(`Valid rows\\s*\\n?\\s*${expectedValidRows}\\b`).test(importText),
  )
  check(`Recognised total ${expectedTotalDisplay}`, importText.includes(expectedTotalDisplay))
  await shot(page, '02-sed-upload-preview')

  await page.fill('input[name="npatAmount"]', npat)
  await page.fill('input[name="targetPercent"]', targetPercent)
  await page.fill('input[name="availablePoints"]', String(expectedPoints))
  await page.click('button:has-text("Save inputs")')
  await page.waitForURL(/saved=1/, { timeout: 60_000 })

  await page.click('button:has-text("Calculate element")')
  await page.waitForURL(/calculated=1/, { timeout: 90_000 })
  const calcText = (await page.locator('body').innerText()).replace(/\u00a0/g, ' ')
  check(
    `SED scores ${expectedPoints} of ${expectedPoints} available points`,
    new RegExp(`${expectedPoints}\\s*\\/\\s*${expectedPoints}`).test(calcText),
  )
  await shot(page, '03-sed-calculated')

  await page.goto(`${BASE}/scorecards/calculator/${assessmentId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Combined selected points', { timeout: 60_000 })
  const summaryText = (await page.locator('body').innerText()).replace(/\u00a0/g, ' ')
  check(`Combined selected points shows ${expectedPointsFixed}`, summaryText.includes(expectedPointsFixed))
  check(
    'Partial-scorecard disclaimer present',
    summaryText.includes('Selected-element score. This is not a complete B-BBEE level.'),
  )
  await shot(page, '04-saved-result-disclaimer')

  const reopen = await ctx.newPage()
  await reopen.goto(`${BASE}/scorecards/calculator/${assessmentId}`, { waitUntil: 'domcontentloaded' })
  await reopen.waitForSelector('text=Combined selected points', { timeout: 60_000 })
  const reopenText = (await reopen.locator('body').innerText()).replace(/\u00a0/g, ' ')
  check(`Reopened assessment still shows ${expectedPointsFixed}`, reopenText.includes(expectedPointsFixed))
  await shot(reopen, '05-reopened-persistence')
  await reopen.close()

  await page.goto(elementUrl, { waitUntil: 'domcontentloaded' })
  await waitForHydration(page)
  await page.locator('input[name="notes"]').first().fill('Staging browser verification edit')
  await page.locator('button:has-text("Save row")').first().click()
  await page.waitForURL(/edited=1/, { timeout: 60_000 })
  const editedText = (await page.locator('body').innerText()).replace(/\u00a0/g, ' ')
  check(
    'Row edit flags recalculation required',
    editedText.includes('Inputs changed since the last calculation'),
  )
  await shot(page, '06-needs-recalculation')

  await page.click('button:has-text("Calculate element")')
  await page.waitForURL(/calculated=1/, { timeout: 90_000 })
  check('Explicit recalculation succeeded', true)
  await shot(page, '07-recalculated')

  await page.goto(`${BASE}/scorecards/calculator/${assessmentId}/report`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const reportText = (await page.locator('body').innerText()).replace(/\u00a0/g, ' ')
  check(
    'Report shows partial-scorecard disclaimer',
    reportText.includes('Selected-element score. This is not a complete B-BBEE level.'),
  )
  check(
    'Report suppresses overall B-BBEE level',
    reportText.includes('Overall B-BBEE level is not shown for partial or incomplete scope.'),
  )
  await shot(page, '08-printable-report')

  const pdfPath = path.join(OUT, '09-report-print.pdf')
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true })
  const pdfOk = fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 5000
  check('Browser Print / Save as PDF produces a document', pdfOk, `${fs.statSync(pdfPath).size} bytes`)

  await page.goto(`${BASE}/settings/eap-targets`, { waitUntil: 'domcontentloaded' })
  await waitForHydration(page)
  const adminEapText = await page.locator('body').innerText()
  const adminEapOk =
    /EAP target/i.test(adminEapText) &&
    !/Access denied/i.test(adminEapText) &&
    !/This page could not be found/i.test(adminEapText)
  check('Admin can open EAP targets', adminEapOk, new URL(page.url()).pathname)
  await shot(page, '10-eap-admin-allowed')

  const naCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const naPage = await naCtx.newPage()
  await signIn(naPage, nonAdmin.email, nonAdmin.password)
  const naSidebar = await naPage.locator('body').innerText()
  check('Non-admin sidebar hides EAP targets link', !naSidebar.includes('EAP targets'))

  const resp = await naPage.goto(`${BASE}/settings/eap-targets`, { waitUntil: 'domcontentloaded' })
  await waitForHydration(naPage)
  await dismissGuide(naPage)
  const naBody = await naPage.locator('body').innerText()
  const naControls = await naPage.locator('main button, main input, form input, form button').count()
  const denied =
    resp.status() === 403 ||
    /Access denied/i.test(naBody) ||
    /HTTP 403/i.test(naBody)
  check(
    'Non-admin blocked from EAP targets with non-success semantics',
    denied && naControls === 0 && !/Create draft/i.test(naBody),
    `HTTP ${resp.status()}, ${naControls} controls`,
  )
  await shot(naPage, '11-eap-nonadmin-blocked')
  await naCtx.close()
} finally {
  await browser.close()
  fs.writeFileSync(
    path.join(OUT, 'browser-smoke-report.json'),
    JSON.stringify(
      {
        base: BASE,
        assessmentIdCaptured: Boolean(assessmentId),
        results,
      },
      null,
      2,
    ) + '\n',
  )
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) process.exitCode = 1
}
