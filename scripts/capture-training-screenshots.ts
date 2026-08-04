/**
 * REAP Formal Procurement Scorecard - training screenshot capture.
 *
 * Drives the running application end to end with Chromium and writes lossless
 * PNG captures at a 2x device scale factor. Development tooling only: this file
 * is never included in the client training package.
 *
 * Usage: npx tsx scripts/capture-training-screenshots.ts
 */
import { chromium, type Browser, type Locator, type Page } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.REAP_TRAINING_BASE_URL ?? 'http://localhost:3100'
const EMAIL = process.env.REAP_TRAINING_EMAIL ?? 'reap.training.demo@example.com'
const PASSWORD = process.env.REAP_TRAINING_PASSWORD ?? 'Reap!Training2026'
const OUT = path.resolve('output/training-assets/screenshots')
const DATA = path.resolve('tmp/training-data')

const COMPANY = {
  name: 'Thandeka Industrial Holdings (Pty) Ltd',
  industry: 'Industrial manufacturing and distribution',
  contact: 'Nomsa Dlamini',
  email: 'procurement@thandeka-industrial.example.co.za',
  phone: '+27 11 555 0142',
  notes:
    'Fictional demonstration record. Registration 2016/458219/07. Financial year ends 28 February. Measured entity for the 2026 procurement assessment cycle.',
}

type Pad = { inclusions: Array<[string, string]>; exclusions: Array<[string, string]> }

const PAD_2026: Pad = {
  inclusions: [
    ['tmps_opening_inventory', '12400000'],
    ['tmps_closing_inventory', '10850000'],
    ['tmps_cost_of_sales', '48600000'],
    ['tmps_other_operating_expenses', '14750000'],
    ['tmps_finance_costs', '2180000'],
    ['tmps_capital_expenditure', '6420000'],
  ],
  exclusions: [
    ['tmps_employee_costs', '11900000'],
    ['tmps_depreciation', '3450000'],
    ['tmps_utilities', '2380000'],
    ['tmps_service_fees', '1620000'],
    ['tmps_recharge_for_services', '850000'],
  ],
}

const PAD_2025: Pad = {
  inclusions: [
    ['tmps_opening_inventory', '13900000'],
    ['tmps_closing_inventory', '11600000'],
    ['tmps_cost_of_sales', '52400000'],
    ['tmps_other_operating_expenses', '15300000'],
    ['tmps_finance_costs', '2410000'],
    ['tmps_capital_expenditure', '7190000'],
  ],
  exclusions: [
    ['tmps_employee_costs', '12300000'],
    ['tmps_depreciation', '3610000'],
    ['tmps_utilities', '2450000'],
    ['tmps_service_fees', '1690000'],
    ['tmps_recharge_for_services', '750000'],
  ],
}

const manifest: Array<{
  file: string
  route: string
  kind: 'context' | 'detail'
  purpose: string
}> = []

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

/** Blocks until route-level skeletons have been replaced by real content. */
async function waitForContent(page: Page) {
  await page
    .waitForFunction(() => document.querySelectorAll('.animate-pulse').length === 0, null, {
      timeout: 45_000,
    })
    .catch(() => {})
}

async function settle(page: Page, extra = 320) {
  await waitForContent(page)
  await page
    .evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    })
    .catch(() => {})
  await page.waitForTimeout(extra)
}

async function shot(page: Page, file: string, purpose: string, full = false) {
  await settle(page)
  await page.screenshot({
    path: path.join(OUT, file),
    type: 'png',
    fullPage: full,
    animations: 'disabled',
    caret: 'hide',
  })
  manifest.push({ file, route: new URL(page.url()).pathname, kind: 'context', purpose })
  console.log(`  context  ${file}`)
}

type DetailOptions = {
  /** Smallest acceptable height for the enclosing panel that gets cropped. */
  minH?: number
  /** Largest acceptable height - taller ancestors are rejected. */
  maxH?: number
  minW?: number
  pad?: number
  /** Force a minimum crop width so fine print stays legible in print. */
  floorW?: number
}

/**
 * Crops the enclosing panel of a locator. Walks up the DOM for the first
 * ancestor inside the requested size envelope so captions always frame a whole
 * control rather than a thin text strip.
 */
