/**
 * Keyboard-only run through the main journey on staging, with no mouse:
 * sign in, Home's next step, add a company, "What do you need?", create a full
 * scorecard, fill an area in by hand, "Done, next area", and on to the review.
 * Only Tab, Shift+Tab, typing, Enter and Space are used. Every element that
 * gets focus is checked for a visible focus indicator.
 *
 * Uses a throwaway, pre-confirmed staging login made with the admin API, and
 * deletes it and everything it created at the end.
 *
 *   set -a; . ./.env.local; set +a
 *   PLAYWRIGHT_DIR=<folder with node_modules/playwright> \
 *   VERIFY_BASE_URL=http://localhost:3005 \
 *     node scripts/keyboard-journey.mjs [--phone]
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const BASE = (process.env.VERIFY_BASE_URL ?? 'http://localhost:3005').replace(/\/$/, '')
const PHONE = process.argv.includes('--phone')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url?.includes('jzvqyryblsfxlinvoiuf')) throw new Error('Staging only: NEXT_PUBLIC_SUPABASE_URL is not the staging project.')
if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    return createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? '', 'noop.js'))('playwright')
  }
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const email = `keyboard-${Date.now()}@reap-staging.example`
const password = `Kb-${randomBytes(12).toString('base64url')}9!`
const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
if (createError || !created.user) throw new Error(`createUser: ${createError?.message}`)
const userId = created.user.id

const steps = []
const noFocusRing = new Map()
let failure = null

const { chromium } = await loadPlaywright()
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL === 'none' ? {} : { channel: 'chrome' })
const ctx = await browser.newContext(
  PHONE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } },
)
const page = await ctx.newPage()
page.setDefaultTimeout(60_000)
const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))

/** What has focus, and whether it shows a focus indicator. */
const focused = () =>
  page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const style = getComputedStyle(el)
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
    const ring = style.boxShadow && style.boxShadow !== 'none'
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || el.id || '').trim().replace(/\s+/g, ' ')
    return { tag: el.tagName.toLowerCase(), name: name.slice(0, 70), id: el.id, nameAttr: el.getAttribute('name'), visible: outline || ring }
  })

/** Press Tab until the focused element matches; fails after `max` presses. */
async function tabTo(match, label, max = 120) {
  const trail = []
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const f = await focused()
    trail.push(f ? `${f.tag}:${f.nameAttr ?? ''}:"${f.name.slice(0, 30)}"` : 'body')
    if (!f) continue
    if (!f.visible) noFocusRing.set(`${new URL(page.url()).pathname} :: ${f.tag} "${f.name}"`, true)
    if (match(f)) {
      steps.push(`${label}: reached in ${i + 1} Tab presses`)
      return f
    }
  }
  throw new Error(`${label}: not reachable with Tab within ${max} presses on ${page.url()}\n  last focus: ${trail.slice(-25).join(' | ')}`)
}
const byName = (re) => (f) => re.test(f.name)
const byField = (name) => (f) => f.nameAttr === name || f.id === name

