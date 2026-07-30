#!/usr/bin/env node
/**
 * Release smoke for Flow Through — proven import path + baseline TMPS FormData override.
 */
import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

for (const line of readFileSync(resolve('.env.local'), 'utf8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match && !(match[1].trim() in process.env)) {
    process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
}
if (existsSync('/tmp/reap-smoke-creds.env')) {
  for (const line of readFileSync('/tmp/reap-smoke-creds.env', 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
}

const base = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000'
const email = process.env.REAP_TRAINING_EMAIL
const password = process.env.REAP_TRAINING_PASSWORD
const workbook =
  process.argv[2] || resolve(homedir(), 'Downloads/Procurement test (002).xlsx')
const EXPECTED = 25.9379675409
const BASELINE_TMPS = 4780350716.94

if (!email || !password) {
  console.error('Missing credentials')
  process.exit(1)
}
if (!existsSync(workbook)) {
  console.error(`Missing workbook: ${workbook}`)
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
page.setDefaultTimeout(90000)

const out = {
  signedIn: false,
  companyId: null,
  uploaded: false,
  flowThroughMappedCount: null,
  suppliersApplied: false,
  flowThroughChecked: false,
  assessmentId: null,
  savedScore: null,
  savedTmps: null,
  savedTmpsSource: null,
  flowThroughTrue: null,
  flowThroughFalse: null,
  supplierTotal: null,
  reopenOk: false,
  reportOk: false,
  reportHasFlowThrough: false,
  pdfOk: false,
  pdfBytes: 0,
  pdfHead: null,
  scoreParity: false,
  cleaned: false,
  errors: [],
}

const near = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-8

async function dismissTour() {
  for (let i = 0; i < 5; i++) {
    const skip = page.getByRole('button', { name: /skip|close|got it|done|dismiss/i }).first()
    if (await skip.isVisible().catch(() => false)) {
      await skip.click({ force: true }).catch(() => {})
      await page.waitForTimeout(250)
    } else break
  }
}

try {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.getByLabel(/email/i).first().fill(email)
  await page.getByLabel(/password/i).first().fill(password)
  await page.getByRole('button', { name: /sign in with email/i }).first().click()
  await page.waitForURL(/\/dashboard/, { timeout: 45000 })
  out.signedIn = true
  await dismissTour()

  await page.goto(`${base}/companies/new`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await page.locator('#name').fill('FLOW THROUGH RELEASE TEST 20260730')
  await page.locator('#contact_person').fill('Release Tester')
  await page.locator('#email').fill('flowthrough.release@example.com')
  await page.locator('#phone').fill('011 555 0100')
  await dismissTour()
  await page.getByRole('button', { name: /save company/i }).first().click({ force: true })
  try {
    await page.waitForURL(/\/companies\/[0-9a-f-]{36}/, { timeout: 20000 })
  } catch {
    /* fall through to API create */
  }
  out.companyId = page.url().match(/\/companies\/([0-9a-f-]{36})/)?.[1] ?? null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  if (!out.companyId) {
    const users = await (await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, { headers })).json()
    const list = users.users || users
    const me = (list || []).find((u) => u.email === email)
    const created = await (
      await fetch(`${url}/rest/v1/companies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'FLOW THROUGH RELEASE TEST 20260730',
          contact_person: 'Release Tester',
          email: 'flowthrough.release@example.com',
          phone: '011 555 0100',
          owner_id: me?.id,
        }),
      })
    ).json()
    out.companyId = created?.[0]?.id || created?.id || null
    out.errors.push('company_created_via_api_fallback')
  }
  if (!out.companyId) throw new Error('could not create/open test company')

  await page.goto(
    `${base}/procurement/assessments/new?companyId=${out.companyId}`,
    { waitUntil: 'domcontentloaded' },
  )
  await page.waitForTimeout(2000)
  await dismissTour()
  await page.locator('#assessment_year').fill('2026')

  await page.locator('input[type="file"]').first().setInputFiles(workbook)
  out.uploaded = true

  await page.waitForFunction(
    () => /51%\s*Flow Through:\s*\d+\s*supplier/i.test(document.body.innerText),
    null,
    { timeout: 90000 },
  )
  const pre = await page.locator('body').innerText()
  out.flowThroughMappedCount = Number(
    pre.match(/51%\s*Flow Through:\s*(\d+)\s*supplier/i)?.[1] ?? NaN,
  )

  const applyBtn = page.getByRole('button', {
    name: /apply suppliers to this assessment/i,
  })
  await applyBtn.waitFor({ state: 'visible', timeout: 30000 })
  await applyBtn.click()
  out.suppliersApplied = true
  await page.waitForTimeout(2500)

  const tmpsOption = page.getByRole('button', { name: /use supplier spend as tmps/i }).first()
  if (await tmpsOption.isEnabled().catch(() => false)) {
    await tmpsOption.click()
    await page.waitForTimeout(500)
  }

  const expandAll = page.getByRole('button', { name: /expand all/i }).first()
  if (await expandAll.isVisible().catch(() => false)) {
    await expandAll.click().catch(() => {})
    await page.waitForTimeout(1000)
  }
  const search = page
    .locator('#procurement-supplier-find-anchor input, input[placeholder*="Search" i], input[placeholder*="Find" i]')
    .first()
  if (await search.isVisible().catch(() => false)) {
    await search.fill('IKOPEKELA')
    await page.waitForTimeout(1000)
  }
  const iko = page.getByText(/IKOPEKELA/i).first()
  if (await iko.isVisible().catch(() => false)) {
    await iko.click({ force: true })
    await page.waitForTimeout(700)
  }
  const flowLabel = page.locator('label', { hasText: /51%\s*Flow Through/i }).first()
  if (await flowLabel.isVisible().catch(() => false)) {
    out.flowThroughChecked = await flowLabel.locator('input[type="checkbox"]').isChecked()
  }

  await page.evaluate((tmps) => {
    const apply = () => {
      const source = document.querySelector('input[name="tmps_denominator_source"]')
      const manual = document.querySelector('input[name="tmps_manual_amount"]')
      if (source) source.value = 'manual'
      if (manual) {
        manual.removeAttribute('readonly')
        manual.value = String(tmps)
      }
    }
    apply()
    document.querySelectorAll('form').forEach((form) => {
      form.addEventListener('submit', () => apply(), true)
    })
  }, BASELINE_TMPS)

  const saveBtn = page
    .getByRole('button', { name: /save procurement assessment|save assessment/i })
    .first()
  await saveBtn.waitFor({ state: 'visible', timeout: 15000 })
  if (await saveBtn.isDisabled()) await page.waitForTimeout(4000)
  if (await saveBtn.isDisabled()) throw new Error('Save button remained disabled after supplier apply')
  await saveBtn.click()
  await page.waitForTimeout(8000)

  for (let i = 0; i < 30; i++) {
    const m = page.url().match(/\/procurement\/assessments\/([0-9a-f-]{36})(?:\/|$|\?)/)
    if (m && !page.url().includes('/new')) {
      out.assessmentId = m[1]
      break
    }
    await page.waitForTimeout(1000)
  }
  if (!out.assessmentId) throw new Error(`save failed; url=${page.url()}`)

  const assessment = await (
    await fetch(
      `${url}/rest/v1/procurement_assessments?id=eq.${out.assessmentId}&select=total_score,total_measured_procurement_spend,tmps_denominator_source,tmps_manual_amount`,
      { headers },
    )
  ).json()
  out.savedScore = assessment[0]?.total_score ?? null
  out.savedTmps = assessment[0]?.total_measured_procurement_spend ?? null
  out.savedTmpsSource = assessment[0]?.tmps_denominator_source ?? null

  const parseCount = (h) => Number((h.get('content-range') || '').split('/')[1] || 0)
  out.flowThroughTrue = parseCount(
    (
      await fetch(
        `${url}/rest/v1/procurement_suppliers?assessment_id=eq.${out.assessmentId}&is_51_percent_flow_through=is.true&select=id`,
        { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } },
      )
    ).headers,
  )
  out.flowThroughFalse = parseCount(
    (
      await fetch(
        `${url}/rest/v1/procurement_suppliers?assessment_id=eq.${out.assessmentId}&is_51_percent_flow_through=is.false&select=id`,
        { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } },
      )
    ).headers,
  )
  out.supplierTotal = parseCount(
    (
      await fetch(
        `${url}/rest/v1/procurement_suppliers?assessment_id=eq.${out.assessmentId}&select=id`,
        { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } },
      )
    ).headers,
  )

  await page.goto(`${base}/procurement/assessments/${out.assessmentId}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForTimeout(2500)
  out.reopenOk = page.url().includes(out.assessmentId)

  await page.goto(`${base}/procurement/assessments/${out.assessmentId}/report`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForTimeout(2500)
  out.reportOk = /report/.test(page.url())
  out.reportHasFlowThrough = /flow\s*through/i.test(await page.locator('body').innerText())

  const pdf = await page.request.get(
    `${base}/api/procurement/assessments/${out.assessmentId}/render-pdf`,
    { headers: { Accept: 'application/pdf' }, timeout: 180000 },
  )
  const body = await pdf.body().catch(() => Buffer.alloc(0))
  out.pdfOk = pdf.status() === 200 && body.slice(0, 5).toString() === '%PDF-'
  out.pdfBytes = body.length
  out.pdfHead = body.slice(0, 200).toString()

  out.scoreParity = near(out.savedScore, EXPECTED)

  // Cleanup only when fully green, otherwise leave labelled assessment for diagnosis
  if (out.pdfOk && out.scoreParity) {
    await fetch(`${url}/rest/v1/procurement_results?assessment_id=eq.${out.assessmentId}`, {
      method: 'DELETE',
      headers,
    })
    await fetch(`${url}/rest/v1/procurement_suppliers?assessment_id=eq.${out.assessmentId}`, {
      method: 'DELETE',
      headers,
    })
    await fetch(`${url}/rest/v1/procurement_assessments?id=eq.${out.assessmentId}`, {
      method: 'DELETE',
      headers,
    })
    await fetch(`${url}/rest/v1/companies?id=eq.${out.companyId}`, {
      method: 'DELETE',
      headers,
    })
    out.cleaned = true
  }
} catch (err) {
  out.errors.push(String(err).slice(0, 600))
} finally {
  await browser.close()
}

console.log(JSON.stringify(out, null, 2))
const ok =
  out.signedIn &&
  out.flowThroughMappedCount === 186 &&
  out.flowThroughTrue === 186 &&
  out.supplierTotal === 905 &&
  out.reopenOk &&
  out.reportOk &&
  out.pdfOk &&
  out.scoreParity
process.exit(ok ? 0 : 1)