async function cropDetail(
  page: Page,
  file: string,
  target: Locator,
  purpose: string,
  options: DetailOptions = {},
) {
  const opts = {
    minH: options.minH ?? 120,
    maxH: options.maxH ?? 900,
    minW: options.minW ?? 260,
    pad: options.pad ?? 16,
    floorW: options.floorW ?? 760,
  }
  await target.scrollIntoViewIfNeeded().catch(() => {})
  await settle(page, 200)

  const box = await target.evaluate((element, o) => {
    const candidates: HTMLElement[] = []
    let node: HTMLElement | null = element as HTMLElement
    while (node && node !== document.body) {
      const rect = node.getBoundingClientRect()
      if (rect.height > o.maxH) break
      candidates.push(node)
      node = node.parentElement
    }
    const fits = candidates.filter(
      (candidate) =>
        candidate.getBoundingClientRect().height >= o.minH &&
        candidate.getBoundingClientRect().width >= o.minW,
    )
    const chosen =
      fits[fits.length - 1] ?? candidates[candidates.length - 1] ?? (element as HTMLElement)
    const rect = chosen.getBoundingClientRect()
    return {
      x: rect.x + window.scrollX,
      y: rect.y + window.scrollY,
      width: rect.width,
      height: rect.height,
    }
  }, opts)

  const pageWidth = await page.evaluate(() => document.documentElement.clientWidth)
  let width = Math.max(box.width + opts.pad * 2, opts.floorW)
  let x = Math.round(box.x + box.width / 2 - width / 2)
  if (x < 0) x = 0
  if (x + width > pageWidth) width = pageWidth - x
  const y = Math.max(Math.round(box.y - opts.pad), 0)
  const height = Math.min(box.height + opts.pad * 2, opts.maxH + opts.pad * 2)

  await page.screenshot({
    path: path.join(OUT, file),
    type: 'png',
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    clip: { x, y, width, height },
  })
  manifest.push({ file, route: new URL(page.url()).pathname, kind: 'detail', purpose })
  console.log(`  detail   ${file}  ${Math.round(width)}x${Math.round(height)} css`)
}

const skipped: string[] = []

/** Detail capture that records, rather than aborts, when a panel is absent. */
async function detail(
  page: Page,
  file: string,
  target: Locator,
  purpose: string,
  options: DetailOptions = {},
) {
  try {
    await target.first().waitFor({ state: 'visible', timeout: 6000 })
    await cropDetail(page, file, target.first(), purpose, options)
    return true
  } catch (error) {
    skipped.push(file)
    console.log(`  skipped  ${file} (${(error as Error).message.split('\n')[0]})`)
    return false
  }
}

async function visible(target: Locator, timeout = 4000) {
  return target
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false)
}

async function goto(page: Page, route: string) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 120_000 })
  await settle(page)
}

/**
 * Places a panel at a predictable offset from the top of the viewport and
 * verifies the result, because several screens reflow while data settles.
 */
async function scrollTo(page: Page, target: Locator, block = 'start') {
  const offset = block === 'center' ? 420 : 130
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const top = await target
      .first()
      .evaluate((node) => node.getBoundingClientRect().top)
      .catch(() => null)
    if (top === null) return
    if (Math.abs(top - offset) <= 24) return
    await page.evaluate((delta) => window.scrollBy(0, delta), top - offset)
    await page.waitForTimeout(260)
  }
}

/** Dismisses the guided tour, its scrim and the help launcher. */
async function closeOverlays(page: Page) {
  for (let i = 0; i < 4; i += 1) {
    const scrim = page.locator('button[aria-label="Close guide"]').first()
    const dialog = page.locator('[role="dialog"]').first()
    const scrimVisible = await scrim.isVisible().catch(() => false)
    const dialogVisible = await dialog.isVisible().catch(() => false)
    if (!scrimVisible && !dialogVisible) return

    const finish = page
      .getByRole('button', { name: /^(skip guide|skip tour|skip|finish|done|got it)$/i })
      .first()
    if (await finish.isVisible().catch(() => false)) await finish.click({ force: true }).catch(() => {})
    else if (scrimVisible) await scrim.click({ force: true }).catch(() => {})
    else await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(400)
  }
  // Last resort so a stuck overlay can never block the documented workflow.
  await page
    .evaluate(() => {
      document
        .querySelectorAll('[role="presentation"], button[aria-label="Close guide"]')
        .forEach((node) => node.remove())
    })
    .catch(() => {})
}

