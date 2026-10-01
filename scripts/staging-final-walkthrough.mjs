/**
 * Final end-to-end walkthrough, driven in a real browser as a real user.
 *
 * Runs the whole journey against a locally running app that points at the
 * STAGING Supabase project, and saves a screenshot of every step at 1440x900
 * and at 390px wide:
 *
 *   auth (sign-up + e-mail confirmation link, sign-out, wrong password,
 *   sign-in, forgotten password + reset link, old password refused),
 *   company, workforce targets created by an admin in the app, full
 *   scorecard (upload, check, all seven elements, calculate, final level,
 *   golden benchmark), reopen in a new session and edit, report and PDF,
 *   procurement create / edit / report / PDF / delete, a refused non-workbook
 *   upload, admin console and roles, another account kept out, the phone menu,
 *   console errors, failed requests and broken links.
 *
 * Usage (app running on VERIFY_BASE_URL, default http://localhost:3000):
 *
 *   export NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=…
 *   export SUPABASE_ACCESS_TOKEN=…   # optional: reads the e-mail link from the database
 *   node scripts/staging-final-walkthrough.mjs
 *
 * The confirmation and reset links are rebuilt from the database exactly as
 * Supabase writes them into the e-mail ({{ .ConfirmationURL }}), so the real
 * PKCE link is followed in the same browser that asked for it. Without
 * SUPABASE_ACCESS_TOKEN the script confirms through the admin API instead and
 * says so in the report.
 *
 * Output: artifacts/final-walkthrough/<run>/ (git-ignored): one PNG per step
 * and size, the exported PDFs, and report.json. Every record it creates is
 * tagged with the run id; scripts/staging-cleanup-test-data.ts removes them.
 * Refuses to run against anything but the staging project.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const STAGING_REF = 'jzvqyryblsfxlinvoiuf'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? ''
// WALK_SKIP_EMAIL=1 creates the first account through the admin API instead of
// the sign-up form. Staging sends at most two auth e-mails an hour, so use it
// for repeat runs; the e-mail steps need a full run.
const SKIP_EMAIL = process.env.WALK_SKIP_EMAIL === '1'
const BASE = (process.env.VERIFY_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const GOLDEN = path.resolve('test-fixtures/golden/golden-populated-workbook.xlsx')

if (!SUPABASE_URL.includes(STAGING_REF)) {
  console.error('Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not the staging project.')
  process.exit(2)
}
if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required (to create the admin account and to clean up).')
  process.exit(2)
}

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    const require = createRequire('/opt/node22/lib/node_modules/')
    return require('playwright')
  }
}
const { chromium } = await loadPlaywright()

const RUN = `walk-${Date.now()}`
const OUT = path.resolve('artifacts/final-walkthrough', RUN)
fs.mkdirSync(OUT, { recursive: true })

const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const password = () => `Walk-${Math.random().toString(36).slice(2, 10)}-A9!`
const people = {
  owner: { email: `${RUN}-owner@reap-staging.example`, password: password(), name: 'Lerato Walkthrough' },
  other: { email: `${RUN}-other@reap-staging.example`, password: password(), name: 'Other Account' },
  admin: { email: `${RUN}-admin@reap-staging.example`, password: password(), name: 'REAP Staff Walkthrough' },
}
const COMPANY = `Walkthrough Manufacturing ${RUN.slice(-6)} (Pty) Ltd`

const report = {
  run: RUN,
  base: BASE,
  startedAt: new Date().toISOString(),
  steps: [],
  checks: [],
  notes: [],
  errors: [],
  brokenLinks: [],
  golden: null,
  emails: null,
  ids: {},
}
let stepNo = 0

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function check(name, ok, detail) {
  report.checks.push({ name, ok: Boolean(ok), detail })
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` (${detail})` : ''}`)
  return Boolean(ok)
}

const expected = [] // URL substrings whose 4xx is the point of the step
function watch(page, label) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text()
    // A 403/404 that the step provoked on purpose shows up here too.
    if (/status of 40[34]/.test(text) && expected.some((e) => page.url().includes(e))) return
    report.errors.push({ who: label, kind: 'console', url: page.url().replace(BASE, ''), text: text.slice(0, 300) })
  })
  page.on('pageerror', (e) => report.errors.push({ who: label, kind: 'pageerror', url: page.url().replace(BASE, ''), text: e.message.slice(0, 300) }))
  page.on('response', (r) => {
    const url = r.url()
    if (r.status() < 400 || !url.startsWith(BASE)) return
    if (expected.some((e) => url.includes(e))) return
    report.errors.push({ who: label, kind: `http ${r.status()}`, url: url.replace(BASE, '') })
  })
  page.on('requestfailed', (r) => {
    const failure = r.failure()?.errorText ?? ''
    // Navigations and RSC prefetches cancelled by the next click are normal.
    if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(failure)) return
    report.errors.push({ who: label, kind: 'requestfailed', url: r.url().replace(BASE, ''), text: failure })
  })
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
  await page.waitForFunction(() => !document.querySelector('.animate-pulse, [aria-busy="true"]'), null, { timeout: 60_000 }).catch(() => {})
  await page.waitForTimeout(300)
}

const links = new Map() // href -> first page seen on
async function collectLinks(page) {
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
  for (const h of hrefs) {
    if (!h || !h.startsWith('/') || h.startsWith('//')) continue
    const clean = h.split('#')[0]
    if (!clean || clean.startsWith('/api/') || clean.includes('signout')) continue
    if (!links.has(clean)) links.set(clean, page.url().replace(BASE, ''))
  }
}

/** Screenshot the current state at 1440 and at 390, then go back to 1440. */
async function snap(page, name) {
  stepNo += 1
  const base = `${String(stepNo).padStart(2, '0')}-${name}`
  await settle(page)
  await collectLinks(page)
  const size = page.viewportSize()
  await page.screenshot({ path: path.join(OUT, `${base}-1440.png`), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  // A control whose spoken name hides the words on screen cannot be pressed by voice (WCAG 2.5.3).
  const misnamed = await page.$$eval('button[aria-label], a[aria-label]', (els) =>
    els
      .map((el) => {
        // Words a screen reader also skips (aria-hidden) are decoration, not the label.
        const copy = el.cloneNode(true)
        copy.querySelectorAll('[aria-hidden="true"], .sr-only').forEach((n) => n.remove())
        document.body.appendChild(copy)
        const shown = copy.innerText.replace(/\s+/g, ' ').trim()
        copy.remove()
        return [el.getAttribute('aria-label') ?? '', el.checkVisibility() ? shown : '']
      })
      .filter(([label, shown]) => shown && !label.toLowerCase().includes(shown.toLowerCase()))
      .map(([label, shown]) => `"${shown}" is named "${label}"`),
  )
  for (const m of new Set(misnamed)) report.errors.push({ kind: 'a11y-name', url: page.url().replace(BASE, ''), text: m })
  await page.screenshot({ path: path.join(OUT, `${base}-390.png`), fullPage: true })
  await page.setViewportSize(size ?? { width: 1440, height: 900 })
  await page.waitForTimeout(200)
  if (overflow > 1) report.errors.push({ kind: 'layout', url: page.url().replace(BASE, ''), text: `${overflow}px wider than a 390px screen` })
  report.steps.push({ step: base, url: page.url().replace(BASE, '') })
}

const openPages = new Set()
async function step(name, fn) {
  console.log(`\n# ${name}`)
  try {
    await fn()
  } catch (e) {
    check(`${name}: completed without error`, false, e.message.split('\n')[0].slice(0, 240))
    // Keep a picture of where it stopped.
    let i = 0
    for (const p of openPages) {
      if (p.isClosed()) continue
      const file = `FAIL-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${i++}.png`
      await p.screenshot({ path: path.join(OUT, file), fullPage: true }).catch(() => {})
    }
  }
}

async function newPage(browser, label, width = 1440, height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  watch(page, label)
  openPages.add(page)
  return { context, page }
}

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

async function signOut(page) {
  await page.getByRole('button', { name: /^sign out$/i }).first().click()
  await page.waitForURL(/\/login/, { timeout: 60_000 })
}

async function managementSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${STAGING_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body?.message ?? `SQL failed (${res.status})`)
  return body
}

/** The link Supabase puts in the e-mail: /auth/v1/verify?token=…&type=…&redirect_to=… */
async function emailLink(email, kind) {
  if (!ACCESS_TOKEN) return null
  const column = kind === 'signup' ? 'confirmation_token' : 'recovery_token'
  const safe = email.replace(/'/g, "''")
  for (let i = 0; i < 20; i++) {
    const rows = await managementSql(`select ${column} as token from auth.users where email = '${safe}'`)
    const token = rows?.[0]?.token
    if (token) {
      const redirect = kind === 'signup' ? `${BASE}/auth/callback` : `${BASE}/auth/callback?next=/reset-password`
      return `${SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(token)}&type=${kind}&redirect_to=${encodeURIComponent(redirect)}`
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return null
}

async function authLog(email, sinceIso) {
  if (!ACCESS_TOKEN) return []
  const params = new URLSearchParams({
    sql: `select timestamp, event_message from logs where event_message like '%${email}%' order by timestamp asc limit 50`,
    iso_timestamp_start: sinceIso,
    iso_timestamp_end: new Date(Date.now() + 60_000).toISOString(),
  })
  const res = await fetch(`https://api.supabase.com/v1/projects/${STAGING_REF}/analytics/endpoints/logs?${params}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  const body = await res.json().catch(() => ({}))
  return (body.result ?? []).map((r) => {
    let m = {}
    try {
      m = JSON.parse(r.event_message)
    } catch {
      return { at: r.timestamp, text: String(r.event_message).slice(0, 160) }
    }
    return { at: r.timestamp, action: m.auth_event?.action, path: m.path, status: m.status, msg: m.msg, mailType: m.mail_type, error: m.error, errorCode: m.error_code }
  })
}

const text = (page) => page.locator('main').innerText()
const toNumber = (s) => Number(String(s).replace(/[^0-9.\-]/g, ''))

// ---------------------------------------------------------------------------
// The journey
// ---------------------------------------------------------------------------

const browser = await chromium.launch(
  fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }
    : {},
)
const startedAt = new Date().toISOString()
const { context: ownerCtx, page } = await newPage(browser, 'owner')

await step('Signed out', async () => {
  await page.goto(`${BASE}/dashboard`)
  await page.waitForURL(/\/login/)
  check('a signed-out visitor is sent to sign in', page.url().includes('/login'))
  await snap(page, 'sign-in-page')
})

async function createConfirmed(who) {
  const { data, error } = await service.auth.admin.createUser({
    email: who.email,
    password: who.password,
    email_confirm: true,
    user_metadata: { full_name: who.name },
  })
  if (error) throw error
  who.id = data.user.id
}

let signupMailSent = false
await step('Sign up', async () => {
  if (SKIP_EMAIL) {
    report.notes.push('WALK_SKIP_EMAIL=1: sign-up, confirmation and password reset e-mails were not exercised.')
    await createConfirmed(people.owner)
    return
  }
  await page.getByRole('button', { name: /^create account$/i }).click()
  await page.locator('#full_name').fill(people.owner.name)
  await page.locator('#email').fill(people.owner.email)
  await page.locator('input[name="password"]').fill(people.owner.password)
  await page.locator('input[name="confirm_password"]').fill(people.owner.password)
  await snap(page, 'sign-up-form')
  await page.locator('form').getByRole('button', { name: /^create account$/i }).click()
  // Wait for the outcome, not for words already on the form ("Confirm password").
  await page.waitForFunction(() => /check your (e-?mail|inbox)|could not send|rate limit|too many|went wrong/i.test(document.body.innerText), null, { timeout: 60_000 })
  const body = await page.locator('body').innerText()
  await snap(page, 'sign-up-outcome')
  if (/check your e-?mail/i.test(body)) {
    signupMailSent = true
    check('sign-up asks the person to check their e-mail', true)
    return
  }
  // Supabase's built-in mailer refuses addresses that cannot receive mail,
  // such as the reserved test domain used here. The page must say so plainly
  // and keep what was typed.
  const outcome = /too many attempts|rate limit/i.test(body) ? 'rate limited (two auth e-mails an hour on the built-in mailer)' : 'address refused'
  check('a refused sign-up gets a plain message, with no service names', /could not send a confirmation e-mail|too many attempts/i.test(body) && !/supabase/i.test(body), outcome)
  check('the name and e-mail are kept for a retry', (await page.locator('#email').inputValue()) === people.owner.email)
  report.notes.push(`Sign-up e-mail not sent: ${outcome} (see emails.log). The account was then created, confirmed, through the admin API.`)
  await createConfirmed(people.owner)
})

await step('Confirm e-mail', async () => {
  const link = signupMailSent ? await emailLink(people.owner.email, 'signup') : null
  if (link) {
    await page.goto(link)
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 })
    check('the confirmation link from the e-mail signs the person in', page.url().includes('/dashboard'))
  } else {
    await signIn(page, people.owner)
  }
  await snap(page, 'home-first-visit')
  const body = await text(page)
  check('home shows one next thing to do: start the first scorecard', /start your first scorecard/i.test(body))
})

await step('Sign out, wrong password, sign in', async () => {
  await signOut(page)
  check('signing out returns to the sign-in page', page.url().includes('/login'))
  await page.locator('#email').fill(people.owner.email)
  await page.locator('#password').fill('not-the-password')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForFunction(() => /invalid|incorrect|wrong/i.test(document.body.innerText), null, { timeout: 30_000 })
  check('a wrong password gets a plain error', true)
  await snap(page, 'sign-in-wrong-password')
  await signIn(page, people.owner)
  check('the right password signs in', page.url().includes('/dashboard'))
})

await step('Forgotten password', async () => {
  if (SKIP_EMAIL) return
  await signOut(page)
  await page.getByRole('button', { name: /forgot password/i }).click()
  await page.locator('#email').fill(people.owner.email)
  await snap(page, 'forgot-password')
  await page.getByRole('button', { name: /send reset link/i }).click()
  await page.waitForFunction(() => /check your (e-?mail|inbox)|could not send|rate limit|too many|went wrong/i.test(document.body.innerText), null, { timeout: 60_000 })
  const body = await page.locator('body').innerText()
  await snap(page, 'forgot-password-outcome')
  check('the reset request gets a plain answer, with no service names', !/supabase/i.test(body) && !/went wrong/i.test(body), body.match(/check your inbox|could not send[^.]*|rate limit[^.]*/i)?.[0])

  const oldPassword = people.owner.password
  people.owner.password = password()
  const link = /check your inbox/i.test(body) ? await emailLink(people.owner.email, 'recovery') : null
  if (link) {
    await page.goto(link)
    await page.waitForURL(/\/reset-password/, { timeout: 60_000 })
  } else {
    // No link could be sent to a test-domain address. The reset page itself
    // works for any signed-in person, so test it from a normal session.
    report.notes.push('Password reset: no e-mail could go to the test-domain address; the reset page was tested from a signed-in session.')
    await signIn(page, { ...people.owner, password: oldPassword })
    await page.goto(`${BASE}/reset-password`)
  }
  await page.locator('input[name="password"]').fill(people.owner.password)
  await page.locator('input[name="confirm_password"]').fill(people.owner.password)
  await snap(page, 'reset-password')
  await page.getByRole('button', { name: /update password/i }).click()
  await page.getByText(/password updated/i).waitFor({ timeout: 60_000 })
  check('a new password can be chosen', true)
  await snap(page, 'reset-password-done')
  await page.getByRole('link', { name: /go to sign in/i }).click()
  await page.waitForLoadState('networkidle')
  // Still signed in after the change, so sign-in may forward straight to Home.
  if (!page.url().includes('/login')) await signOut(page)
  await page.locator('#email').fill(people.owner.email)
  await page.locator('#password').fill(oldPassword)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForFunction(() => /invalid|incorrect|wrong/i.test(document.body.innerText), null, { timeout: 30_000 })
  check('the old password no longer works', page.url().includes('/login'))
  await signIn(page, people.owner)
  check('the new password works', page.url().includes('/dashboard'))
})

report.emails = { log: await authLog(people.owner.email, startedAt).catch((e) => [{ error: e.message }]) }

// Admin account (staff role) and the second, unrelated account.
await step('Prepare the staff and second accounts', async () => {
  for (const who of [people.admin, people.other]) {
    const { data, error } = await service.auth.admin.createUser({
      email: who.email,
      password: who.password,
      email_confirm: true,
      user_metadata: { full_name: who.name },
    })
    if (error) throw error
    who.id = data.user.id
  }
  await service.from('reap_internal_admins').upsert({ user_id: people.admin.id })
  check('staff account created and given the REAP staff role', true)
})

const { context: adminCtx, page: admin } = await newPage(browser, 'admin')

await step('Staff: workforce (EAP) targets created in the app', async () => {
  await signIn(admin, people.admin)
  await admin.goto(`${BASE}/settings/eap-targets`)
  await snap(admin, 'staff-workforce-targets')
  await admin.locator('input[name="name"]').fill(`Walkthrough workforce targets ${RUN}`)
  await admin.locator('input[name="year"]').fill('2026')
  await admin.locator('input[name="geography"]').fill(`Walkthrough ${RUN}`)
  await admin.locator('input[name="sourceReference"]').fill('Fictional test data matching the golden workbook')
  await Promise.all([admin.waitForURL(/eap-targets\/[0-9a-f-]{36}/), admin.getByRole('button', { name: /create and enter the shares/i }).click()])
  report.ids.eapTargetSetId = admin.url().split('/').pop().split('?')[0]
  const shares = { african_male: 43.5, coloured_male: 4.6, indian_male: 1.7, african_female: 37.5, coloured_female: 4.2, indian_female: 1.0 }
  for (const [key, value] of Object.entries(shares)) {
    await admin.locator(`input[name$="${key}"], input[name*="${key}"]`).first().fill(String(value))
  }
  await snap(admin, 'staff-workforce-targets-shares')
  await admin.getByRole('button', { name: /^save shares$/i }).click()
  await admin.waitForURL(/saved=1/, { timeout: 60_000 })
  await settle(admin)
  await admin.getByRole('button', { name: /put this set in use/i }).click()
  await admin.waitForURL(/activated=1/, { timeout: 60_000 })
  await snap(admin, 'staff-workforce-targets-active')
  check('a staff member can create and activate workforce targets', /in use|active/i.test(await text(admin)))
})

await step('Company: add one from Start new', async () => {
  await page.goto(`${BASE}/start`)
  await snap(page, 'start-new')
  const body = await text(page)
  check('Start new offers both: full scorecard and procurement only', /full b-bbee scorecard/i.test(body) && /procurement only/i.test(body))
  await page.getByRole('link', { name: /full b-bbee scorecard/i }).first().click()
  await page.waitForURL(/type=full/)
  await snap(page, 'start-full-pick-company')
  await page.getByRole('link', { name: /add (the|a new) company|add a company/i }).first().click()
  await page.waitForURL(/\/companies\/new/)
  await page.locator('input[name="name"]').fill(COMPANY)
  await page.locator('input[name="industry"]').fill('Manufacturing')
  await snap(page, 'company-new')
  await page.getByRole('button', { name: /^save company$/i }).click()
  await page.waitForURL(/\/scorecards\/new\?companyId=/, { timeout: 60_000 })
  report.ids.companyId = new URL(page.url()).searchParams.get('companyId')
  check('saving the company carries straight on to the scorecard', Boolean(report.ids.companyId))
})

const gen = () => `${BASE}/scorecards/calculator/${report.ids.scorecardId}/generic`

await step('Full scorecard: create and upload the workbook', async () => {
  await page.locator('input[name="name"]').fill(`FY2026 walkthrough scorecard`)
  await page.locator('input[name="measurementYear"]').fill('2026')
  await snap(page, 'scorecard-new')
  await page.getByRole('button', { name: /create and upload workbook/i }).click()
  await page.waitForURL(/\/scorecards\/calculator\/[0-9a-f-]{36}\/generic/, { timeout: 60_000 })
  report.ids.scorecardId = page.url().match(/calculator\/([0-9a-f-]{36})/)[1]
  await snap(page, 'scorecard-upload')

  // A file that is not a workbook is refused in plain words.
  const fake = path.join(OUT, 'not-a-workbook.xlsx')
  fs.writeFileSync(fake, 'This is a text file with an .xlsx name, not a spreadsheet.\n')
  await page.locator('input[name="workbook"]').first().setInputFiles(fake)
  await page.getByRole('button', { name: /^read the workbook$/i }).first().click()
  await page.waitForURL(/error=/, { timeout: 60_000 })
  const refusal = await text(page)
  check('a file that is not a workbook is refused with a plain message', /not a valid excel workbook|not an excel workbook|not a spreadsheet/i.test(refusal), refusal.match(/[^\n]*(workbook|spreadsheet)[^\n]*/i)?.[0]?.slice(0, 160))
  await snap(page, 'scorecard-upload-refused')

  await page.locator('input[name="workbook"]').first().setInputFiles(GOLDEN)
  await page.getByRole('button', { name: /^read the workbook$/i }).first().click()
  await page.waitForURL(/workbook-review/, { timeout: 120_000 })
  await snap(page, 'workbook-check')
  for (const name of ['acceptWarnings', 'acknowledgeMissingFields', 'acknowledgeProcurementSeparate']) {
    const box = page.locator(`input[name="${name}"]`)
    if (await box.count()) await box.check()
  }
  await page.getByRole('button', { name: /confirm and import/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/workbook-review'), { timeout: 120_000 })
  await snap(page, 'workbook-imported')
  check('the workbook imports', !/error=/.test(page.url()))
})

await step('Element: company size and sector', async () => {
  await page.goto(`${gen()}/applicability`)
  await page.locator('input[name="measurementPeriodStart"]').fill('2025-03-01')
  await page.locator('input[name="measurementPeriodEnd"]').fill('2026-02-28')
  await page.locator('input[name="annualRevenue"]').fill('250000000')
  await page.locator('input[name="entityType"]').fill('Private company')
  await page.locator('input[name="sector"]').fill('Manufacturing')
  await page.locator('select[name="sectorCodeApplies"]').selectOption('no')
  await page.locator('input[name="blackOwnershipPercentage"]').fill('30')
  await page.locator('input[name="blackWomenOwnershipPercentage"]').fill('12')
  await page.locator('select[name="isStartUp"]').selectOption('no')
  await snap(page, 'element-size-and-sector')
  await page.getByRole('button', { name: /save and continue/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/applicability') || u.search.includes('saved'), { timeout: 60_000 })
  check('size and sector saved (Generic, R250m)', !/error=/.test(page.url()))
})

for (const [slug, label] of [
  ['financial', 'financial-figures'],
  ['ownership', 'element-ownership'],
  ['management-control', 'element-management-control'],
]) {
  await step(`Element: ${slug}`, async () => {
    await page.goto(`${gen()}/${slug}`)
    await snap(page, label)
  })
}

await step('Element: skills development (four gates confirmed)', async () => {
  await page.goto(`${gen()}/skills-development`)
  for (const name of ['wspAtrSetaApproved', 'pivotalReportSubmitted', 'prioritySkillsProgrammeImplemented', 'trainingRegisterMaintained']) {
    await page.locator(`select[name="${name}"]`).selectOption('yes')
  }
  await snap(page, 'element-skills-development')
  await page.getByRole('button', { name: /save and continue/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/skills-development') || u.search.includes('saved'), { timeout: 60_000 })
  check('skills gates saved', !/error=/.test(page.url()))
})

await step('Element: procurement (before attaching)', async () => {
  await page.goto(`${gen()}/procurement`)
  await snap(page, 'element-procurement-empty')
})

for (const [slug, label] of [
  ['enterprise-development', 'element-enterprise-development'],
  ['supplier-development', 'element-supplier-development'],
  ['socio-economic-development', 'element-socio-economic-development'],
]) {
  await step(`Element: ${slug} (evidence confirmed)`, async () => {
    await page.goto(`${gen()}/${slug}`)
    await snap(page, `${label}-imported`)
    let confirmed = 0
    for (let guard = 0; guard < 12; guard++) {
      const form = page.locator('form', { has: page.getByRole('button', { name: /confirm supporting evidence/i }) }).first()
      if (!(await form.count())) break
      await form.locator('input[name="evidenceReference"]').fill(`INV-${RUN.slice(-5)}-${slug.slice(0, 3)}-${confirmed + 1}`)
      await form.locator('input[name="evidenceReviewed"]').check()
      await Promise.all([page.waitForLoadState('networkidle'), form.getByRole('button', { name: /confirm supporting evidence/i }).click()])
      await page.waitForURL(/saved|confirmed|#/, { timeout: 60_000 }).catch(() => {})
      await settle(page)
      confirmed += 1
    }
    check(`${slug}: every imported record confirmed`, confirmed > 0, `${confirmed} record(s)`)
    await snap(page, `${label}-confirmed`)
  })
}

await step('Calculate: attach workforce targets, calculate', async () => {
  await page.goto(`${gen()}/review`)
  await snap(page, 'calculate-before')
  const attach = page.getByRole('button', { name: /attach workforce targets/i })
  if (await attach.count()) {
    await attach.click()
    await page.waitForURL(/saved=1|error=/, { timeout: 60_000 })
    check('workforce targets attach', page.url().includes('saved=1'), page.url().includes('error=') ? decodeURIComponent(page.url().split('error=')[1]) : undefined)
  }
  await page.getByRole('button', { name: /^calculate scorecard$/i }).click()
  await page.waitForURL(/\/result/, { timeout: 120_000 })
  await snap(page, 'result-without-procurement')
})

async function readResult() {
  await page.goto(`${gen()}/result`)
  await settle(page)
  const body = await text(page)
  const total = toNumber(body.match(/([\d.]+) points/)?.[1])
  const rows = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())),
  )
  const points = Object.fromEntries(rows.map((r) => [r[0].toLowerCase(), toNumber((r[1] ?? '').split('/')[0])]))
  return { body, total, points }
}

await step('Golden benchmark in the browser', async () => {
  const { total, points } = await readResult()
  report.golden = { total, ed: points['enterprise development'], sd: points['supplier development'], sed: points['socio-economic development'], points }
  check('golden total is 54.69', total === 54.69, `got ${total}`)
  check('golden ED is 3.63', points['enterprise development'] === 3.63, `got ${points['enterprise development']}`)
  check('golden SD is 7.25', points['supplier development'] === 7.25, `got ${points['supplier development']}`)
  check('golden SED is 3.00', points['socio-economic development'] === 3, `got ${points['socio-economic development']}`)
})

await step('Finish what a final level still needs', async () => {
  // The golden check above uses only what the workbook gives. A real user also
  // answers these before a final level; none of them changes the points.
  await page.goto(`${gen()}/ownership`)
  await page.locator('input[name="measurementDate"]').fill('2026-02-28')
  await page.getByRole('button', { name: /save and continue/i }).click()
  await page.waitForURL((u) => !u.pathname.endsWith('/ownership') || u.search.includes('saved'), { timeout: 60_000 })
  for (const slug of ['enterprise-development', 'supplier-development']) {
    await page.goto(`${gen()}/${slug}`)
    const form = page.locator('form', { has: page.getByRole('button', { name: /save bonus flags/i }) })
    await form.locator('select[name="bonusConfirmed"]').selectOption('no')
    await form.getByRole('button', { name: /save bonus flags/i }).click()
    await page.waitForURL(/saved|bonus/, { timeout: 60_000 }).catch(() => {})
    await settle(page)
  }
  await page.goto(`${gen()}/review`)
  const remaining = await text(page)
  await snap(page, 'calculate-only-procurement-left')
  check('only procurement is left before a final level', !/ownership is partial|development is partial/i.test(remaining))
})

await step('Procurement attached from inside the scorecard', async () => {
  await page.goto(`${gen()}/procurement`)
  await page.getByRole('link', { name: /create (a|one|new)|new procurement/i }).first().click()
  await page.waitForURL(/\/procurement\/assessments\/new/)
  await fillProcurementWizard(page, 'procurement-from-scorecard')
  await page.waitForURL(/\/generic\/procurement\?created=/, { timeout: 90_000 })
  await snap(page, 'procurement-back-in-scorecard')
  await page.getByRole('button', { name: /^attach$/i }).click()
  await page.waitForURL(/saved|attached/, { timeout: 60_000 })
  await snap(page, 'procurement-attached')
  check('the new procurement scorecard is attached', /attached|counts towards/i.test(await text(page)))
  await page.goto(`${gen()}/review`)
  await page.getByRole('button', { name: /^calculate scorecard$/i }).click()
  await page.waitForURL(/\/result/, { timeout: 120_000 })
  await snap(page, 'result-final-level')
  const body = await text(page)
  // The big figure under "B-BBEE level", not the ladder's "Level 1 (best)" legend.
  const level = body.match(/B-BBEE level\s*(?:\?\s*)?(Level [1-8]|Non-compliant)\b/)?.[1]
  report.ids.finalLevel = level
  check('one calculation gives a final level', Boolean(level) && !/not final yet/i.test(body), level)
})

async function fillProcurementWizard(p, prefix) {
  await p.locator('input[name="assessment_year"]').fill('2026')
  await snap(p, `${prefix}-total-spend`)
  await p.getByRole('button', { name: /next: suppliers/i }).click()
  const paste = p.getByLabel(/bulk supplier paste/i)
  if (!(await paste.isVisible())) await p.getByRole('button', { name: /paste/i }).first().click()
  await paste.fill(
    [
      'Walkthrough Steel Supplies\t450000\tGeneric\t1\tyes\tno\tno',
      'Walkthrough Logistics\t180000\tQSE\t2\tyes\tyes\tno',
      'Walkthrough Cleaning Services\t60000\tEME\t1\tyes\tyes\tyes',
      'Walkthrough Office Supplies\t90000\tGeneric\t4\tno\tno\tno',
    ].join('\n'),
  )
  await p.getByRole('button', { name: /import pasted rows/i }).click()
  // Total spend comes from the supplier list in this walkthrough.
  const useList = p.getByRole('button', { name: /use the total of the supplier list/i })
  if (await useList.count()) await useList.last().click()
  await p.waitForFunction(() => !/score appears once the total spend is set/i.test(document.body.innerText), null, { timeout: 15_000 }).catch(() => {})
  await snap(p, `${prefix}-suppliers`)
  await p.getByRole('button', { name: /save and see result/i }).click()
}

await step('Reopen in a new session and edit', async () => {
  const { context, page: again } = await newPage(browser, 'owner-again')
  await signIn(again, people.owner)
  await snap(again, 'home-with-work')
  const home = await again.locator('main').innerText()
  check('home lists the company and the scorecard', home.includes(COMPANY.slice(0, 20)) && /walkthrough scorecard/i.test(home))
  await again.getByRole('link', { name: /fy2026 walkthrough scorecard/i }).first().click()
  await settle(again)
  await snap(again, 'reopened-scorecard')
  await again.goto(`${gen()}/applicability`)
  await again.locator('input[name="sector"]').fill('Manufacturing (edited)')
  await again.getByRole('button', { name: /save and continue/i }).click()
  await settle(again)
  await again.goto(`${gen()}/result`)
  await settle(again)
  check('an edit asks for the scorecard to be calculated again', /calculate again|changed since/i.test(await again.locator('main').innerText()))
  await snap(again, 'result-needs-recalculation')
  await again.goto(`${gen()}/review`)
  await again.getByRole('button', { name: /^calculate scorecard$/i }).click()
  await again.waitForURL(/\/result/, { timeout: 120_000 })
  await settle(again)
  check('calculating again clears the prompt', !/changed since this was calculated/i.test(await again.locator('main').innerText()))
  await context.close()
})

await step('Scorecard report and PDF', async () => {
  await page.goto(`${BASE}/scorecards/calculator/${report.ids.scorecardId}/report`)
  await snap(page, 'scorecard-report')
  const body = await text(page)
  check('the report shows the final level', Boolean(report.ids.finalLevel) && body.includes(report.ids.finalLevel), report.ids.finalLevel)
  const pdf = path.join(OUT, 'scorecard-report.pdf')
  await page.emulateMedia({ media: 'print' })
  await page.pdf({ path: pdf, format: 'A4', printBackground: true })
  await page.emulateMedia({ media: 'screen' })
  const head = fs.readFileSync(pdf).subarray(0, 5).toString()
  check('the report prints to a PDF', head === '%PDF-', `${Math.round(fs.statSync(pdf).size / 1024)} KB`)
})

await step('Procurement only: create, edit, report, PDF, delete', async () => {
  await page.goto(`${BASE}/start`)
  await page.getByRole('link', { name: /procurement only/i }).first().click()
  await page.waitForURL(/type=procurement/)
  await snap(page, 'start-procurement-pick-company')
  await page.getByRole('link', { name: new RegExp(COMPANY.slice(0, 20).replace(/[()]/g, '.'), 'i') }).first().click()
  await page.waitForURL(/\/procurement\/assessments\/new/)
  await fillProcurementWizard(page, 'procurement-only')
  await page.waitForURL(/\/procurement\/assessments\/[0-9a-f-]{36}(\?|$)/, { timeout: 90_000 })
  report.ids.procurementId = page.url().match(/assessments\/([0-9a-f-]{36})/)[1]
  await snap(page, 'procurement-result')
  const before = await text(page)
  const scoreBefore = toNumber(before.match(/([\d.]+)\s*(of|\/)\s*29/)?.[1])
  check('procurement shows points out of 29', Number.isFinite(scoreBefore), `${scoreBefore}`)

  await page.getByRole('link', { name: /^edit/i }).first().click()
  await page.waitForURL(/\/edit/)
  await snap(page, 'procurement-edit')
  const spend = page.getByLabel(/supplier b-bbee spend/i).first()
  if (await spend.count()) {
    await spend.fill('20000')
  } else {
    report.notes.push('Procurement edit: spend field not found; saved unchanged.')
  }
  await page.getByRole('button', { name: /^save/i }).last().click()
  await page.waitForURL(/saved=1/, { timeout: 90_000 })
  await snap(page, 'procurement-edited')
  check('procurement edit saves', page.url().includes('saved=1'))

  await page.goto(`${BASE}/procurement/assessments/${report.ids.procurementId}/report`)
  await snap(page, 'procurement-report')
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    page.getByRole('button', { name: /download pdf/i }).first().click(),
  ])
  const pdf = path.join(OUT, 'procurement-report.pdf')
  await download.saveAs(pdf)
  check('procurement PDF downloads', fs.readFileSync(pdf).subarray(0, 5).toString() === '%PDF-', `${Math.round(fs.statSync(pdf).size / 1024)} KB`)

  await page.goto(`${BASE}/procurement/assessments/${report.ids.procurementId}`)
  await page.getByRole('button', { name: /^delete/i }).first().click()
  await snap(page, 'procurement-delete-confirm')
  await page.getByRole('dialog').getByRole('button', { name: /^delete/i }).click()
  await page.waitForURL((u) => !u.pathname.includes(report.ids.procurementId), { timeout: 60_000 })
  await snap(page, 'procurement-deleted')
  expected.push(report.ids.procurementId) // its links were collected before it was deleted
  const { data } = await service.from('procurement_assessments').select('id').eq('id', report.ids.procurementId)
  check('procurement delete removes it', (data ?? []).length === 0)
})

await step('Company page and edit', async () => {
  await page.goto(`${BASE}/companies/${report.ids.companyId}`)
  await snap(page, 'company')
  await page.getByRole('link', { name: /edit details/i }).click()
  await page.waitForURL(/\/edit/)
  await page.locator('input[name="contact_person"]').fill('Lerato Walkthrough')
  await snap(page, 'company-edit')
  await page.getByRole('button', { name: /^save/i }).click()
  await page.waitForURL(/saved=1/, { timeout: 60_000 })
  check('company edit saves', true)
  await page.goto(`${BASE}/companies`)
  await snap(page, 'companies')
  await page.goto(`${BASE}/scorecards`)
  await snap(page, 'full-scorecards-list')
  await page.goto(`${BASE}/procurement`)
  await snap(page, 'procurement-list')
  await page.goto(`${BASE}/dashboard/activity`)
  await snap(page, 'activity')
  for (const s of ['profile', 'account', 'help']) {
    await page.goto(`${BASE}/settings/${s}`)
    await snap(page, `settings-${s}`)
  }
})

await step('Older tools still open', async () => {
  for (const [url, name] of [
    [`/scorecards/new?companyId=${report.ids.companyId}&mode=modular`, 'older-modular-new'],
    ['/scorecards/new?legacy=1', 'older-legacy-new'],
    [`/scorecards/full/new?companyId=${report.ids.companyId}`, 'older-full-workbook-new'],
    ['/settings/legal', 'settings-legal'],
  ]) {
    const res = await page.goto(`${BASE}${url}`)
    check(`${url.split('?')[0]} opens`, (res?.status() ?? 0) < 400, `HTTP ${res?.status()}`)
    await snap(page, name)
  }
})

await step('Roles: a normal user is kept out of staff pages', async () => {
  expected.push('/admin', '/settings/eap-targets')
  for (const url of ['/admin', '/settings/eap-targets']) {
    const res = await page.goto(`${BASE}${url}`)
    const body = await page.locator('body').innerText()
    check(`${url} refused for a normal user`, (res?.status() ?? 200) >= 400 || /not allowed|forbidden|403|staff only|no access/i.test(body), `HTTP ${res?.status()}`)
  }
  await snap(page, 'normal-user-refused-admin')
})

await step('Another account cannot see this work', async () => {
  const { context, page: other } = await newPage(browser, 'other')
  await signIn(other, people.other)
  expected.push(report.ids.scorecardId, report.ids.companyId)
  const r1 = await other.goto(`${gen()}/result`)
  const t1 = await other.locator('body').innerText()
  const r2 = await other.goto(`${BASE}/companies/${report.ids.companyId}`)
  const t2 = await other.locator('body').innerText()
  check("another account gets 'not found' for this scorecard", r1?.status() === 404 || /not found|could not find/i.test(t1), `HTTP ${r1?.status()}`)
  check("another account gets 'not found' for this company", r2?.status() === 404 || /not found|could not find/i.test(t2), `HTTP ${r2?.status()}`)
  await snap(other, 'other-account-not-found')
  await context.close()
})

await step('Staff: admin console', async () => {
  for (const [url, name] of [
    ['/admin', 'admin-overview'],
    ['/admin/companies/browse', 'admin-companies'],
    [`/admin/companies/${report.ids.companyId}`, 'admin-company'],
    ['/admin/procurement/browse', 'admin-procurement'],
  ]) {
    await admin.goto(`${BASE}${url}`)
    await snap(admin, name)
    if (name === 'admin-company') {
      check('staff see the full scorecard on the company', /walkthrough scorecard/i.test(await admin.locator('body').innerText()))
    }
  }
})

await step('Phone: menu and navigation at 390px', async () => {
  const { context, page: phone } = await newPage(browser, 'phone', 390, 844)
  await signIn(phone, people.owner)
  await phone.getByRole('button', { name: /menu/i }).first().click()
  await phone.waitForTimeout(400)
  await phone.screenshot({ path: path.join(OUT, `${String(++stepNo).padStart(2, '0')}-phone-menu-open-390.png`) })
  await phone.getByRole('link', { name: /^companies$/i }).first().click()
  await phone.waitForURL(/\/companies/)
  await settle(phone)
  await phone.screenshot({ path: path.join(OUT, `${String(++stepNo).padStart(2, '0')}-phone-companies-390.png`), fullPage: true })
  check('the phone menu opens and navigates', phone.url().includes('/companies'))
  await context.close()
})

// ---------------------------------------------------------------------------
// Broken links: every internal link seen on the way, fetched as the owner.
// ---------------------------------------------------------------------------
await step('Broken links', async () => {
  for (const [href, from] of links) {
    const res = await ownerCtx.request.get(`${BASE}${href}`, { maxRedirects: 5, failOnStatusCode: false })
    if (res.status() >= 400 && !expected.some((e) => href.includes(e))) report.brokenLinks.push({ href, from, status: res.status() })
  }
  check('no broken internal links', report.brokenLinks.length === 0, `${links.size} links checked`)
})

await adminCtx.close()
await ownerCtx.close()
await browser.close()

report.finishedAt = new Date().toISOString()
report.people = Object.fromEntries(Object.entries(people).map(([k, v]) => [k, v.email]))
report.summary = {
  checks: report.checks.length,
  failed: report.checks.filter((c) => !c.ok).length,
  errors: report.errors.length,
  brokenLinks: report.brokenLinks.length,
  screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).length,
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log('\nSummary', report.summary)
if (report.errors.length) console.log('Errors', report.errors.slice(0, 40))
console.log(`Report: ${path.relative(process.cwd(), path.join(OUT, 'report.json'))}`)
process.exit(report.summary.failed || report.summary.errors || report.summary.brokenLinks ? 1 : 0)
