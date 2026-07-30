import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('missing staging env')
  if (url.includes('pmjuiynjelhjlpyohbvk')) throw new Error('refusing production')

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const email = 'staging.browser@example.com'
  const password = 'StagingBrowser!2026'

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = list?.users?.find((u) => u.email === email)
  let userId = existing?.id
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Staging Browser' },
    })
    if (error) throw error
    userId = data.user!.id
  } else {
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
  }

  await admin.from('reap_internal_admins').upsert({ user_id: userId })

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({
      owner_id: userId,
      name: 'Staging Browser Fiction Co',
      contact_person: 'Browser Contact',
      email: 'browser-contact@example.com',
      industry: 'Testing',
      notes: 'Fictional staging browser company',
    })
    .select('id')
    .single()
  if (companyError) throw companyError

  const report = JSON.parse(fs.readFileSync('tmp/staging-secrets/e2e-report.json', 'utf8'))
  const out = { email, password, userId, companyId: company.id, assessmentId: report.assessmentId }
  fs.writeFileSync('tmp/staging-secrets/browser-login.json', JSON.stringify(out, null, 2))
  console.log(JSON.stringify({ email, userId, companyId: company.id }))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