/** Fills the TMPS pad, imports the workbook and saves. Optionally captures. */
async function buildAssessment(
  page: Page,
  companyId: string,
  config: { year: string; pad: Pad; workbook: string; capture: boolean },
) {
  await goto(page, `/procurement/assessments/new?companyId=${companyId}`)
  await closeOverlays(page)
  await page.locator('#assessment_year').fill(config.year)

  if (config.capture) {
    await shot(page, '09-new-assessment.png', 'New procurement assessment workspace')
    await detail(
      page,
      '09b-assessment-year-detail.png',
      page.locator('#assessment_year'),
      'Assessment year field',
      { minH: 70, maxH: 260, floorW: 860 },
    )
    const howItWorks = page.getByText('How this works').first()
    if (await howItWorks.isVisible().catch(() => false)) {
      await detail(page, '09c-how-this-works-detail.png', howItWorks, 'Workflow reminder panel', {
        minH: 90,
        maxH: 400,
        floorW: 1000,
      })
    }
  }

  const tmpsHeading = page.getByText('TMPS (measured procurement)').first()
  await scrollTo(page, tmpsHeading)
  if (config.capture) {
    await shot(page, '15-tmps-method.png', 'TMPS denominator selection')
    await detail(
      page,
      '15b-tmps-method-detail.png',
      page.getByText('1 · Pick what counts as TMPS').first(),
      'Choosing the TMPS denominator',
      { minH: 200, maxH: 620, floorW: 1200 },
    )
  }

  for (const [key, value] of config.pad.inclusions) await page.locator(`#tmps-${key}`).fill(value)
  for (const [key, value] of config.pad.exclusions) await page.locator(`#tmps-${key}`).fill(value)
  await page.locator('#tmps-tmps_employee_costs').blur()
  await settle(page, 500)

  if (config.capture) {
    await scrollTo(page, page.getByText('2 · Inclusions').first())
    await shot(page, '15c-tmps-inclusions.png', 'Completed TMPS inclusions')
    await detail(
      page,
      '15d-tmps-inclusions-detail.png',
      page.getByText('2 · Inclusions').first(),
      'Inclusion lines and total',
      { minH: 300, maxH: 900, floorW: 1200 },
    )
    await scrollTo(page, page.getByText('3 · Exclusions').first())
    await shot(page, '15e-tmps-exclusions.png', 'Completed TMPS exclusions')
    await detail(
      page,
      '15f-calculated-tmps-detail.png',
      page.getByText('Calculated TMPS from pad (live)').first(),
      'Calculated TMPS total',
      { minH: 70, maxH: 300, floorW: 1000 },
    )
  }

  const importHeading = page.getByText('Upload a procurement workbook').first()
  await scrollTo(page, importHeading)
  if (config.capture) {
    await shot(page, '10-upload-workbook.png', 'Spreadsheet import options')
    await detail(
      page,
      '10b-upload-panel-detail.png',
      page.getByText('Drop a file here or click to browse').first(),
      'Workbook upload panel',
      { minH: 120, maxH: 420, floorW: 1100 },
    )
  }

  await page.locator('input[type="file"]').first().setInputFiles(config.workbook)
  await page.getByText('Column mapping').first().waitFor({ timeout: 120_000 })
  await settle(page, 900)

  if (config.capture) {
    await scrollTo(page, page.getByText('Detected file summary').first())
    await shot(page, '10c-uploaded-file-summary.png', 'Uploaded file and sheet detection')
    await detail(
      page,
      '10d-sheet-selection-detail.png',
      page.getByText('Sheet used for suppliers').first(),
      'Selecting the sheet that holds the supplier register',
      { minH: 150, maxH: 560, floorW: 1200 },
    )
    await detail(
      page,
      '10e-detected-columns-detail.png',
      page.getByText('Columns detected in header row').first(),
      'Columns detected in the header row',
      { minH: 90, maxH: 400, floorW: 1200 },
    )

    const mappingCard = page
      .getByText('Required fields must point at the correct columns')
      .first()
    await scrollTo(page, mappingCard)
    await shot(page, '11-column-mapping.png', 'Column mapping')
    await detail(
      page,
      '11b-column-mapping-fields-detail.png',
      page.locator('table').filter({ hasText: 'Detected column' }).first(),
      'Required and optional field mapping',
      { minH: 320, maxH: 1100, floorW: 1300 },
    )
    await detail(
      page,
      '11c-mapping-status-detail.png',
      page.locator('tr').filter({ hasText: 'Spend amount' }).first(),
      'Mapping status for a required field',
      { minH: 40, maxH: 220, floorW: 1100 },
    )

    const resultPanel = page.getByText('Procurement upload result').first()
    if (await resultPanel.isVisible().catch(() => false)) {
      await scrollTo(page, resultPanel)
      await shot(page, '12-validation-summary.png', 'Import validation summary')
      await detail(
        page,
        '12b-ready-row-count-detail.png',
        resultPanel,
        'Suppliers loaded, mapped spend and estimated points',
        { minH: 100, maxH: 640, floorW: 1200 },
      )
    }

    const warnings = page.getByText('Warnings and notes').first()
    if (await warnings.isVisible().catch(() => false)) {
      await scrollTo(page, warnings)
      await shot(page, '12c-import-warnings.png', 'Import warnings')
      await detail(
        page,
        '12d-skipped-rows-detail.png',
        warnings,
        'Rows skipped during import',
        { minH: 90, maxH: 460, floorW: 1200 },
      )
    }
  }

  await page.getByRole('button', { name: /apply suppliers to this assessment/i }).click()
  await settle(page, 1200)

  if (config.capture) {
    const supplierHeading = page.getByText('Suppliers and B-BBEE spend').first()
    await scrollTo(page, supplierHeading)
    await shot(page, '13-supplier-register.png', 'Supplier register after import')

    const filter = page.locator('#supplier-row-filter')
    if (await filter.isVisible().catch(() => false)) {
      await detail(page, '13b-supplier-search-detail.png', filter, 'Supplier search field', {
        minH: 70,
        maxH: 260,
        floorW: 900,
      })
      await filter.fill('Mzansi')
      await settle(page, 700)
      await shot(page, '13c-supplier-search.png', 'Filtering the supplier register')
    }

    const expandAll = page.getByRole('button', { name: /expand all rows/i }).first()
    if (await expandAll.isVisible().catch(() => false)) {
      await expandAll.click()
      await settle(page, 600)
    }
    await shot(page, '14-edit-supplier.png', 'Editing a supplier record')

    const supplierDetails = page.getByText('Supplier details').first()
    if (await supplierDetails.isVisible().catch(() => false)) {
      await detail(page, '14b-supplier-details-detail.png', supplierDetails, 'Supplier identity fields', {
        minH: 140,
        maxH: 620,
        floorW: 1200,
      })
    }
    const classification = page.getByText('Classification & allocation').first()
    if (await classification.isVisible().catch(() => false)) {
      await detail(
        page,
        '14c-level-recognition-detail.png',
        classification,
        'Supplier type, recognition level and spend',
        { minH: 140, maxH: 620, floorW: 1200 },
      )
    }
    const ownership = page.getByText('Ownership flags').first()
    if (await ownership.isVisible().catch(() => false)) {
      await detail(page, '14d-ownership-detail.png', ownership, 'Ownership fields', {
        minH: 140,
        maxH: 620,
        floorW: 1200,
      })
    }
    const recognition = page.getByText('Contribution buckets').first()
    if (await recognition.isVisible().catch(() => false)) {
      await detail(
        page,
        '14e-recognition-summary-detail.png',
        recognition,
        'Recognition and contribution buckets',
        { minH: 60, maxH: 400, floorW: 1000 },
      )
    }

    const filterReset = page.locator('#supplier-row-filter')
    if (await filterReset.isVisible().catch(() => false)) {
      await filterReset.fill('')
      await settle(page, 600)
    }

    const addRow = page.getByRole('button', { name: /add supplier row/i }).first()
    if (await addRow.isVisible().catch(() => false)) {
      await detail(page, '14f-add-supplier-detail.png', addRow, 'Adding a supplier manually', {
        minH: 110,
        maxH: 420,
        floorW: 1000,
      })
    }

    const paste = page.getByText('Paste from spreadsheet').first()
    if (await paste.isVisible().catch(() => false)) {
      await scrollTo(page, paste)
      await shot(page, '10f-paste-import.png', 'Paste supplier data')
      await detail(page, '10g-paste-import-detail.png', paste, 'Paste area and accepted columns', {
        minH: 150,
        maxH: 700,
        floorW: 1200,
      })
    }

    const liveSummary = page.getByText('Live summary').first()
    if (await liveSummary.isVisible().catch(() => false)) {
      await scrollTo(page, liveSummary)
      await detail(page, '16c-live-summary-detail.png', liveSummary, 'Live summary tiles', {
        minH: 130,
        maxH: 520,
        floorW: 1300,
      })
    }

    const preview = page.getByText('Procurement Score Preview').first()
    await scrollTo(page, preview)
    await shot(page, '16-live-score-preview.png', 'Live procurement score preview')
    await detail(
      page,
      '16b-score-preview-detail.png',
      page.getByText('Measurement Category & Criteria').first(),
      'Category scoring table in the preview',
      { minH: 300, maxH: 900, floorW: 1400 },
    )
  }

  const save = page.getByRole('button', { name: /save procurement assessment/i }).first()
  await scrollTo(page, save, 'center')
  if (config.capture) {
    await shot(page, '16d-before-saving.png', 'Final checks before saving')
    await detail(page, '16e-save-action-detail.png', save, 'Save action', {
      minH: 60,
      maxH: 300,
      floorW: 1000,
    })
  }
  await save.click()
  await page.waitForURL(/\/procurement\/assessments\/[0-9a-f-]{36}$/, { timeout: 180_000 })
  await page.waitForLoadState('networkidle')
  await settle(page, 900)
  return page.url().split('/').pop() as string
}

