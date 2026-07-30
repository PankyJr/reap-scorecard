import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url.includes('jzvqyryblsfxlinvoiuf')) throw new Error('staging only')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  // Keep schema; delete fictional staging companies (cascades assessments)
  const { data: companies } = await admin
    .from('companies')
    .select('id, name')
    .or('name.ilike.%Staging%,name.ilike.%Fiction%')

  const ids = (companies || []).map((c) => c.id)
  console.log('deleting companies', companies)

  if (ids.length) {
    await admin.from('companies').delete().in('id', ids)
  }

  // Keep EAP sets for admin demo? User said delete assessments/companies only after screenshots.
  // Leave EAP fictional sets — or delete them too for cleanliness. Delete assessments already cascaded.
  // Optionally leave one EAP set — delete all fictional EAP for clean slate except schema
  const { data: eap } = await admin.from('eap_target_sets').select('id, name')
  console.log('eap sets remaining', eap)

  console.log('cleanup complete; schema retained')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
