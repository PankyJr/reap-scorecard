import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url.includes('jzvqyryblsfxlinvoiuf')) throw new Error('staging only')
  const aid = JSON.parse(fs.readFileSync('tmp/staging-secrets/browser-assessment.json', 'utf8')).assessmentId
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: a } = await admin
    .from('scorecard_assessments')
    .select('status,rule_version,rule_set_key,scope_mode,selected_elements,workbook_import_status,metadata')
    .eq('id', aid)
    .single()
  const { data: els } = await admin
    .from('scorecard_assessment_elements')
    .select('element_key')
    .eq('assessment_id', aid)
  const out = {
    assessment: a,
    elements: (els || []).map((e) => e.element_key).sort(),
  }
  fs.mkdirSync('artifacts/entry-workflow-smoke', { recursive: true })
  fs.writeFileSync('artifacts/entry-workflow-smoke/03-db.json', JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
