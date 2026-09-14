import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { strongProcurementSnapshot } from '../src/lib/scorecard/generic/__tests__/fixtures'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url.includes('jzvqyryblsfxlinvoiuf')) throw new Error('staging only')
  const aid = JSON.parse(fs.readFileSync('tmp/staging-secrets/browser-assessment.json', 'utf8')).assessmentId
  const login = JSON.parse(fs.readFileSync('tmp/staging-secrets/browser-login.json', 'utf8'))
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const snap = {
    ...strongProcurementSnapshot(),
    sourceAssessmentId: '00000000-0000-4000-8000-000000000088',
    sourceAssessmentName: 'Synthetic Formal Procurement Smoke',
    capturedAt: new Date().toISOString(),
    capturedBy: login.userId,
  }
  const { error } = await admin
    .from('scorecard_assessments')
    .update({
      procurement_snapshot: snap,
      needs_recalculation: true,
    })
    .eq('id', aid)
  if (error) throw error
  console.log(JSON.stringify({ ok: true, assessmentId: aid }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
