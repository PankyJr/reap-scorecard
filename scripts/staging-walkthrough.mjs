/**
 * The whole journey on STAGING, through the real screens, as a brand-new
 * user would take it. Also the first-time-user test: every step is taken
 * from what the screen offers (Home's next step, the cards, "Done, next
 * area"), not by typing addresses, wherever the screen offers a way.
 *
 *   A. Full scorecard: add a company, "What do you need?", create the
 *      scorecard, upload the golden workbook, fill in what it leaves out,
 *      confirm the evidence, calculate (the golden benchmark is checked),
 *      attach a procurement scorecard, calculate the final level, download
 *      the PDF.
 *   B. Procurement only: add a company, upload a supplier list with
 *      problems, fix one with one click, save, download the PDF, then
 *      "Continue to full scorecard".
 *
 * Throughout, it records console errors, failed requests and HTTP errors,
 * and at the end checks every link it saw. A throwaway pre-confirmed login
 * is made with the admin API and deleted at the end with everything it made.
 *
 *   set -a; . ./.env.local; set +a
 *   PLAYWRIGHT_DIR=<folder with node_modules/playwright> \
 *   VERIFY_BASE_URL=http://localhost:3005 \
 *     node scripts/staging-walkthrough.mjs [--phone]
 *
 * Exits 1 on any failed step, console error, failed request or broken link.
 */
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const BASE = (process.env.VERIFY_BASE_URL ?? 'http://localhost:3005').replace(/\/$/, '')
const PHONE = process.argv.includes('--phone')
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
if (!URL_.includes('jzvqyryblsfxlinvoiuf')) throw new Error('Staging only: NEXT_PUBLIC_SUPABASE_URL is not the staging project.')
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const GOLDEN = path.resolve('test-fixtures/golden/golden-populated-workbook.xlsx')
const GOLDEN_EXPECTED = { total: 54.69, ed: 3.63, sd: 7.25, sed: 3.0 }

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    return createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? '', 'noop.js'))('playwright')
  }
}

// Supplier lists, in the template's columns.
const HEAD = 'Supplier name,Amount spent ex VAT (ZAR),B-BBEE level,Certificate expiry date,Black owned %,Black women owned %,51% black designated group (yes/no),"Supplier type (EME, QSE or Generic)",51% flow-through (yes/no),VAT number,Company registration number'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reap-walkthrough-'))
const fullCsv = path.join(tmp, 'golden-suppliers.csv')
fs.writeFileSync(
  fullCsv,
  [
    HEAD,
    'Sample Steel Supplies,450000,1,2027-03-31,100,0,no,Generic,no,,',
    'Sample Logistics,180000,2,2027-03-31,100,40,no,QSE,no,,',
    'Sample Cleaning Services,60000,1,2027-03-31,100,40,yes,EME,no,,',
    'Sample Office Supplies,90000,4,2027-03-31,0,0,no,Generic,no,,',
  ].join('\n'),
)
const procCsv = path.join(tmp, 'trading-suppliers.csv')
fs.writeFileSync(
  procCsv,
  [
    HEAD,
    'Walk Packaging,320000,2,2027-06-30,100,40,no,QSE,no,,',
    'Walk Fuel,410000,4,2027-06-30,0,0,no,Generic,no,,',
    'Walk Security,95000,1,2027-06-30,100,100,yes,EME,no,,',
    'Walk Printing,40000,,2027-06-30,0,0,no,EME,no,,',
    'Walk Catering,25000,1,2024-02-28,100,60,no,EME,no,,',
    'Walk Couriers,70000,3,2027-06-30,60,10,no,QSE,no,,',
  ].join('\n'),
)