/** Wait for the address and for the page's own content, as a person would before pressing Tab. */
async function waitPath(re, label, ready) {
  await page.waitForURL((u) => re.test(u.pathname + u.search), { timeout: 60_000 })
  if (ready) await page.locator(ready).first().waitFor({ timeout: 30_000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  steps.push(`${label}: ${new URL(page.url()).pathname}`)
}

try {
  // Sign in
  await page.goto(`${BASE}/login`)
  await tabTo(byField('email'), 'E-mail field')
  await page.keyboard.type(email)
  await tabTo(byField('password'), 'Password field')
  await page.keyboard.type(password)
  await page.keyboard.press('Enter')
  await waitPath(/^\/dashboard/, 'Signed in with Enter', '#next-heading')

  // The first Tab on a page should offer "Skip to content".
  await page.keyboard.press('Tab')
  const first = await focused()
  steps.push(`First Tab on Home: ${first?.tag} "${first?.name}"`)

  // Home's next step
  await tabTo(byName(/^Add your first company$/i), 'Next step: Add your first company')
  await page.keyboard.press('Enter')
  await waitPath(/^\/companies\/new/, 'Add company opened with Enter', 'input[name="name"]')

  // Add a company
  await tabTo(byField('name'), 'Company name')
  await page.keyboard.type('Keyboard Only (Pty) Ltd')
  await tabTo(byField('industry'), 'Industry (dropdown)')
  await page.keyboard.type('Manufacturing')
  await tabTo(byField('financial_year_end_month'), 'Financial year end (dropdown)')
  await page.keyboard.type('February')
  await tabTo(byField('annual_turnover'), 'Annual turnover')
  await page.keyboard.type('30000000')
  await tabTo(byField('black_ownership_percentage'), 'Black ownership')
  await page.keyboard.type('30')
  const chosen = await page.evaluate(() => ({
    industry: document.querySelector('[name="industry"]')?.value,
    month: document.querySelector('[name="financial_year_end_month"]')?.value,
  }))
  steps.push(`Dropdowns set by typing: industry="${chosen.industry}", year end month="${chosen.month}"`)
  await tabTo(byName(/^Save company$/i), 'Save company')
  await page.keyboard.press('Enter')
  await waitPath(/^\/start\?.*companyId=/, 'Saved; "What do you need?" opened', 'text=/Full B-BBEE scorecard/i')

  // What do you need? -> full scorecard
  await tabTo(byName(/^Full B-BBEE scorecard/i), 'Full B-BBEE scorecard card')
  await page.keyboard.press('Enter')
  await waitPath(/^\/scorecards\/new/, 'Card opened with Enter', 'button:has-text("Create the scorecard")')
  await tabTo(byName(/^Create the scorecard$/i), 'Create the scorecard')
  await page.keyboard.press('Enter')
  await waitPath(/^\/scorecards\/calculator\/[^/]+\/generic$/, 'Scorecard created', 'text=/fill it in by hand/i')

  // Fill it in by hand -> the first area
  await tabTo(byName(/^Start with /i), 'Or fill it in by hand: "Start with …"')
  await page.keyboard.press('Enter')
  await waitPath(/^\/scorecards\/calculator\/[^/]+\/generic\/[a-z-]+/, 'First area opened with Enter', 'button:has-text("Done, next area")')
  const firstArea = new URL(page.url()).pathname

  // Type a figure and move on
  const field = await tabTo((f) => f.tag === 'input' && !!f.nameAttr && f.nameAttr !== 'assessmentId', 'First field in the area')
  await page.keyboard.type('2000000')
  steps.push(`  typed 2000000 into ${field.nameAttr}`)
  await tabTo(byName(/^Done, next area$/i), 'Done, next area')
  await page.keyboard.press('Enter')
  await page.waitForURL((u) => u.pathname !== firstArea, { timeout: 60_000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  steps.push(`Next area with Enter: ${new URL(page.url()).pathname}`)

  // The live score is reachable, and the last step of the journey opens by keyboard.
  // ("Review my scorecard" only appears once every area is filled in.)
  if (PHONE) {
    steps.push('Phone: the step bar is collapsed, so the run ends after "Done, next area"')
  } else {
    await tabTo(byName(/See result/i), 'Step "See result"', 200)
    await page.keyboard.press('Enter')
    await waitPath(/\/(result|review)$/, 'Result step opened with Enter', 'h1')
  }
} catch (error) {
  failure = error instanceof Error ? error.message : String(error)
  if (process.env.KEYBOARD_FAILSHOT) {
    await page.screenshot({ path: process.env.KEYBOARD_FAILSHOT, type: 'jpeg', quality: 50 }).catch(() => {})
    const text = await page.evaluate(() => document.querySelector('main')?.innerText ?? '').catch(() => '')
    failure += `\n  main text: ${text.replace(/\s+/g, ' ').slice(0, 400)}`
  }
} finally {
  await browser.close()
  // Delete everything the run made.
  const { data: companies } = await admin.from('companies').select('id').eq('owner_id', userId)
  const ids = (companies ?? []).map((c) => c.id)
  if (ids.length) {
    await admin.from('scorecard_assessments').delete().in('company_id', ids)
    await admin.from('companies').delete().in('id', ids)
  }
  await admin.from('audit_log').delete().eq('actor_id', userId)
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  const { count } = await admin.from('companies').select('id', { count: 'exact', head: true }).eq('owner_id', userId)
  steps.push(`Clean-up: ${ids.length} company deleted, login deleted: ${!deleteError}, companies left: ${count ?? 0}`)
}

console.log(`Keyboard-only journey at ${PHONE ? '390x844' : '1440x900'}`)
for (const s of steps) console.log(`  ${s}`)
console.log(`\nFocused elements with no visible focus indicator: ${noFocusRing.size}`)
for (const k of noFocusRing.keys()) console.log(`  ${k}`)
console.log(`Console errors: ${consoleErrors.length}`)
for (const e of consoleErrors.slice(0, 5)) console.log(`  ${e.slice(0, 200)}`)
console.log(failure ? `\nFAILED: ${failure}` : '\nCompleted with the keyboard only.')
process.exit(failure ? 1 : 0)
