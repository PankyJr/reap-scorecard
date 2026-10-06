/**
 * Screenshots of the main screens at 1440x900 and 390x844, signed in as the
 * staging review login (scripts/staging-seed-review-login.mjs). Pictures are
 * compressed JPGs, cut at the bottom of long pages, for docs/UI_BEFORE_AFTER.md.
 *
 *   PLAYWRIGHT_DIR=<folder with node_modules/playwright> \
 *   VERIFY_BASE_URL=http://localhost:3005 \
 *     node scripts/capture-ui-screens.mjs docs/ui/pass2-before [screen ...]
 *
 * With no screen names, every screen below is captured.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const BASE = (process.env.VERIFY_BASE_URL ?? 'http://localhost:3005').replace(/\/$/, '')
const OUT = path.resolve(process.argv[2] ?? 'docs/ui/pass2-before')
const ONLY = new Set(process.argv.slice(3))
const creds = JSON.parse(fs.readFileSync(path.resolve('tmp/staging-secrets/review-login.json'), 'utf8'))

// The review login's records (see the seeding script's output).
const GOLDEN_COMPANY = process.env.GOLDEN_COMPANY_ID ?? 'd897e5e6-4d08-4c0a-80c8-981249946ccb'
const HALFWAY_COMPANY = process.env.HALFWAY_COMPANY_ID ?? '0b3a005f-2114-40a7-8392-9427e9302971'
const GOLDEN_CARD = process.env.GOLDEN_SCORECARD_ID ?? 'e0f2ee96-0c3c-41b4-85e3-8979ee21f161'
const HALFWAY_CARD = process.env.HALFWAY_SCORECARD_ID ?? '54702a8c-be16-457d-a278-3d594e122ec4'
const GOLDEN_PROC = process.env.GOLDEN_PROCUREMENT_ID ?? '630ec923-fbae-4db5-935c-81bce48e4e6e'

const gen = (id) => `/scorecards/calculator/${id}/generic`
export const SCREENS = {
  home: '/dashboard',
  companies: '/companies',
  'company-new': '/companies/new',
  'company-golden': `/companies/${GOLDEN_COMPANY}`,
  start: '/start',
  'start-full': `/start?type=full&companyId=${HALFWAY_COMPANY}`,
  'scorecard-halfway': gen(HALFWAY_CARD),
  'scorecard-golden': gen(GOLDEN_CARD),
  'area-ownership': `${gen(HALFWAY_CARD)}/ownership`,
  'area-management-control': `${gen(HALFWAY_CARD)}/management-control`,
  'area-skills': `${gen(HALFWAY_CARD)}/skills-development`,
  'area-enterprise-development': `${gen(HALFWAY_CARD)}/enterprise-development`,
  'scorecard-review': `${gen(HALFWAY_CARD)}/review`,
  'result-golden': `${gen(GOLDEN_CARD)}/result`,
  'report-golden': `/scorecards/calculator/${GOLDEN_CARD}/report`,
  'procurement-new': `/procurement/assessments/new?companyId=${HALFWAY_COMPANY}`,
  'procurement-result': `/procurement/assessments/${GOLDEN_PROC}`,
  'procurement-report': `/procurement/assessments/${GOLDEN_PROC}/report`,
}

const MAX_DESKTOP = 2400
const MAX_PHONE = 2600

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    return createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? '', 'noop.js'))('playwright')
  }
}

const { chromium } = await loadPlaywright()
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL === 'none' ? {} : { channel: 'chrome' })
fs.mkdirSync(OUT, { recursive: true })

async function session(width, height, scale) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: width < 500, hasTouch: width < 500 })
  const page = await ctx.newPage()
  page.setDefaultTimeout(60_000)
  await page.goto(`${BASE}/login`)
  await page.locator('#email').fill(creds.email)
  await page.locator('#password').fill(creds.password)
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login')), page.getByRole('button', { name: /^sign in$/i }).click()])
  return { ctx, page }
}

const sizes = [
  { tag: '1440', width: 1440, height: 900, scale: 0.5, max: MAX_DESKTOP },
  { tag: '390', width: 390, height: 844, scale: 1, max: MAX_PHONE },
]
const written = []
for (const size of sizes) {
  const { ctx, page } = await session(size.width, size.height, size.scale)
  for (const [name, url] of Object.entries(SCREENS)) {
    if (ONLY.size && !ONLY.has(name)) continue
    await page.goto(`${BASE}${url}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(400)
    const full = await page.evaluate(() => document.documentElement.scrollHeight)
    const file = path.join(OUT, `${name}-${size.tag}.jpg`)
    await page.screenshot({ path: file, type: 'jpeg', quality: 55, fullPage: true, clip: { x: 0, y: 0, width: size.width, height: Math.min(full, size.max) } })
    written.push(path.relative(process.cwd(), file))
  }
  await ctx.close()
}
await browser.close()
console.log(`${written.length} pictures in ${path.relative(process.cwd(), OUT)}`)
