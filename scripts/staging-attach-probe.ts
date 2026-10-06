import fs from 'fs'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const STAGING = 'https://reap-scorecard-staging.netlify.app'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url.includes('jzvqyryblsfxlinvoiuf')) throw new Error('staging only')
  const creds = JSON.parse(fs.readFileSync('tmp/staging-secrets/bongani-reviewer.json', 'utf8')) as {
    email: string
    password: string
  }
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const user = users.users.find((u) => u.email?.toLowerCase() === creds.email.toLowerCase())
  if (!user) throw new Error('user missing')
  const stamp = Date.now()
  const { data: company, error: cErr } = await admin
    .from('companies')
    .insert({
      owner_id: user.id,
      name: `Attach Probe Co ${stamp}`,
      email: 'probe@example.com',
      industry: 'Testing',
    })
    .select('id')
    .single()
  if (cErr || !company) throw new Error(cErr?.message || 'company')

  const { data: assessment, error: aErr } = await admin
    .from('scorecard_assessments')
    .insert({
      company_id: company.id,
      created_by: user.id,
      name: `Attach Probe ${stamp}`,
      measurement_year: 2026,
      status: 'draft',
      scope_mode: 'full',
      selected_elements: ['preferential_procurement'],
      rule_version: 'generic-codes-2019-v1',
      rule_set_key: 'generic-codes-2019-v1',
      workbook_import_status: 'imported',
      needs_recalculation: true,
    })
    .select('id')
    .single()
  if (aErr || !assessment) throw new Error(aErr?.message || 'assessment')

  const { data: proc, error: pErr } = await admin
    .from('procurement_assessments')
    .insert({
      company_id: company.id,
      assessment_year: 2026,
      total_measured_procurement_spend: 100_000_000,
      total_score: 24.5,
      status: 'completed',
      created_by: user.id,
    })
    .select('id')
    .single()
  if (pErr || !proc) throw new Error(pErr?.message || 'proc')

  await admin.from('procurement_suppliers').insert({
    assessment_id: proc.id,
    supplier_name: 'Probe Supplier',
    supplier_type: 'Generic',
    level: 'Level 2',
    recognition_percent: 125,
    value_ex_vat: 100_000_000,
    bbbee_spend: 90_000_000,
    eme_amount: 20_000_000,
    qse_amount: 20_000_000,
    black_owned_amount: 55_000_000,
    black_women_amount: 15_000_000,
    bdgs_amount: 3_000_000,
    is_51_black_owned: true,
    is_30_black_women_owned: true,
    is_51_bdgs: true,
    is_51_percent_flow_through: false,
  })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.on('response', (res) => {
    if (res.request().method() === 'POST' && res.url().includes('scorecards')) {
      console.log('POST', res.status(), res.url().slice(0, 160))
    }
  })

  await page.goto(`${STAGING}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill(creds.email)
  await page.locator('#password').fill(creds.password)
  await page
    .locator('form')
    .filter({ has: page.locator('#password') })
    .evaluate((form) => (form as HTMLFormElement).requestSubmit())
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90_000 })

  await page.goto(`${STAGING}/scorecards/calculator/${assessment.id}/generic/procurement`, {
    waitUntil: 'networkidle',
  })
  // Dismiss guided tour overlay that intercepts clicks
  for (let i = 0; i < 6; i++) {
    const overlay = page.locator('button[aria-label="Close guide"]')
    if ((await overlay.count()) === 0) break
    await overlay.first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.locator('select[name="procurementAssessmentId"]').selectOption({ index: 1 })
  await page.getByRole('button', { name: /^Attach assessment$/i }).click({ force: true })
  await page.waitForURL(/attached=1/, { timeout: 60_000 }).catch(() => {})
  await page.waitForTimeout(2000)
  await page.screenshot({
    path: 'artifacts/staging-review/preprod-acceptance/attach-probe.png',
    fullPage: true,
  })
  const text = await page.locator('body').innerText()
  const { data: row } = await admin
    .from('scorecard_assessments')
    .select('procurement_snapshot')
    .eq('id', assessment.id)
    .single()

  console.log(
    JSON.stringify(
      {
        url: page.url(),
        attachedUi: /Attached Procurement Assessment/i.test(text),
        base25: /Base points:\s*[\d.]+\s*\/\s*25/i.test(text),
        errorFlash: (text.match(/Could not|error[^\n]{0,100}/i) || [])[0] || null,
        dbHasSnapshot: Boolean(row?.procurement_snapshot),
      },
      null,
      2,
    ),
  )

  await admin.from('scorecard_assessments').delete().eq('id', assessment.id)
  await admin.from('procurement_suppliers').delete().eq('assessment_id', proc.id)
  await admin.from('procurement_assessments').delete().eq('id', proc.id)
  await admin.from('companies').delete().eq('id', company.id)
  await browser.close()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
