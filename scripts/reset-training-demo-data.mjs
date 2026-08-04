// Clears the fictional demonstration records owned by the training account so a
// screenshot capture run always starts from a clean, repeatable state.
// Development utility - not shipped in the client training package.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

for (const line of readFileSync(resolve('.env.local'), 'utf8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
}

const email = process.env.REAP_TRAINING_EMAIL ?? 'reap.training.demo@example.com'
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

let user = null
for (let page = 1; page <= 10 && !user; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw error
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase()) ?? null
  if (data.users.length < 200) break
}
if (!user) throw new Error(`Training account not found: ${email}`)

const { data: companies, error: companiesError } = await admin
  .from('companies')
  .select('id')
  .eq('owner_id', user.id)
if (companiesError) throw companiesError
const companyIds = (companies ?? []).map((company) => company.id)

if (companyIds.length) {
  const { data: assessments } = await admin
    .from('procurement_assessments')
    .select('id')
    .in('company_id', companyIds)
  const assessmentIds = (assessments ?? []).map((assessment) => assessment.id)

  if (assessmentIds.length) {
    await admin.from('procurement_suppliers').delete().in('assessment_id', assessmentIds)
    await admin.from('procurement_results').delete().in('assessment_id', assessmentIds)
    await admin.from('procurement_assessments').delete().in('id', assessmentIds)
  }
  await admin.from('companies').delete().in('id', companyIds)
}

await admin.from('audit_log').delete().eq('actor_id', user.id)

console.log(
  JSON.stringify({ ok: true, email, companiesRemoved: companyIds.length }),
)
