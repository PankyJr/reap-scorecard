import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url.includes('jzvqyryblsfxlinvoiuf')) throw new Error('staging only')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  // Find Proc TMPS Verify Co
  const { data: companies } = await admin
    .from('companies')
    .select('id, name, owner_id')
    .ilike('name', '%Proc TMPS Verify%')
  console.log('companies', companies)

  // Find a real user to use as created_by for probe
  const company = companies?.[0]
  if (!company) {
    console.log('company not found')
  }

  // Probe insert with real company if present
  if (company) {
    const insert = await admin
      .from('scorecard_assessments')
      .insert({
        company_id: company.id,
        created_by: company.owner_id,
        name: `Probe Generic ${Date.now()}`,
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
        rule_version: 'generic-codes-2019-v1',
        rule_set_key: 'generic-codes-2019-v1',
        workbook_import_status: 'no_workbook_uploaded',
        needs_recalculation: true,
        notes: 'probe',
        metadata: { product_name: 'REAP Generic Scorecard Calculator', probe: true },
      })
      .select('id')
      .single()
    console.log('FULL_INSERT', JSON.stringify(insert, null, 2))

    if (insert.data?.id) {
      const els = await admin.from('scorecard_assessment_elements').insert(
        [
          'ownership',
          'management_control',
          'skills_development',
          'preferential_procurement',
          'enterprise_development',
          'supplier_development',
          'socio_economic_development',
        ].map((element_key) => ({
          assessment_id: insert.data.id,
          element_key,
          status: 'not_started',
          contextual_inputs: {},
        })),
      )
      console.log('ELEMENTS_INSERT', JSON.stringify(els, null, 2))
      await admin.from('scorecard_assessment_elements').delete().eq('assessment_id', insert.data.id)
      await admin.from('scorecard_assessments').delete().eq('id', insert.data.id)
      console.log('cleaned probe')
    }
  }

  // Probe without workbook_import_status
  if (company) {
    const insert2 = await admin
      .from('scorecard_assessments')
      .insert({
        company_id: company.id,
        created_by: company.owner_id,
        name: `Probe Minimal ${Date.now()}`,
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
        rule_version: 'generic-codes-2019-v1',
        rule_set_key: 'generic-codes-2019-v1',
        needs_recalculation: true,
        metadata: { product_name: 'REAP Generic Scorecard Calculator', probe: true },
      })
      .select('id')
      .single()
    console.log('MINIMAL_INSERT', JSON.stringify(insert2, null, 2))
    if (insert2.data?.id) {
      await admin.from('scorecard_assessments').delete().eq('id', insert2.data.id)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
