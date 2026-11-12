import fs from 'node:fs'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { PAGE_HELP_LIST, TOURS, helpForPath } from '../src/content/page-help'

/**
 * Every tour, start to finish, on seeded data. A run fails when a step is
 * skipped (the step number must go up by exactly one, against a fixed total),
 * when the highlight box is not on its element (within 2px, also after
 * scrolling), or when a step says "not on the page" while the element is there.
 * Read-only: tours only point at things; the one action step clicks Start new.
 */

const PAD = 6
type StepResult = { tour: string; url: string; step: number; total: number; target: string; state: 'shown' | 'missing'; offBy: number | null; offByAfterScroll: number | null }
const results: StepResult[] = []
const ids: { company?: string; assessment?: string; procurement?: string } = {}
const SHOTS = process.env.E2E_SCREENSHOTS === '1'
const SHOT_PAGES = new Set(['home', 'area-ownership', 'procurement-edit', 'procurement-new'])

async function waitForReady(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await expect.poll(() => page.locator('main [aria-busy="true"]').count(), { timeout: 90_000 }).toBe(0)
}

async function discover(browser: Browser) {
  const context = await browser.newContext({ storageState: 'e2e/.auth/state.json', viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const first = async (path: string, pattern: RegExp) => {
    await page.goto(path)
    await waitForReady(page)
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))
    for (const href of hrefs) {
      const m = href.match(pattern)
      if (m) return m[1]
    }
    return undefined
  }
  ids.company = await first('/companies', /^\/companies\/([0-9a-f-]{36})$/)
  ids.assessment = await first('/scorecards', /\/scorecards\/calculator\/([0-9a-f-]{36})/)
  ids.procurement = await first('/procurement', /^\/procurement\/assessments\/([0-9a-f-]{36})/)
  await context.close()
}

/** A real URL for a route pattern, from the seeded records. */
function urlFor(route: string): string | null {
  // Pages that start new work need the company (they only show a form; nothing is saved).
  if (['/procurement/assessments/new', '/scorecards/new', '/scorecards/full/new'].includes(route)) {
    return ids.company ? `${route}?companyId=${ids.company}` : null
  }
  if (!route.includes('[')) return route
  let url = route
  if (url.includes('[assessmentId]')) {
    if (!ids.assessment) return null
    url = url.replace('[assessmentId]', ids.assessment)
  }
  if (url.startsWith('/companies/[id]')) {
    if (!ids.company) return null
    url = url.replace('[id]', ids.company)
  }
  if (url.startsWith('/procurement/assessments/[id]')) {
    if (!ids.procurement) return null
    url = url.replace('[id]', ids.procurement)
  }
  return url.includes('[') ? null : url
}

/** How far the highlight box is from where it should be (element rect + padding), in px. */
function measure(page: Page, target: string) {
  return page.evaluate(
    ({ target, pad }) => {
      const nodes = [...document.querySelectorAll<HTMLElement>(`[data-help~="${CSS.escape(target)}"]`)]
      const el = nodes.find((n) => {
        if (n.closest('[data-help-ui]')) return false
        const r = n.getBoundingClientRect()
        const s = getComputedStyle(n)
        return (r.width > 0 || r.height > 0) && s.visibility !== 'hidden' && s.display !== 'none'
      })
      const box = document.querySelector('[data-tour-box]')?.getBoundingClientRect()
      if (!el) return { exists: false, offBy: null as number | null, inView: false }
      if (!box) return { exists: true, offBy: 999, inView: false }
      const r = el.getBoundingClientRect()
      const offBy = Math.max(
        Math.abs(box.top - (r.top - pad)),
        Math.abs(box.left - (r.left - pad)),
        Math.abs(box.width - (r.width + pad * 2)),
        Math.abs(box.height - (r.height + pad * 2)),
      )
      const inView = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth
      return { exists: true, offBy: Math.round(offBy * 10) / 10, inView }
    },
    { target, pad: PAD },
  )
}

async function settledStep(page: Page, previous: number) {
  const card = page.locator('[data-tour-card]')
  await expect(card).toBeVisible({ timeout: 90_000 })
  await expect
    .poll(async () => Number((await card.getAttribute('data-tour-step')) ?? 0), { timeout: 90_000, message: 'the tour did not move to another step' })
    .not.toBe(previous)
  await expect.poll(async () => card.getAttribute('data-tour-state'), { timeout: 90_000 }).toMatch(/^(shown|missing)$/)
  return {
    step: Number(await card.getAttribute('data-tour-step')),
    total: Number(await card.getAttribute('data-tour-total')),
    state: (await card.getAttribute('data-tour-state')) as 'shown' | 'missing',
    target: (await card.getAttribute('data-tour-target')) ?? '',
  }
}

