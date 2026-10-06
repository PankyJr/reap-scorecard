/**
 * Accessibility check: runs axe (WCAG 2.1 A and AA rules) on the main screens
 * at 1440x900 and 390x844, signed in as the staging review login
 * (scripts/staging-seed-review-login.mjs), plus the signed-out pages.
 * Prints every serious or critical problem; exits 1 if there are any.
 *
 *   PLAYWRIGHT_DIR=<folder with node_modules/playwright> \
 *   VERIFY_BASE_URL=http://localhost:3005 \
 *     node scripts/a11y-audit.mjs [--dark] [--all] [screen ...]
 *
 * --dark  emulates a dark-mode phone or laptop.
 * --all   also prints moderate and minor problems.
 * --detail prints each failing element's HTML and axe's explanation.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const BASE = (process.env.VERIFY_BASE_URL ?? 'http://localhost:3005').replace(/\/$/, '')
const args = process.argv.slice(2)
const DARK = args.includes('--dark')
const ALL = args.includes('--all')
const DETAIL = args.includes('--detail')
const ONLY = new Set(args.filter((a) => !a.startsWith('--')))
const creds = JSON.parse(fs.readFileSync(path.resolve('tmp/staging-secrets/review-login.json'), 'utf8'))
const AXE = path.resolve('node_modules/axe-core/axe.min.js')

const GOLDEN_COMPANY = process.env.GOLDEN_COMPANY_ID ?? 'd897e5e6-4d08-4c0a-80c8-981249946ccb'
const HALFWAY_COMPANY = process.env.HALFWAY_COMPANY_ID ?? '0b3a005f-2114-40a7-8392-9427e9302971'
const GOLDEN_CARD = process.env.GOLDEN_SCORECARD_ID ?? 'e0f2ee96-0c3c-41b4-85e3-8979ee21f161'
const HALFWAY_CARD = process.env.HALFWAY_SCORECARD_ID ?? '54702a8c-be16-457d-a278-3d594e122ec4'
const GOLDEN_PROC = process.env.GOLDEN_PROCUREMENT_ID ?? '630ec923-fbae-4db5-935c-81bce48e4e6e'
const gen = (id) => `/scorecards/calculator/${id}/generic`

const SIGNED_OUT = { login: '/login', 'login-forgot': '/login?mode=forgot' }
const SIGNED_IN = {
  home: '/dashboard',
  companies: '/companies',
  'company-new': '/companies/new',
  'company-golden': `/companies/${GOLDEN_COMPANY}`,
  start: '/start',
  'start-full': `/start?type=full&companyId=${HALFWAY_COMPANY}`,
  'scorecard-halfway': gen(HALFWAY_CARD),
  'scorecard-golden': gen(GOLDEN_CARD),
  'area-applicability': `${gen(HALFWAY_CARD)}/applicability`,
  'area-financial': `${gen(HALFWAY_CARD)}/financial`,
  'area-ownership': `${gen(HALFWAY_CARD)}/ownership`,
  'area-management-control': `${gen(HALFWAY_CARD)}/management-control`,
  'area-skills': `${gen(HALFWAY_CARD)}/skills-development`,
  'area-enterprise-development': `${gen(HALFWAY_CARD)}/enterprise-development`,
  'area-procurement': `${gen(HALFWAY_CARD)}/procurement`,
  'scorecard-review': `${gen(HALFWAY_CARD)}/review`,
  'result-golden': `${gen(GOLDEN_CARD)}/result`,
  'report-golden': `/scorecards/calculator/${GOLDEN_CARD}/report`,
  procurement: '/procurement',
  'procurement-new': `/procurement/assessments/new?companyId=${HALFWAY_COMPANY}`,
  'procurement-result': `/procurement/assessments/${GOLDEN_PROC}`,
  'procurement-edit': `/procurement/assessments/${GOLDEN_PROC}/edit`,
  'procurement-report': `/procurement/assessments/${GOLDEN_PROC}/report`,
  help: '/settings/help',
  settings: '/settings',
}

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    return createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? '', 'noop.js'))('playwright')
  }
}

const { chromium } = await loadPlaywright()
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL === 'none' ? {} : { channel: 'chrome' })

async function audit(page, name, tag) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.addScriptTag({ path: AXE })
  const result = await page.evaluate(async () =>
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }),
  )
  const keep = result.violations.filter((v) => ALL || v.impact === 'serious' || v.impact === 'critical')
  return keep.map((v) => ({
    screen: `${name} @${tag}`,
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 4).map((n) => (DETAIL ? `${n.target.join(' ')}\n      ${n.html.slice(0, 160)}\n      ${(n.any[0]?.message ?? n.failureSummary ?? '').slice(0, 200)}` : n.target.join(' '))),
    count: v.nodes.length,
  }))
}

const sizes = [
  { tag: '1440', width: 1440, height: 900 },
  { tag: '390', width: 390, height: 844 },
]
const problems = []
let checked = 0
for (const size of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    isMobile: size.width < 500,
    hasTouch: size.width < 500,
    colorScheme: DARK ? 'dark' : 'light',
  })
  const page = await ctx.newPage()
  page.setDefaultTimeout(60_000)
  for (const [name, url] of Object.entries(SIGNED_OUT)) {
    if (ONLY.size && !ONLY.has(name)) continue
    await page.goto(`${BASE}${url}`)
    problems.push(...(await audit(page, name, size.tag)))
    checked++
  }
  await page.goto(`${BASE}/login`)
  await page.locator('#email').fill(creds.email)
  await page.locator('#password').fill(creds.password)
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login')), page.getByRole('button', { name: /^sign in$/i }).click()])
  for (const [name, url] of Object.entries(SIGNED_IN)) {
    if (ONLY.size && !ONLY.has(name)) continue
    const res = await page.goto(`${BASE}${url}`)
    if (!res || res.status() >= 400) problems.push({ screen: `${name} @${size.tag}`, rule: 'http', impact: 'critical', help: `HTTP ${res?.status()}`, nodes: [], count: 1 })
    problems.push(...(await audit(page, name, size.tag)))
    checked++
  }
  await ctx.close()
}
await browser.close()

for (const p of problems) {
  console.log(`${p.screen}  [${p.impact}] ${p.rule}: ${p.help} (${p.count} on the page)`)
  for (const n of p.nodes) console.log(`    ${n}`)
}
console.log(`\n${checked} screen checks${DARK ? ' in dark mode' : ''}; ${problems.length} ${ALL ? '' : 'serious or critical '}problem groups.`)
process.exit(problems.length ? 1 : 0)
