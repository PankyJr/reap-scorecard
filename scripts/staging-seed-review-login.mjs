/**
 * A review login on STAGING with two sample companies, created through the
 * real screens:
 *
 *   1. "Golden Sample Manufacturing (Pty) Ltd": the golden workbook imported,
 *      every element confirmed, workforce targets attached, a procurement
 *      scorecard attached and calculated, so the owner sees a final level.
 *   2. "Halfway Logistics (Pty) Ltd": the same workbook imported and the
 *      company size set, nothing else, so the in-progress screens show.
 *
 * The account is pre-confirmed through the admin API (no e-mail is sent).
 * Its password is written to tmp/staging-secrets/review-login.json, which is
 * git-ignored; it is never printed. Running the script again reuses the
 * account and skips a company that already exists.
 *
 * Usage (app running on VERIFY_BASE_URL, default http://localhost:3000):
 *
 *   set -a; . ./.env.local; set +a
 *   PLAYWRIGHT_DIR=<folder that contains node_modules/playwright> \
 *     node scripts/staging-seed-review-login.mjs
 *
 * Refuses to run against anything but the staging project.
 */
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const STAGING_REF = 'jzvqyryblsfxlinvoiuf'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const BASE = (process.env.VERIFY_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.REVIEW_EMAIL ?? 'panky.review@reap-staging.example'
const SECRET_FILE = path.resolve('tmp/staging-secrets/review-login.json')
const GOLDEN = path.resolve('test-fixtures/golden/golden-populated-workbook.xlsx')

const GOLDEN_COMPANY = 'Golden Sample Manufacturing (Pty) Ltd'
const HALFWAY_COMPANY = 'Halfway Logistics (Pty) Ltd'

if (!SUPABASE_URL.includes(STAGING_REF)) {
  console.error('Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not the staging project.')
  process.exit(2)
}
if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required to create the pre-confirmed account.')
  process.exit(2)
}

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    const dir = process.env.PLAYWRIGHT_DIR
    if (!dir) throw new Error('Playwright not found. Set PLAYWRIGHT_DIR to a folder whose node_modules contains playwright.')
    return createRequire(path.join(dir, 'noop.js'))('playwright')
  }
}

const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

async function findUser(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

async function ensureAccount() {
  let saved = null
  if (fs.existsSync(SECRET_FILE)) saved = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf8'))
  const password = saved?.email === EMAIL && saved?.password ? saved.password : `Review-${crypto.randomBytes(9).toString('base64url')}-7a`
  const existing = await findUser(EMAIL)
  let id
  if (existing) {
    id = existing.id
    if (!saved || saved.email !== EMAIL) {
      const { error } = await service.auth.admin.updateUserById(id, { password, email_confirm: true })
      if (error) throw error
    }
  } else {
    const { data, error } = await service.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Panky (review)' },
    })
    if (error) throw error
    id = data.user.id
  }
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true })
  fs.writeFileSync(SECRET_FILE, JSON.stringify({ email: EMAIL, password, userId: id, base: BASE }, null, 2), { mode: 0o600 })
  return { id, email: EMAIL, password }
}

async function companyExists(ownerId, name) {
  const { data, error } = await service.from('companies').select('id').eq('owner_id', ownerId).eq('name', name).limit(1)
  if (error) throw error
  return data.length > 0
}

/** The generic-scorecard URL of the newest full scorecard for one of the owner's companies. */
async function scorecardUrlFor(ownerId, name) {
  const { data: companies, error } = await service.from('companies').select('id').eq('owner_id', ownerId).eq('name', name).limit(1)
  if (error) throw error
  const { data: rows, error: e2 } = await service
    .from('scorecard_assessments')
    .select('id')
    .eq('company_id', companies[0].id)
    .order('created_at', { ascending: false })
    .limit(1)
  if (e2) throw e2
  return `${BASE}/scorecards/calculator/${rows[0].id}/generic`
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
  await page.waitForTimeout(300)
}

const text = (page) => page.locator('main').innerText()
const toNumber = (s) => Number(String(s).replace(/[^0-9.\-]/g, ''))

async function signIn(page, who) {
  await page.goto(`${BASE}/login`)
  await page.locator('#email').fill(who.email)
  await page.locator('#password').fill(who.password)
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 }),
    page.getByRole('button', { name: /^sign in$/i }).click(),
  ])
  await settle(page)
}

/** Add a company from Start new and land on the new full scorecard's upload step. */
async function startFullScorecard(page, company, industry) {
  await page.goto(`${BASE}/start`)
  await page.getByRole('link', { name: /full b-bbee scorecard/i }).first().click()
  await page.waitForURL(/type=full/)
  await page.getByRole('link', { name: /add (the|a new) company|add a company/i }).first().click()
  await page.waitForURL(/\/companies\/new/)
  await page.locator('input[name="name"]').fill(company)
  await page.locator('input[name="industry"]').fill(industry)
  await page.getByRole('button', { name: /^save company$/i }).click()
  await page.waitForURL(/\/scorecards\/new\?companyId=/, { timeout: 60_000 })
  await page.locator('input[name="name"]').fill('FY2026 scorecard')
  await page.locator('input[name="measurementYear"]').fill('2026')
  await page.getByRole('button', { name: /create the scorecard|create and upload workbook/i }).click()
  await page.waitForURL(/\/scorecards\/calculator\/[0-9a-f-]{36}\/generic/, { timeout: 60_000 })
  const scorecardId = page.url().match(/calculator\/([0-9a-f-]{36})/)[1]
  return `${BASE}/scorecards/calculator/${scorecardId}/generic`
}