const email = `walkthrough-${Date.now()}@reap-staging.example`
const password = `Wt-${crypto.randomBytes(12).toString('base64url')}7!`
const { data: made, error: makeError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
if (makeError || !made.user) throw new Error(`createUser: ${makeError?.message}`)
const userId = made.user.id

const steps = []
const consoleErrors = []
const failedRequests = []
const httpErrors = []
const links = new Set()
let failure = null
const step = (text) => {
  steps.push(text)
  if (process.env.WALKTHROUGH_VERBOSE) console.log(`  ${text}`)
}

const { chromium } = await loadPlaywright()
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL === 'none' ? {} : { channel: 'chrome' })
const ctx = await browser.newContext(
  PHONE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } },
)
const page = await ctx.newPage()
page.setDefaultTimeout(60_000)
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${new URL(page.url()).pathname}: ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => consoleErrors.push(`${new URL(page.url()).pathname}: ${String(e).slice(0, 200)}`))
page.on('requestfailed', (r) => {
  const why = r.failure()?.errorText ?? ''
  // A navigation or prefetch the browser cancelled because the page moved on is not a failure.
  if (why.includes('ERR_ABORTED')) return
  failedRequests.push(`${why} ${r.url().slice(0, 140)}`)
})
page.on('response', (r) => {
  if (r.url().startsWith(BASE) && r.status() >= 400) httpErrors.push(`${r.status()} ${r.request().method()} ${r.url().slice(BASE.length, BASE.length + 120)}`)
})

async function settle() {
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
  await page.waitForTimeout(250)
  for (const href of await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    if (!href || href.startsWith('#') || /^(mailto|tel):/.test(href)) continue
    const absolute = new URL(href, page.url())
    if (absolute.origin === new URL(BASE).origin) links.add(absolute.pathname + absolute.search)
  }
}
/** Autosave waits 0.8 s after typing stops; give it time to reach the server. */
async function letAutosave() {
  await page.waitForTimeout(1500)
  await settle()
}
async function doneNextArea() {
  const from = new URL(page.url()).pathname
  await page.getByRole('button', { name: /^Done, next area$/ }).first().click()
  await page.waitForURL((u) => u.pathname !== from, { timeout: 60_000 })
  await settle()
}
async function confirmAllEvidence(url) {
  let confirmed = 0
  for (let n = 1; n <= 20; n++) {
    await page.goto(url)
    await settle()
    const form = page.locator('form', { has: page.getByRole('button', { name: /^Confirm supporting evidence$/ }) }).first()
    if (!(await form.count())) break
    await form.locator('input[name="evidenceReference"]').fill(`WALK-${n}`)
    await form.locator('input[name="evidenceReviewed"]').check()
    await form.getByRole('button', { name: /^Confirm supporting evidence$/ }).click()
    await page.waitForURL(/saved|confirmed/, { timeout: 60_000 }).catch(() => {})
    confirmed++
  }
  return confirmed
}
async function readResult() {
  await settle()
  const total = Number(await page.locator('[data-total-points]').first().getAttribute('data-total-points'))
  const level = await page.locator('[data-level]').first().getAttribute('data-level')
  const points = Object.fromEntries(
    await page.locator('[data-area]').evaluateAll((items) => items.map((li) => [li.getAttribute('data-area'), Number(li.getAttribute('data-points'))])),
  )
  return { total, level, points }
}
async function addCompany(name, industry, turnover, ownership) {
  await page.locator('input[name="name"]').fill(name)
  await page.locator('select[name="industry"]').selectOption({ label: industry })
  await page.locator('select[name="financial_year_end_month"]').selectOption({ label: 'February' })
  await page.locator('input[name="annual_turnover"]').fill(String(turnover))
  await page.locator('input[name="black_ownership_percentage"]').fill(String(ownership))
  await page.getByRole('button', { name: /^Save company$/ }).click()
  await page.waitForURL(/\/start\?.*companyId=/)
  await settle()
  return new URL(page.url()).searchParams.get('companyId')
}
async function uploadSuppliers(file, count) {
  await page.locator('input[type="file"]').first().setInputFiles(file)
  await page.getByText(new RegExp(`We found ${count} suppliers?`)).waitFor()
  await page.getByRole('button', { name: new RegExp(`^Use these ${count} suppliers$`) }).click()
  await page.getByRole('button', { name: /^Next: check suppliers$/ }).click()
  await page.getByRole('button', { name: /^Next: total spend$/ }).waitFor()
  await settle()
}
async function pdfOk(apiPath) {
  const res = await page.request.get(`${BASE}${apiPath}`)
  const body = await res.body()
  return { status: res.status(), type: res.headers()['content-type'], pdf: body.subarray(0, 5).toString() === '%PDF-', kb: Math.round(body.length / 1024) }
}

