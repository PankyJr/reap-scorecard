import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url.includes('jzvqyryblsfxlinvoiuf')) throw new Error('staging only')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const email = 'staging.browser@example.com'
  const password = 'StagingBrowser!2026'
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  let userId = list?.users?.find((u) => u.email === email)?.id
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    userId = data.user!.id
  } else {
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
  }

  const { data: company, error: cErr } = await admin
    .from('companies')
    .insert({
      owner_id: userId,
      name: `Workbook Smoke Co ${Date.now()}`,
      contact_person: 'Smoke Contact',
      email: 'workbook-smoke@example.com',
      industry: 'Testing',
      notes: 'Fictional staging workbook smoke company',
    })
    .select('id')
    .single()
  if (cErr) throw cErr

  const { data: assessment, error: aErr } = await admin
    .from('scorecard_assessments')
    .insert({
      company_id: company.id,
      created_by: userId,
      name: `Generic Workbook Smoke ${Date.now()}`,
      measurement_year: 2026,
      status: 'draft',
      scope_mode: 'full',
      selected_elements: [
        'ownership',
        'management_control',
        'skills_development',
        'preferential_procurement',
        'enterprise_development',
        'supplier_development',
        'socio_economic_development',
      ],
      rule_set_key: 'generic-codes-2019-v1',
      workbook_import_status: 'no_workbook_uploaded',
      needs_recalculation: true,
    })
    .select('id')
    .single()
  if (aErr) throw aErr

  const out = { email, password, userId, companyId: company.id, assessmentId: assessment.id }
  fs.writeFileSync('tmp/staging-secrets/browser-login.json', JSON.stringify(out, null, 2))
  fs.writeFileSync(
    'tmp/staging-secrets/browser-assessment.json',
    JSON.stringify({ assessmentId: assessment.id, companyId: company.id }, null, 2),
  )
  console.log(JSON.stringify(out, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