async function main() {
  const workbook2026 = path.join(DATA, 'Thandeka_Industrial_Supplier_Register_2026.xlsx')
  const workbook2025 = path.join(DATA, 'Thandeka_Industrial_Supplier_Register_2025.xlsx')
  for (const file of [workbook2026, workbook2025]) {
    if (!fs.existsSync(file)) throw new Error(`Demonstration workbook missing: ${file}`)
  }

  const browser: Browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
    acceptDownloads: true,
  })
  await context.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent =
      'nextjs-portal,[data-nextjs-toast],[data-next-badge-root]{display:none!important}*{caret-color:transparent!important}'
    const attach = () => document.head?.appendChild(style)
    if (document.head) attach()
    else document.addEventListener('DOMContentLoaded', attach)
  })
  const page = await context.newPage()
  page.setDefaultTimeout(25_000)

  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${new URL(page.url()).pathname}: ${message.text()}`)
  })

  // ---------------------------------------------------------------- access
  console.log('Section 2 - access and navigation')
  await goto(page, '/scorecard')
  await shot(page, '01-public-page.png', 'Public REAP Scorecard product page')

  await goto(page, '/login')
  await shot(page, '03-login.png', 'Sign-in screen')
  await detail(page, '03b-login-form-detail.png', page.locator('#email'), 'Sign-in fields', {
    minH: 220,
    maxH: 640,
    floorW: 620,
  })

  await page.getByRole('button', { name: 'Create account', exact: true }).first().click()
  await page.getByText('Create your account').first().waitFor()
  await shot(page, '02-registration.png', 'Create an account screen')
  await detail(
    page,
    '02b-registration-detail.png',
    page.getByText('Create your account').first(),
    'Account details required at registration',
    { minH: 320, maxH: 900, floorW: 620 },
  )

  await goto(page, '/login')
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in with email/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 120_000 })
  await page.waitForLoadState('networkidle')
  await settle(page, 1800)

  const tourCard = page.locator('[role="dialog"]').first()
  if (await tourCard.isVisible().catch(() => false)) {
    await shot(page, '04b-guided-walkthrough.png', 'Guided walkthrough on first sign-in')
    await detail(page, '04c-guided-walkthrough-detail.png', tourCard, 'Guided walkthrough step card', {
      minH: 180,
      maxH: 800,
      floorW: 900,
    })
  }
  await closeOverlays(page)
  // Record the guides as seen so later screens are captured without the overlay.
  await page.evaluate(() => {
    let userId: string | null = null
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.includes('auth-token')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) ?? '{}')
          userId = parsed?.user?.id ?? parsed?.currentSession?.user?.id ?? null
        } catch {
          /* ignore */
        }
      }
    }
    for (const guide of [
      'first-time-setup',
      'full-platform',
      'companies',
      'procurement',
      'workbook-upload',
      'export-pdf',
    ]) {
      localStorage.setItem(`reap-tour:${userId}:${guide}:procurement-v1`, '1')
      localStorage.setItem(`reap-tour:anon:${guide}:procurement-v1`, '1')
    }
  })
  await page.reload({ waitUntil: 'networkidle' })
  await settle(page, 600)
  await shot(page, '04-onboarding.png', 'First-time dashboard setup state')
  for (const label of ['Complete your setup', 'Three quick steps', 'Add your first company']) {
    const heading = page.getByText(label).first()
    if (await heading.isVisible().catch(() => false)) {
      await detail(page, '04d-setup-checklist-detail.png', heading, 'First-time setup checklist', {
        minH: 200,
        maxH: 800,
        floorW: 1200,
      })
      break
    }
  }
  await detail(
    page,
    '05b-main-navigation-detail.png',
    page.getByRole('link', { name: 'Companies', exact: true }).first(),
    'Main navigation',
    { minH: 400, maxH: 1080, minW: 180, floorW: 640 },
  )

  const helpAction = page.getByRole('button', { name: /need help/i }).first()
  if (await helpAction.isVisible().catch(() => false)) {
    await helpAction.click().catch(() => {})
    await settle(page, 800)
    await shot(page, '25c-guided-help.png', 'Guided help launcher')
    await detail(
      page,
      '25d-guided-help-detail.png',
      page.getByRole('button', { name: /procurement scorecard guide/i }).first(),
      'Guides available from the header',
      { minH: 200, maxH: 800, floorW: 900 },
    )
    await closeOverlays(page)
  }

  // ------------------------------------------------------------- companies
  console.log('Section 3 - company management')
  await goto(page, '/companies')
  await closeOverlays(page)
  await shot(page, '06-company-directory-empty.png', 'Company directory before any records exist')

  await goto(page, '/companies/new')
  await closeOverlays(page)
  await shot(page, '07-create-company.png', 'New company form')
  await page.locator('#name').fill(COMPANY.name)
  await page.locator('#industry').fill(COMPANY.industry)
  await page.locator('#contact_person').fill(COMPANY.contact)
  await page.locator('#email').fill(COMPANY.email)
  await page.locator('#phone').fill(COMPANY.phone)
  await page.locator('#notes').fill(COMPANY.notes)
  await settle(page)
  await shot(page, '07b-create-company-completed.png', 'Completed company details before saving')
  await detail(page, '07c-required-fields-detail.png', page.locator('#name'), 'Required company fields', {
    minH: 220,
    maxH: 700,
    floorW: 1200,
  })

  await page.getByRole('button', { name: /save company/i }).click()
  await page.waitForURL(/\/companies\/[0-9a-f-]{36}$/, { timeout: 120_000 })
  await page.waitForLoadState('networkidle')
  const companyId = page.url().split('/').pop() as string
  await closeOverlays(page)
  await shot(page, '08-company-profile.png', 'Company profile')
  await detail(
    page,
    '08b-company-details-detail.png',
    page.getByText('Company Details').first(),
    'Stored company details',
    { minH: 180, maxH: 700, floorW: 1200 },
  )

  await goto(page, '/companies')
  await shot(page, '06b-company-directory.png', 'Company directory')
  await detail(
    page,
    '06c-company-record-detail.png',
    page.getByText(COMPANY.name).first(),
    'A single company record',
    { minH: 90, maxH: 420, floorW: 1200 },
  )

  await goto(page, `/companies/${companyId}/edit`)
  await shot(page, '08c-edit-company.png', 'Editing company details')

  // ------------------------------------------------------------ assessment
  console.log('Section 4 - prior-year baseline (no captures)')
  await buildAssessment(page, companyId, {
    year: '2025',
    pad: PAD_2025,
    workbook: workbook2025,
    capture: false,
  })

  console.log('Section 4 - procurement assessment')
  const assessmentId = await buildAssessment(page, companyId, {
    year: '2026',
    pad: PAD_2026,
    workbook: workbook2026,
    capture: true,
  })

  // ------------------------------------------------------ results section
  console.log('Section 5 - results and reporting')
  await shot(page, '17-saved-assessment.png', 'Saved assessment')
  await detail(
    page,
    '17b-assessment-summary-detail.png',
    page.getByText('Procurement assessment summary').first(),
    'Assessment summary',
    { minH: 180, maxH: 700, floorW: 1400 },
  )
  const comparison = page.getByText('Compared to previous assessment').first()
  if (await comparison.isVisible().catch(() => false)) {
    await scrollTo(page, comparison)
    await shot(page, '17c-year-on-year.png', 'Comparison with the previous assessment')
    await detail(page, '17d-year-on-year-detail.png', comparison, 'Year-on-year movement', {
      minH: 180,
      maxH: 700,
      floorW: 1400,
    })
  }

  const exec = page.getByText('Executive scorecard').first()
  await scrollTo(page, exec)
  await shot(page, '18-executive-scorecard.png', 'Executive scorecard')
  await detail(page, '18b-executive-scorecard-detail.png', exec, 'Executive scorecard metrics', {
    minH: 180,
    maxH: 700,
    floorW: 1400,
  })

  const scoreTable = page.getByText('Measurement Category & Criteria').first()
  if (await scoreTable.isVisible().catch(() => false)) {
    await scrollTo(page, scoreTable)
    await shot(page, '18c-scorecard-table.png', 'Saved procurement scorecard table')
    await detail(page, '18d-scorecard-table-detail.png', scoreTable, 'Targets, points and totals', {
      minH: 300,
      maxH: 900,
      floorW: 1400,
    })
  }

  const breakdown = page.getByText('Recognised supplier breakdown').first()
  if (await breakdown.isVisible().catch(() => false)) {
    await scrollTo(page, breakdown)
    await shot(page, '18e-supplier-breakdown.png', 'Recognised supplier breakdown')
    await detail(
      page,
      '18f-supplier-breakdown-detail.png',
      page.locator('table').filter({ hasText: 'Recognised spend' }).first(),
      'Recognised spend per supplier',
      { minH: 260, maxH: 900, floorW: 1400 },
    )
  }

  const categoryPerf = page.getByText('Category performance').first()
  await scrollTo(page, categoryPerf)
  await shot(page, '19-category-performance.png', 'Category performance')
  await detail(
    page,
    '19b-category-performance-detail.png',
    categoryPerf,
    'Targets, achieved percentages and points',
    { minH: 300, maxH: 900, floorW: 1400 },
  )

  const tmpsCalc = page.getByText('TMPS calculation').first()
  if (await tmpsCalc.isVisible().catch(() => false)) {
    await scrollTo(page, tmpsCalc)
    await shot(page, '19c-tmps-calculation.png', 'Saved TMPS calculation')
    await detail(page, '19d-tmps-calculation-detail.png', tmpsCalc, 'Saved denominator and line items', {
      minH: 200,
      maxH: 860,
      floorW: 1400,
    })
  }

  const detailed = page.getByText(/detailed category breakdown|category analysis/i).first()
  if (await detailed.isVisible().catch(() => false)) {
    await scrollTo(page, detailed)
    await shot(page, '19e-detailed-category-analysis.png', 'Detailed category analysis')
    await detail(page, '19f-detailed-category-detail.png', detailed, 'Recognised value against TMPS base', {
      minH: 260,
      maxH: 900,
      floorW: 1400,
    })
  }

  const guidance = page.getByText(/recommended improvement actions/i).first()
  if (await guidance.isVisible().catch(() => false)) {
    await scrollTo(page, guidance)
    await shot(page, '19g-recommendations.png', 'Recommended improvement actions')
    await detail(page, '19h-recommendations-detail.png', guidance, 'Improvement guidance', {
      minH: 180,
      maxH: 800,
      floorW: 1300,
    })
  }

  // Report + PDF
  await goto(page, `/procurement/assessments/${assessmentId}/report`)
  await shot(page, '20-client-report.png', 'Client report')
  await detail(
    page,
    '20b-report-toolbar-detail.png',
    page.getByRole('button', { name: /download pdf/i }).first(),
    'Report toolbar with the PDF action',
    { minH: 90, maxH: 420, floorW: 1200 },
  )
  await shot(page, '20c-client-report-full.png', 'Full client report page', true)

  const downloadPromise = page.waitForEvent('download', { timeout: 240_000 }).catch(() => null)
  await page.getByRole('button', { name: /download pdf/i }).first().click()
  await page.waitForTimeout(900)
  await shot(page, '21-pdf-download.png', 'PDF export in progress')
  const download = await downloadPromise
  if (download) {
    const target = path.resolve('output/training-assets/exports', download.suggestedFilename())
    fs.mkdirSync(path.dirname(target), { recursive: true })
    await download.saveAs(target)
    console.log(`  export   ${download.suggestedFilename()}`)
  }
  await page.waitForTimeout(1500)
  await goto(page, `/procurement/assessments/${assessmentId}/report`)
  await shot(page, '21b-pdf-download-complete.png', 'Report after the PDF has been produced')

  // Reopen and edit
  await goto(page, `/procurement/assessments/${assessmentId}/edit`)
  await closeOverlays(page)
  await shot(page, '22-edit-assessment.png', 'Reopened assessment for editing')
  const editSave = page.getByRole('button', { name: /save changes & recalculate/i }).first()
  if (await editSave.isVisible().catch(() => false)) {
    await detail(page, '22b-recalculate-detail.png', editSave, 'Recalculate after editing', {
      minH: 60,
      maxH: 320,
      floorW: 1000,
    })
  }

  // Dashboard, history, activity, settings
  console.log('Section 6 - operations and support')
  await goto(page, '/dashboard')
  await closeOverlays(page)
  await shot(page, '05-dashboard.png', 'Dashboard with saved work')
  const recent = page.getByText('Recent procurement assessments').first()
  if (await recent.isVisible().catch(() => false)) {
    await scrollTo(page, recent)
    await shot(page, '05c-dashboard-portfolio.png', 'Portfolio metrics and recent assessments')
    await detail(page, '05d-recent-assessments-detail.png', recent, 'Recent assessments', {
      minH: 200,
      maxH: 800,
      floorW: 1300,
    })
  }

  await goto(page, `/companies/${companyId}`)
  await shot(page, '08d-company-assessment-history.png', 'Company assessment history')
  const history = page.getByText('Procurement Assessments').first()
  if (await history.isVisible().catch(() => false)) {
    await detail(page, '08e-assessment-history-detail.png', history, 'Saved assessments for the company', {
      minH: 180,
      maxH: 760,
      floorW: 1300,
    })
  }

  await goto(page, '/dashboard/activity')
  await shot(page, '23-activity.png', 'Activity log')
  await detail(
    page,
    '23b-activity-detail.png',
    page.getByText('Recent activity').first(),
    'Recorded actions',
    { minH: 200, maxH: 800, floorW: 1300 },
  )

  await goto(page, '/settings/profile')
  await shot(page, '24-settings.png', 'Profile settings')
  await detail(
    page,
    '24b-profile-detail.png',
    page.getByText('Public profile').first(),
    'Profile fields',
    { minH: 200, maxH: 800, floorW: 1200 },
  )

  await goto(page, '/settings/help')
  await shot(page, '25-help-centre.png', 'Help centre')
  await detail(
    page,
    '25b-help-guides-detail.png',
    page.getByText('Interactive guides').first(),
    'Interactive guides',
    { minH: 180, maxH: 800, floorW: 1200 },
  )

  await goto(page, '/dashboard')
  await closeOverlays(page)
  const signOut = page.getByRole('button', { name: /sign out/i }).first()
  if (await signOut.isVisible().catch(() => false)) {
    await detail(page, '26-sign-out-detail.png', signOut, 'Secure sign out', {
      minH: 40,
      maxH: 260,
      minW: 100,
      floorW: 640,
    })
  }

  fs.writeFileSync(
    path.join(OUT, '_capture-manifest.json'),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        viewport: '1920x1080 CSS pixels at device scale factor 2',
        company: COMPANY.name,
        assessmentRoute: `/procurement/assessments/${assessmentId}`,
        consoleErrors,
        skipped,
        shots: manifest,
      },
      null,
      2,
    ),
  )

  await browser.close()
  console.log(`\nCaptured ${manifest.length} screenshots into ${OUT}`)
  if (consoleErrors.length) {
    console.log(`Console errors observed: ${consoleErrors.length}`)
    for (const error of consoleErrors.slice(0, 10)) console.log(`  ! ${error}`)
  } else {
    console.log('No console errors observed on documented screens.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