async function importGoldenWorkbook(page) {
  await page.locator('input[name="workbook"]').first().setInputFiles(GOLDEN)
  await page.getByRole('button', { name: /^read the workbook$/i }).first().click()
  await page.waitForURL(/workbook-review/, { timeout: 120_000 })
  for (const name of ['acceptWarnings', 'acknowledgeMissingFields', 'acknowledgeProcurementSeparate']) {
    const box = page.locator(`input[name="${name}"]`)
    if (await box.count()) await box.check()
  }
  await page.getByRole('button', { name: /confirm and import/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/workbook-review'), { timeout: 120_000 })
  if (/error=/.test(page.url())) throw new Error(`workbook import failed: ${decodeURIComponent(page.url().split('error=')[1])}`)
}

async function saveSizeAndSector(page, gen, revenue) {
  await page.goto(`${gen}/applicability`)
  await page.locator('input[name="measurementPeriodStart"]').fill('2025-03-01')
  await page.locator('input[name="measurementPeriodEnd"]').fill('2026-02-28')
  await page.locator('input[name="annualRevenue"]').fill(String(revenue))
  await page.locator('input[name="entityType"]').fill('Private company')
  await page.locator('input[name="sector"]').fill('Manufacturing')
  await page.locator('select[name="sectorCodeApplies"]').selectOption('no')
  await page.locator('input[name="blackOwnershipPercentage"]').fill('30')
  await page.locator('input[name="blackWomenOwnershipPercentage"]').fill('12')
  await page.locator('select[name="isStartUp"]').selectOption('no')
  await page.getByRole('button', { name: /save and continue/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/applicability') || u.search.includes('saved'), { timeout: 60_000 })
}

/**
 * Confirm every imported contribution on one element page. The page is loaded
 * fresh before each confirmation: checking for the next form while the last
 * save is still reloading the page can find none and stop one record early.
 */
async function confirmAllEvidence(page, url, slug) {
  let confirmed = 0
  for (let n = 1; n <= 20; n++) {
    await page.goto(url)
    await settle(page)
    const form = page.locator('form', { has: page.getByRole('button', { name: /confirm supporting evidence/i }) }).first()
    if (!(await form.count())) break
    await form.locator('input[name="evidenceReference"]').fill(`SAMPLE-${slug.slice(0, 3).toUpperCase()}-${n}`)
    await form.locator('input[name="evidenceReviewed"]').check()
    await form.getByRole('button', { name: /confirm supporting evidence/i }).click()
    await page.waitForURL(/saved|confirmed/, { timeout: 60_000 }).catch(() => {})
    await settle(page)
    confirmed += 1
  }
  return confirmed
}

async function calculate(page, gen) {
  await page.goto(`${gen}/review`)
  await page.getByRole('button', { name: /^calculate scorecard$/i }).click()
  await page.waitForURL(/\/result/, { timeout: 120_000 })
  await settle(page)
}

async function seedGolden(page) {
  const gen = await startFullScorecard(page, GOLDEN_COMPANY, 'Manufacturing')
  await importGoldenWorkbook(page)
  await saveSizeAndSector(page, gen, 250_000_000)

  await page.goto(`${gen}/skills-development`)
  for (const name of ['wspAtrSetaApproved', 'pivotalReportSubmitted', 'prioritySkillsProgrammeImplemented', 'trainingRegisterMaintained']) {
    await page.locator(`select[name="${name}"]`).selectOption('yes')
  }
  await page.getByRole('button', { name: /save and continue/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/skills-development') || u.search.includes('saved'), { timeout: 60_000 })

  for (const slug of ['enterprise-development', 'supplier-development', 'socio-economic-development']) {
    await confirmAllEvidence(page, `${gen}/${slug}`, slug)
  }

  await page.goto(`${gen}/review`)
  const attach = page.getByRole('button', { name: /attach workforce targets/i })
  if (await attach.count()) {
    await attach.click()
    await page.waitForURL(/saved=1|error=/, { timeout: 60_000 })
  }
  await calculate(page, gen)

  // The golden benchmark, read from the result page before procurement is attached.
  const body = await text(page)
  const total = toNumber(body.match(/([\d.]+) points/)?.[1])
  const rows = await page.locator('table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())))
  const points = Object.fromEntries(rows.map((r) => [r[0].toLowerCase(), toNumber((r[1] ?? '').split('/')[0])]))
  const golden = { total, ed: points['enterprise development'], sd: points['supplier development'], sed: points['socio-economic development'] }

  // What a final level still needs; none of it changes the points above.
  await page.goto(`${gen}/ownership`)
  await page.locator('input[name="measurementDate"]').fill('2026-02-28')
  await page.getByRole('button', { name: /save and continue/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/ownership') || u.search.includes('saved'), { timeout: 60_000 })
  for (const slug of ['enterprise-development', 'supplier-development']) {
    await page.goto(`${gen}/${slug}`)
    const form = page.locator('form', { has: page.getByRole('button', { name: /save bonus flags/i }) })
    await form.locator('select[name="bonusConfirmed"]').selectOption('no')
    await form.getByRole('button', { name: /save bonus flags/i }).click()
    await page.waitForURL(/saved|bonus/, { timeout: 60_000 }).catch(() => {})
    await settle(page)
  }

  await page.goto(`${gen}/procurement`)
  await page.getByRole('link', { name: /create (a|one|new)|new procurement/i }).first().click()
  await page.waitForURL(/\/procurement\/assessments\/new/)
  await page.locator('input[name="assessment_year"]').fill('2026')
  await page.getByRole('button', { name: /next: suppliers/i }).click()
  const paste = page.getByLabel(/bulk supplier paste/i)
  if (!(await paste.isVisible())) await page.getByRole('button', { name: /paste/i }).first().click()
  await paste.fill(
    [
      'Sample Steel Supplies\t450000\tGeneric\t1\tyes\tno\tno',
      'Sample Logistics\t180000\tQSE\t2\tyes\tyes\tno',
      'Sample Cleaning Services\t60000\tEME\t1\tyes\tyes\tyes',
      'Sample Office Supplies\t90000\tGeneric\t4\tno\tno\tno',
    ].join('\n'),
  )
  await page.getByRole('button', { name: /import pasted rows/i }).click()
  const useList = page.getByRole('button', { name: /use the total of the supplier list/i })
  if (await useList.count()) await useList.last().click()
  await page.waitForFunction(() => !/score appears once the total spend is set/i.test(document.body.innerText), null, { timeout: 15_000 }).catch(() => {})
  await page.getByRole('button', { name: /save and see result/i }).click()
  await page.waitForURL(/\/generic\/procurement\?created=/, { timeout: 90_000 })
  await page.getByRole('button', { name: /^attach$/i }).click()
  await page.waitForURL(/saved|attached/, { timeout: 60_000 })
  await calculate(page, gen)
  const final = await text(page)
  const level = final.match(/B-BBEE level\s*(?:\?\s*)?(Level [1-8]|Non-compliant)\b/)?.[1] ?? null
  return { golden, level, url: `${gen}/result` }
}

/** Element points as the result page shows them. */
async function readElementPoints(page, gen) {
  await page.goto(`${gen}/result`)
  await settle(page)
  const body = await text(page)
  const total = toNumber(body.match(/([\d.]+) points/)?.[1])
  const rows = await page.locator('table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())))
  const points = Object.fromEntries(rows.map((r) => [r[0].toLowerCase(), toNumber((r[1] ?? '').split('/')[0])]))
  const level = body.match(/B-BBEE level\s*(?:\?\s*)?(Level [1-8]|Non-compliant)\b/)?.[1] ?? null
  return { total, level, points }
}

/** Re-runs on an existing golden company: confirm anything left unconfirmed, recalculate, report. */
async function repairGolden(page, gen) {
  let confirmed = 0
  for (const slug of ['enterprise-development', 'supplier-development', 'socio-economic-development']) {
    confirmed += await confirmAllEvidence(page, `${gen}/${slug}`, slug)
  }
  if (confirmed > 0) await calculate(page, gen)
  const { total, level, points } = await readElementPoints(page, gen)
  return {
    confirmedNow: confirmed,
    level,
    total,
    ed: points['enterprise development'],
    sd: points['supplier development'],
    sed: points['socio-economic development'],
    procurement: points['preferential procurement'] ?? points['procurement'],
    url: `${gen}/result`,
  }
}

async function seedHalfway(page) {
  const gen = await startFullScorecard(page, HALFWAY_COMPANY, 'Transport and logistics')
  await importGoldenWorkbook(page)
  await saveSizeAndSector(page, gen, 30_000_000)
  return { url: `${gen}/overview` }
}

// ---------------------------------------------------------------------------

const account = await ensureAccount()
const { chromium } = await loadPlaywright()
// PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome instead of a downloaded browser.
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(30_000)
const result = { email: account.email, base: BASE, passwordFile: path.relative(process.cwd(), SECRET_FILE) }

try {
  await signIn(page, account)
  result.signIn = 'ok'
  if (await companyExists(account.id, GOLDEN_COMPANY)) result.golden = await repairGolden(page, await scorecardUrlFor(account.id, GOLDEN_COMPANY))
  else result.golden = await seedGolden(page)
  if (await companyExists(account.id, HALFWAY_COMPANY)) result.halfway = 'already there'
  else result.halfway = await seedHalfway(page)
} catch (e) {
  result.error = e.message.split('\n')[0]
  await page.screenshot({ path: path.resolve('tmp/staging-secrets/seed-failure.png'), fullPage: true }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
console.log(JSON.stringify(result, null, 2))