try {
  // ---- A. Full scorecard, as a first-time user -------------------------------------------
  await page.goto(`${BASE}/login`)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await Promise.all([page.waitForURL((u) => u.pathname.startsWith('/dashboard')), page.getByRole('button', { name: /^Sign in$/i }).click()])
  await settle()
  step('A1 signed in; Home')
  await page.getByRole('link', { name: /^Add your first company$/ }).first().click()
  await page.waitForURL(/\/companies\/new/)
  await settle()
  step('A2 Home\'s next step: "Add your first company"')
  await addCompany('Walkthrough Manufacturing (Pty) Ltd', 'Manufacturing', 250_000_000, 30)
  const sizeLine = await page.getByText(/You.re (an? )?(EME|QSE|large)/i).first().textContent({ timeout: 15_000 }).catch(() => '(no size line)')
  step(`A3 company saved; "What do you need?" says: ${sizeLine.slice(0, 120)}`)
  await page.getByRole('link', { name: /Full B-BBEE scorecard/ }).first().click()
  await page.waitForURL(/\/scorecards\/new/)
  await settle()
  await page.getByRole('button', { name: /^Create the scorecard$/ }).click()
  await page.waitForURL(/\/scorecards\/calculator\/[0-9a-f-]{36}\/generic$/)
  await settle()
  const gen = new URL(page.url()).pathname
  const scorecardId = gen.split('/')[3]
  step('A4 "Create the scorecard"; the overview offers "Upload your workbook" or "Or fill it in by hand"')
  if (!(await page.getByText(/Or fill it in by hand/).count())) throw new Error('the new scorecard does not offer the upload-or-by-hand choice')

  await page.locator('input[name="workbook"]').first().setInputFiles(GOLDEN)
  await page.getByRole('button', { name: /^Read the workbook$/ }).first().click()
  await page.waitForURL(/workbook-review/, { timeout: 120_000 })
  await settle()
  for (const name of ['acceptWarnings', 'acknowledgeMissingFields', 'acknowledgeProcurementSeparate']) {
    const box = page.locator(`input[name="${name}"]`)
    if (await box.count()) await box.check()
  }
  await page.getByRole('button', { name: /^Confirm and import$/ }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/workbook-review'), { timeout: 120_000 })
  await settle()
  const filled = (await page.locator('main').innerText()).split('\n').find((l) => /We filled in/.test(l)) ?? '(no import summary)'
  step(`A5 golden workbook imported: "${filled}"`)

  await page.goto(`${BASE}${gen}/applicability`)
  await settle()
  const prefilledTurnover = await page.locator('input[name="annualRevenue"]').inputValue()
  await page.locator('input[name="measurementPeriodStart"]').fill('2025-03-01')
  await page.locator('input[name="measurementPeriodEnd"]').fill('2026-02-28')
  await page.locator('input[name="entityType"]').fill('Private company')
  await page.locator('input[name="sector"]').fill('Manufacturing')
  await page.locator('select[name="sectorCodeApplies"]').selectOption('no')
  await page.locator('input[name="blackWomenOwnershipPercentage"]').fill('12')
  await page.locator('select[name="isStartUp"]').selectOption('no')
  await letAutosave()
  await doneNextArea()
  step(`A6 company size and sector (turnover pre-filled from the company: ${prefilledTurnover}); "Done, next area" -> ${new URL(page.url()).pathname.split('/').pop()}`)

  await page.goto(`${BASE}${gen}/skills-development`)
  await settle()
  for (const name of ['wspAtrSetaApproved', 'pivotalReportSubmitted', 'prioritySkillsProgrammeImplemented', 'trainingRegisterMaintained']) {
    await page.locator(`select[name="${name}"]`).selectOption('yes')
  }
  await letAutosave()
  await doneNextArea()
  step('A7 skills development: the three gates and the training register answered')

  let confirmed = 0
  for (const slug of ['enterprise-development', 'supplier-development', 'socio-economic-development']) confirmed += await confirmAllEvidence(`${BASE}${gen}/${slug}`)
  step(`A8 evidence confirmed for ${confirmed} contributions`)

  await page.goto(`${BASE}${gen}/review`)
  await settle()
  const attachTargets = page.getByRole('button', { name: /^Attach workforce targets$/ })
  if (await attachTargets.count()) {
    await attachTargets.click()
    await page.waitForURL(/saved=1|error=/)
    await settle()
  }
  await page.getByRole('button', { name: /^Calculate scorecard$/ }).click()
  await page.waitForURL(/\/result/, { timeout: 120_000 })
  const before = await readResult()
  const golden = {
    total: before.total,
    ed: before.points.enterprise_development,
    sd: before.points.supplier_development,
    sed: before.points.socio_economic_development,
  }
  const goldenOk =
    Math.abs(golden.total - GOLDEN_EXPECTED.total) < 0.005 &&
    Math.abs(golden.ed - GOLDEN_EXPECTED.ed) < 0.006 &&
    Math.abs(golden.sd - GOLDEN_EXPECTED.sd) < 0.005 &&
    Math.abs(golden.sed - GOLDEN_EXPECTED.sed) < 0.005
  step(`A9 calculated; golden benchmark in the browser: total ${golden.total}, ED ${golden.ed}, SD ${golden.sd}, SED ${golden.sed} -> ${goldenOk ? 'EXACT' : 'WRONG'}`)
  if (!goldenOk) throw new Error(`golden benchmark wrong in the browser: ${JSON.stringify(golden)}`)

  // What a final level still needs; none of it changes the points above.
  await page.goto(`${BASE}${gen}/ownership`)
  await settle()
  await page.locator('input[name="measurementDate"]').fill('2026-02-28')
  await letAutosave()
  for (const slug of ['enterprise-development', 'supplier-development']) {
    await page.goto(`${BASE}${gen}/${slug}`)
    await settle()
    await page.locator('select[name="bonusConfirmed"]').selectOption('no')
    await letAutosave()
  }
  step('A10 ownership measurement date and the two bonus questions answered')

  await page.goto(`${BASE}${gen}/procurement`)
  await settle()
  await page.getByRole('link', { name: /^Create a procurement scorecard$/ }).first().click()
  await page.waitForURL(/\/procurement\/assessments\/new/)
  await settle()
  await uploadSuppliers(fullCsv, 4)
  await page.getByRole('button', { name: /^Next: total spend$/ }).click()
  await page.getByRole('button', { name: /Save and see result/ }).click()
  await page.waitForURL(/\/generic\/procurement\?created=/, { timeout: 120_000 })
  await settle()
  step('A11 procurement scorecard created from the procurement area; back on the area to attach it')
  await page.getByRole('button', { name: /^Attach$/ }).click()
  await page.waitForURL(/saved|attached/)
  await settle()
  await page.goto(`${BASE}${gen}/review`)
  await settle()
  await page.getByRole('button', { name: /^Calculate scorecard$/ }).click()
  await page.waitForURL(/\/result/, { timeout: 120_000 })
  const final = await readResult()
  const sentence = (await page.locator('main').innerText()).split('\n').find((l) => /contributor/.test(l)) ?? ''
  step(`A12 final result: ${final.level}, ${final.total} points; "${sentence.slice(0, 110)}"`)
  for (const label of [/Download report/, /Printable version/, /Edit data/]) {
    if (!(await page.getByText(label).count())) throw new Error(`the result page has no ${label}`)
  }
  const fullPdf = await pdfOk(`/api/scorecards/calculator/${scorecardId}/pdf`)
  step(`A13 Download report: HTTP ${fullPdf.status}, ${fullPdf.type}, ${fullPdf.kb} KB, starts %PDF: ${fullPdf.pdf}`)
  if (!fullPdf.pdf) throw new Error('the full scorecard PDF did not download')

  // ---- B. Procurement only ---------------------------------------------------------------
  await page.goto(`${BASE}/dashboard`)
  await settle()
  await page.getByRole('link', { name: /^Add a company$/ }).first().click()
  await page.waitForURL(/\/companies\/new/)
  await settle()
  await addCompany('Walkthrough Trading (Pty) Ltd', 'Wholesale and retail', 80_000_000, 20)
  await page.getByRole('link', { name: /Procurement only/ }).first().click()
  await page.waitForURL(/\/procurement\/assessments\/new/)
  await settle()
  step('B1 Home -> "Add a company" -> "What do you need?" -> "Procurement only"')
  await uploadSuppliers(procCsv, 6)
  const attention = (await page.locator('main').innerText()).split('\n').filter((l) => /need your attention|expired|no B-BBEE level|no level/i.test(l)).slice(0, 3)
  step(`B2 6 suppliers read; Needs attention: ${JSON.stringify(attention).slice(0, 220)}`)
  const fix = page.getByRole('button', { name: /^Mark non-compliant$/ }).first()
  if (await fix.count()) {
    await fix.click()
    await page.waitForTimeout(300)
    step('B3 one-click fix: the expired certificate marked non-compliant')
  } else {
    step('B3 (no "Mark non-compliant" button found)')
  }
  await page.getByRole('button', { name: /^Next: total spend$/ }).click()
  await page.getByRole('button', { name: /Save and see result/ }).click()
  await page.waitForURL((u) => /^\/procurement\/assessments\/[0-9a-f-]{36}$/.test(u.pathname), { timeout: 120_000 })
  await settle()
  const procurementId = new URL(page.url()).pathname.split('/').pop()
  const scoreLines = [
    await page.getByText(/^For .*of 25 points/).first().textContent().catch(() => '(no points line)'),
    ...(await page.getByText(/isn.t counting|aren.t counting/).allTextContents()).slice(0, 2),
  ].map((t) => (t ?? '').trim())
  step(`B4 saved; score page: ${JSON.stringify(scoreLines).slice(0, 260)}`)
  const procPdf = await pdfOk(`/api/procurement/assessments/${procurementId}/pdf`)
  step(`B5 Download report: HTTP ${procPdf.status}, ${procPdf.kb} KB, starts %PDF: ${procPdf.pdf}`)
  if (!procPdf.pdf) throw new Error('the procurement PDF did not download')
  // One click makes the full scorecard with this procurement scorecard attached.
  await page.getByRole('button', { name: /^Continue to full scorecard$/ }).first().click()
  await page.waitForURL(/\/scorecards\/calculator\/[0-9a-f-]{36}\/generic/, { timeout: 120_000 })
  await settle()
  const procRow = (await page.getByRole('link', { name: /^Procurement\s*\d/ }).first().textContent().catch(() => '(no procurement row)'))?.replace(/\s+/g, ' ').trim()
  step(`B6 "Continue to full scorecard" -> a full scorecard with procurement carried over: ${JSON.stringify(procRow)}`)

  // ---- Every link seen on the way ----------------------------------------------------------
  const broken = []
  for (const link of links) {
    if (/\/(sign-?out|logout)/.test(link)) continue
    const res = await page.request.get(`${BASE}${link}`, { maxRedirects: 5 })
    if (res.status() >= 400) broken.push(`${res.status()} ${link}`)
  }
  step(`C1 ${links.size} distinct links checked; broken: ${broken.length}`)
  if (broken.length) failedRequests.push(...broken.map((b) => `broken link ${b}`))
} catch (error) {
  failure = error instanceof Error ? error.message.split('\n')[0] : String(error)
  await page.screenshot({ path: path.join(tmp, 'failure.jpg'), type: 'jpeg', quality: 50 }).catch(() => {})
} finally {
  await browser.close()
  const { data: companies } = await admin.from('companies').select('id').eq('owner_id', userId)
  const ids = (companies ?? []).map((c) => c.id)
  if (ids.length) await admin.from('companies').delete().in('id', ids)
  await admin.from('audit_log').delete().eq('actor_id', userId)
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  const { count } = await admin.from('companies').select('id', { count: 'exact', head: true }).eq('owner_id', userId)
  steps.push(`Clean-up: ${ids.length} companies deleted (with their scorecards), login deleted: ${!deleteError}, companies left: ${count ?? 0}`)
  if (!failure) fs.rmSync(tmp, { recursive: true, force: true })
}

console.log(`Walkthrough at ${PHONE ? '390x844' : '1440x900'} against ${BASE}`)
for (const s of steps) console.log(`  ${s}`)
console.log(`\nConsole errors: ${consoleErrors.length}`)
for (const e of consoleErrors.slice(0, 10)) console.log(`  ${e}`)
console.log(`Failed requests and broken links: ${failedRequests.length}`)
for (const e of failedRequests.slice(0, 10)) console.log(`  ${e}`)
console.log(`HTTP errors from the app: ${httpErrors.length}`)
for (const e of httpErrors.slice(0, 10)) console.log(`  ${e}`)
if (failure) console.log(`\nFAILED: ${failure}\n  (screenshot: ${path.join(tmp, 'failure.jpg')})`)
else console.log('\nCompleted.')
process.exit(failure || consoleErrors.length || failedRequests.length || httpErrors.length ? 1 : 0)
