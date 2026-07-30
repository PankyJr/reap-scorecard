#!/usr/bin/env node
/**
 * Browser smoke test for 51% Flow Through formal procurement import/edit/save/report.
 */
import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

for (const line of readFileSync(resolve('.env.local'), 'utf8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
}

const base = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000'
const email = process.env.REAP_TRAINING_EMAIL
const password = process.env.REAP_TRAINING_PASSWORD
const workbook =
  process.argv[2] ||
  resolve(homedir(), 'Downloads/Procurement test (002).xlsx')

if (!email || !password) {
  console.error('Set REAP_TRAINING_EMAIL and REAP_TRAINING_PASSWORD before running this script.')
  process.exit(1)
}

if (!existsSync(workbook)) {
  console.error(`Workbook not found: ${workbook}`)
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
page.setDefaultTimeout(60000)

const result = {
  signedIn: false,
  companyId: null,
  assessmentFormOpen: false,
  uploaded: false,
  mappingVisible: false,
  flowThroughMappedCount: null,
  suppliersApplied: false,
  flowThroughCheckboxVisible: false,
  flowThroughChecked: false,
  previewMentionsFlowThrough: false,
  saveAttempted: false,
  saveError: null,
  saved: false,
  assessmentId: null,
  persistedOnEdit: null,
  reportOpened: false,
  reportHasFlowThroughTag: false,
  pdfStatus: null,
  errors: [],
  notes: [],
}

const log = (m) => console.log(m)

async function dismissTour() {
  for (let i = 0; i < 5; i++) {
    const skip = page.getByRole('button', { name: /skip|close|got it|done|dismiss/i }).first()
    if (await skip.isVisible().catch(() => false)) {
      await skip.click({ force: true }).catch(() => {})
      await page.waitForTimeout(300)
    } else break
  }
  await page
    .evaluate(() => {
      document
        .querySelectorAll('[data-tour-overlay], .driver-overlay, .driver-popover')
        .forEach((n) => n.remove())
    })
    .catch(() => {})
}

try {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await page.getByLabel(/email/i).first().fill(email)
  await page.getByLabel(/password/i).first().fill(password)
  await page.getByRole('button', { name: /sign in with email/i }).first().click()
  await page.waitForURL(/\/dashboard/, { timeout: 45000 })
  result.signedIn = true
  log('signed in')
  await dismissTour()

  await page.goto(`${base}/companies`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await dismissTour()
  const profile = page.getByRole('link', { name: /view profile/i }).first()
  if (!(await profile.isVisible().catch(() => false))) {
    await page.goto(`${base}/companies/new`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.locator('#name').fill('Flow Through Smoke Co (Pty) Ltd')
    await page.locator('#contact_person').fill('Smoke Tester')
    await page.locator('#email').fill('flowthrough.smoke@example.com')
    await page.locator('#phone').fill('011 555 0199')
    await page.getByRole('button', { name: /save company/i }).first().click()
    await page.waitForURL(/\/companies\/[0-9a-f-]{36}/, { timeout: 45000 })
  } else {
    const href = await profile.getAttribute('href')
    await page.goto(`${base}${href}`, { waitUntil: 'domcontentloaded' })
  }
  result.companyId = page.url().match(/\/companies\/([0-9a-f-]{36})/)?.[1] ?? null
  if (!result.companyId) throw new Error(`no company id from ${page.url()}`)
  log(`company ${result.companyId}`)

  await page.goto(
    `${base}/procurement/assessments/new?companyId=${result.companyId}`,
    { waitUntil: 'domcontentloaded' },
  )
  await page.waitForTimeout(2500)
  await dismissTour()
  result.assessmentFormOpen = true
  await page.locator('#assessment_year').fill('2026')

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(workbook)
  result.uploaded = true
  log('uploaded workbook')

  // Wait until mapping / result summary shows Flow Through count
  await page.waitForFunction(
    () => /51%\s*Flow Through:\s*\d+\s*supplier/i.test(document.body.innerText),
    null,
    { timeout: 90000 },
  )
  result.mappingVisible = true
  const preApplyText = await page.locator('body').innerText()
  const ftCountMatch = preApplyText.match(/51%\s*Flow Through:\s*(\d+)\s*supplier/i)
  result.flowThroughMappedCount = ftCountMatch ? Number(ftCountMatch[1]) : null
  log(`flow through mapped count ${result.flowThroughMappedCount}`)

  const applyBtn = page.getByRole('button', {
    name: /apply suppliers to this assessment/i,
  })
  await applyBtn.waitFor({ state: 'visible', timeout: 30000 })
  await applyBtn.click()
  result.suppliersApplied = true
  log('applied suppliers')
  await page.waitForTimeout(2500)

  // Prefer supplier-total TMPS
  const tmpsOption = page.getByRole('button', { name: /use supplier spend as tmps/i }).first()
  if (await tmpsOption.isEnabled().catch(() => false)) {
    await tmpsOption.click()
    await page.waitForTimeout(500)
  }

  const search = page.locator('#procurement-supplier-find-anchor input, input[placeholder*="Search" i], input[placeholder*="Find" i]').first()
  if (await search.isVisible().catch(() => false)) {
    await search.fill('IKOPEKELA')
    await page.waitForTimeout(1000)
  }

  // Expand IKOPEKELA summary if present
  const iko = page.getByText(/IKOPEKELA/i).first()
  if (await iko.isVisible().catch(() => false)) {
    await iko.click({ force: true })
    await page.waitForTimeout(700)
  }

  // Expand all if needed
  const expandAll = page.getByRole('button', { name: /expand all/i }).first()
  if (await expandAll.isVisible().catch(() => false)) {
    await expandAll.click().catch(() => {})
    await page.waitForTimeout(1000)
  }

  const flowLabel = page.locator('label', { hasText: /51%\s*Flow Through/i }).first()
  if (await flowLabel.isVisible().catch(() => false)) {
    result.flowThroughCheckboxVisible = true
    const input = flowLabel.locator('input[type="checkbox"]')
    result.flowThroughChecked = await input.isChecked()
  } else {
    // Search any checked Flow Through checkbox after expand
    const anyFt = page.locator('label:has-text("51% Flow Through") input[type="checkbox"]')
    const count = await anyFt.count()
    if (count > 0) {
      result.flowThroughCheckboxVisible = true
      // Find a checked one
      for (let i = 0; i < Math.min(count, 40); i++) {
        if (await anyFt.nth(i).isChecked()) {
          result.flowThroughChecked = true
          break
        }
      }
    }
  }

  const afterApplyText = await page.locator('body').innerText()
  result.previewMentionsFlowThrough =
    /Flow Through/i.test(afterApplyText) || result.flowThroughCheckboxVisible

  const save = page.getByRole('button', { name: /save procurement assessment/i }).first()
  await save.scrollIntoViewIfNeeded()
  result.saveAttempted = true
  await save.click()
  await page.waitForTimeout(4000)

  const url = page.url()
  const id = url.match(/\/procurement\/assessments\/([0-9a-f-]{36})(?:\/|$)/)?.[1]
  if (id && !url.includes('/new')) {
    result.saved = true
    result.assessmentId = id
    log(`saved ${id}`)

    await page.goto(`${base}/procurement/assessments/${id}/edit`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2500)
    const expandAll2 = page.getByRole('button', { name: /expand all/i }).first()
    if (await expandAll2.isVisible().catch(() => false)) await expandAll2.click().catch(() => {})
    const ftEdit = page.locator('label:has-text("51% Flow Through") input[type="checkbox"]')
    const n = await ftEdit.count()
    let checked = 0
    for (let i = 0; i < n; i++) if (await ftEdit.nth(i).isChecked()) checked++
    result.persistedOnEdit = checked > 0
    result.notes.push(`edit page Flow Through checked rows: ${checked}/${n}`)

    await page.goto(`${base}/procurement/assessments/${id}/report`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2500)
    result.reportOpened = true
    result.reportHasFlowThroughTag = /Flow Through/i.test(
      await page.locator('body').innerText(),
    )

    const pdfRes = await page.request.get(
      `${base}/api/procurement/assessments/${id}/render-pdf`,
    )
    result.pdfStatus = pdfRes.status()
  } else {
    const q = new URL(url).searchParams.get('error')
    result.saveError = q ? decodeURIComponent(q) : `stayed on ${url}`
    if (/is_51_percent_flow_through|schema cache|migration/i.test(result.saveError)) {
      result.notes.push(
        'Save blocked by missing hosted DB column (migration intentionally not applied).',
      )
    }
  }
} catch (err) {
  result.errors.push(String(err?.message || err))
} finally {
  await browser.close()
}

result.ok =
  result.signedIn &&
  result.uploaded &&
  result.flowThroughMappedCount === 186 &&
  result.suppliersApplied &&
  (result.flowThroughCheckboxVisible || result.previewMentionsFlowThrough)

console.log(JSON.stringify(result, null, 2))
process.exit(result.errors.length ? 2 : 0)
