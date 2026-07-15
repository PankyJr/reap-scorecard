/**
 * Local screenshot capture for Aberdare demo (1366×768).
 * Requires: npm run dev with NEXT_PUBLIC_DEV_BYPASS_AUTH=true
 *
 *   NEXT_PUBLIC_DEV_BYPASS_AUTH=true node scripts/capture-aberdare-demo-screenshots.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'artifacts/aberdare-demo')
const workbook = path.join(root, 'client-inputs/aberdare/BBBEE Spend Report.xlsx')
const base = process.env.ABERDARE_DEMO_BASE_URL ?? 'http://localhost:3000'

fs.mkdirSync(outDir, { recursive: true })

async function shot(page, name) {
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: false })
  console.log('saved', path.relative(root, file))
}

async function main() {
  if (!fs.existsSync(workbook)) {
    throw new Error(`Missing workbook: ${workbook}`)
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    defaultViewport: { width: 1366, height: 768 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  page.setDefaultTimeout(60_000)

  await page.goto(`${base}/clients/aberdare/procurement-control-preview`, {
    waitUntil: 'networkidle0',
  })
  await page.waitForSelector('[data-testid="open-live-procurement"]')
  await shot(page, '01-workspace-landing.png')

  // Formal assessment option visible
  await shot(page, '12-formal-assessment-option.png')

  await page.click('[data-testid="open-live-procurement"]')
  await page.waitForSelector('[data-testid="aberdare-upload-panel"]')
  await shot(page, '02-file-upload-state.png')

  const input = await page.$('input[type="file"]')
  await input.uploadFile(workbook)
  await page.waitForSelector('[data-testid="aberdare-position-summary"]', {
    timeout: 90_000,
  })
  await page.waitForFunction(() =>
    document.body.innerText.includes('940 suppliers loaded successfully'),
  )
  await shot(page, '03-successful-940-import.png')
  await shot(page, '04-current-procurement-summary.png')

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
  await shot(page, '05-supplier-table.png')

  const search = await page.$('[data-testid="aberdare-supplier-search"]')
  await search.click({ clickCount: 3 })
  await search.type('ACHINTYA')
  await new Promise((r) => setTimeout(r, 500))
  await shot(page, '06-search-result.png')

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Test change'),
    )
    btn?.click()
  })
  await page.waitForSelector('[data-testid="aberdare-supplier-editor"]')
  await shot(page, '07-supplier-scenario-editor.png')

  await page.evaluate(() => {
    const editor = document.querySelector('[data-testid="aberdare-supplier-editor"]')
    const selects = [...(editor?.querySelectorAll('select') ?? [])]
    const compliance = selects.find((s) =>
      [...s.options].some((o) => o.value === 'non-compliant'),
    )
    if (compliance) {
      compliance.value = 'non-compliant'
      compliance.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const level = selects.find((s) =>
      [...s.options].some((o) => o.value === 'Non-Compliant'),
    )
    if (level) {
      level.value = 'Non-Compliant'
      level.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  await page.click('[data-testid="aberdare-apply-change"]')
  await page.waitForSelector('[data-testid="aberdare-comparison"]')
  await new Promise((r) => setTimeout(r, 600))
  await shot(page, '08-level1-to-non-compliant.png')

  await page.evaluate(() => {
    document
      .querySelector('[data-testid="aberdare-comparison"]')
      ?.scrollIntoView({ block: 'center' })
  })
  await shot(page, '09-current-vs-projected.png')

  await page.evaluate(() => {
    document
      .querySelector('[data-testid="aberdare-position-summary"]')
      ?.scrollIntoView({ block: 'start' })
  })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Review import details'),
    )
    btn?.click()
  })
  await page.waitForSelector('[data-testid="aberdare-import-details"]')
  await shot(page, '10-import-detail-reconciliation.png')

  await page.click('[data-testid="aberdare-open-summary"]')
  await page.waitForSelector('[data-testid="aberdare-scenario-summary"]')
  await shot(page, '11-procurement-scenario-summary.png')
  await page.evaluate(() => {
    const close = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Close'),
    )
    close?.click()
  })

  await page.click('[data-testid="aberdare-reset"]')
  await new Promise((r) => setTimeout(r, 500))
  await shot(page, '13-reset-scenario-state.png')

  await page.setViewport({ width: 390, height: 844 })
  await page.goto(`${base}/clients/aberdare/procurement-control-preview`, {
    waitUntil: 'networkidle0',
  })
  await shot(page, '14-mobile-narrow.png')

  await browser.close()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
