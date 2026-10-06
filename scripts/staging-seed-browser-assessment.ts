import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { importSedBeneficiaryWorkbook } from '../src/lib/scorecard/calculator/elements/socio-economic-development/import'
import { socioEconomicDevelopmentAdapter } from '../src/lib/scorecard/calculator/elements/socio-economic-development/adapter'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (url.includes('pmjuiynjelhjlpyohbvk')) throw new Error('prod')
  const login = JSON.parse(fs.readFileSync('tmp/staging-secrets/browser-login.json', 'utf8'))
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const preview = importSedBeneficiaryWorkbook({
    workbookBuffer: fs.readFileSync('tmp/full-scorecard-reference/Book1.xlsx'),
  })
  const calc = socioEconomicDevelopmentAdapter.calculate({
    rows: preview.rows.filter((r) => r.validationStatus === 'valid'),
    contextualInputs: { npatAmount: 42_000_000, targetPercent: 0.01, availablePoints: 5 },
  })
  const { data: assessment, error } = await admin
    .from('scorecard_assessments')
    .insert({
      company_id: login.companyId,
      created_by: login.userId,
      name: 'Browser Staging SED Assessment',
      measurement_year: 2026,
      status: 'draft',
      scope_mode: 'single',
      selected_elements: ['socio_economic_development'],
      rule_version: 'calculator-v1',
      eap_target_snapshot: { name: 'STAGING FICTIONAL EAP 2026', version: 1, year: 2026 },
    })
    .select('id')
    .single()
  if (error) throw error
  await admin.from('scorecard_assessment_elements').insert({
    assessment_id: assessment.id,
    element_key: 'socio_economic_development',
    status: 'calculated',
    upload_filename: 'Book1.xlsx',
    sheet_name: 'SED',
    import_snapshot: preview,
    contextual_inputs: { npatAmount: 42_000_000, targetPercent: 0.01, availablePoints: 5 },
    result_snapshot: calc,
    calculation_rule_version: calc.ruleVersion,
    calculated_at: new Date().toISOString(),
    calculated_by: login.userId,
    needs_recalculation: false,
    warnings: calc.warnings,
  })
  fs.writeFileSync(
    'tmp/staging-secrets/browser-assessment.json',
    JSON.stringify({ assessmentId: assessment.id, companyId: login.companyId }, null, 2),
  )
  console.log(assessment.id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