/** Run the tour that is on screen to the end, checking every step. */
async function runTour(page: Page, tour: string, expectedTotal: number, shotName?: string) {
  let previous = 0
  for (let expected = 1; expected <= expectedTotal; expected++) {
    const s = await settledStep(page, previous)
    expect(s.total, `${tour}: total steps`).toBe(expectedTotal)
    expect(s.step, `${tour}: step ${expected} was skipped (got step ${s.step})`).toBe(expected)
    let offBy: number | null = null
    let offByAfterScroll: number | null = null
    if (s.state === 'shown') {
      await expect.poll(async () => (await measure(page, s.target)).offBy, { timeout: 5_000, message: `${tour} step ${s.step}: box not on ${s.target}` }).toBeLessThanOrEqual(2)
      const m = await measure(page, s.target)
      offBy = m.offBy
      expect(m.inView, `${tour} step ${s.step}: ${s.target} not scrolled into view`).toBe(true)
      if (shotName && s.step === 1) {
        await page.waitForTimeout(400)
        await page.screenshot({ path: `screenshots/help/${shotName}-tour-step.png` })
      }
      // Scroll a little: the box must follow.
      await page.mouse.wheel(0, 120)
      await expect.poll(async () => (await measure(page, s.target)).offBy, { timeout: 5_000, message: `${tour} step ${s.step}: box lost ${s.target} after scrolling` }).toBeLessThanOrEqual(2)
      offByAfterScroll = (await measure(page, s.target)).offBy
      await page.mouse.wheel(0, -120)
    } else {
      const m = await measure(page, s.target)
      expect(m.exists, `${tour} step ${s.step}: shown as "not on the page" but ${s.target} is there`).toBe(false)
      await expect(page.locator('[data-tour-missing]')).toBeVisible()
    }
    results.push({ tour, url: new URL(page.url()).pathname, step: s.step, total: s.total, target: s.target, state: s.state, offBy, offByAfterScroll })
    const next = page.locator('[data-tour-next]')
    if ((await next.count()) === 0) {
      // An action step: the user's real click on the element moves the tour on.
      await page.locator(`[data-help~="${s.target}"]`).filter({ visible: true }).first().click()
    } else {
      await next.click()
    }
    previous = s.step
  }
  await expect(page.locator('[data-tour-card]')).toHaveCount(0, { timeout: 30_000 })
}

test.beforeAll(async ({ browser }) => {
  await discover(browser)
  if (SHOTS) fs.mkdirSync('screenshots/help', { recursive: true })
})

test.afterAll(() => {
  fs.mkdirSync('e2e-results', { recursive: true })
  fs.writeFileSync('e2e-results/tours.json', JSON.stringify({ ids: Object.keys(ids).filter((k) => ids[k as keyof typeof ids]), results }, null, 2))
})

test.describe('page tours', () => {
  for (const entry of PAGE_HELP_LIST) {
    test(`${entry.key} (${entry.route})`, async ({ page }) => {
      const url = urlFor(entry.route)
      test.skip(!url, `no seeded record to open ${entry.route}`)
      const response = await page.goto(url!)
      test.skip(response?.status() === 404, `${entry.route} is not available here (404)`)
      await waitForReady(page)
      // An older page that hands this kind of record straight on to its replacement
      // (the redirect can arrive after the first paint, while the page streams).
      await page.waitForLoadState('networkidle')
      await waitForReady(page)
      const landed = helpForPath(new URL(page.url()).pathname)
      test.skip(
        entry.key.startsWith('legacy-') && landed?.route !== entry.route,
        `${entry.route} redirects to ${landed?.route ?? 'another page'} for the seeded records`,
      )

      // The page's own help: the panel must be this page's entry.
      const button = page.locator('main [data-help="help-button"]').filter({ visible: true }).first()
      if ((await button.count()) > 0) await button.click()
      else await page.keyboard.press('?')
      const panel = page.locator('[data-help-panel]')
      await expect(panel).toBeVisible()
      await expect(panel).toHaveAttribute('data-help-panel', entry.key)
      if (SHOTS && SHOT_PAGES.has(entry.key)) {
        await page.waitForTimeout(400)
        await page.screenshot({ path: `screenshots/help/${entry.key}-panel.png` })
      }

      await panel.locator('[data-help-show-me]').click()
      await runTour(page, `page:${entry.key}`, entry.steps.length, SHOTS && SHOT_PAGES.has(entry.key) ? entry.key : undefined)
      const finished = await page.evaluate((id) => localStorage.getItem(`reap-help:tour-done:${id}`), `page:${entry.key}`)
      expect(finished, 'a finished tour is remembered').toBe('1')
    })
  }
})

test.describe('multi-page tours', () => {
  for (const tour of TOURS) {
    test(`${tour.id}, started from Settings`, async ({ page }) => {
      await page.goto('/settings/help')
      await waitForReady(page)
      await page.locator(`[data-help-start-tour="${tour.id}"]`).click()
      await runTour(page, tour.id, tour.steps.length)
      // It went through every page it lists, in order.
      const visited = results.filter((r) => r.tour === tour.id).map((r) => r.url)
      expect(visited).toEqual(tour.steps.map((s) => s.path))
    })
  }
})

test.describe('help panel', () => {
  test('the ? key opens it, focus stays inside, Esc closes it', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForReady(page)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('?')
    const panel = page.locator('[data-help-panel]')
    await expect(panel).toBeVisible()
    for (let i = 0; i < 40; i++) await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-help-panel]')))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
  })

  test('Esc ends a tour', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForReady(page)
    await page.locator('main [data-help="help-button"]').first().click()
    await page.locator('[data-help-show-me]').click()
    await expect(page.locator('[data-tour-card]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-tour-card]')).toHaveCount(0)
  })
})
