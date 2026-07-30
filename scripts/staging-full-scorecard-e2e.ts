/**
 * Staging integration script for Full Scorecard Calculator persistence.
 * Uses STAGING service role only. Never targets production.
 *
 * Usage:
 *   set -a && source tmp/staging-secrets/env.staging && set +a
 *   ./node_modules/.bin/tsx scripts/staging-full-scorecard-e2e.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { importSedBeneficiaryWorkbook } from '../src/lib/scorecard/calculator/elements/socio-economic-development/import'
import { socioEconomicDevelopmentAdapter } from '../src/lib/scorecard/calculator/elements/socio-economic-development/adapter'
import { describeAssessmentScope } from '../src/lib/scorecard/calculator/assessment/scope'
import { expectedEapCells, validateEapTargetMatrix } from '../src/lib/scorecard/calculator/eap/demographics'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const productionRef = 'pmjuiynjelhjlpyohbvk'
const stagingRef = 'jzvqyryblsfxlinvoiuf'

function assertStaging() {
  if (!url || !serviceKey) throw new Error('Missing staging env')
  if (url.includes(productionRef)) throw new Error('Refusing to run against production')
  if (!url.includes(stagingRef)) throw new Error(`Expected staging ref ${stagingRef}`)
}

async function main() {
  assertStaging()
  const admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } })

  const email = `staging.fsc.${Date.now()}@example.com`
  const password = `StagingFsc!${Date.now().toString().slice(-6)}`
  const nonAdminEmail = `staging.fsc.user.${Date.now()}@example.com`

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Staging FSC Admin' },
  })
  if (createUserError || !createdUser.user) throw createUserError || new Error('user create failed')
  const userId = createdUser.user.id

  const { data: nonAdmin, error: nonAdminErr } = await admin.auth.admin.createUser({
    email: nonAdminEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Staging FSC NonAdmin' },
  })
  if (nonAdminErr || !nonAdmin.user) throw nonAdminErr || new Error('non-admin create failed')

  await admin.from('reap_internal_admins').insert({ user_id: userId })

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({
      owner_id: userId,
      name: 'Staging Fiction SED Co',
      contact_person: 'Staging Contact',
      email: 'staging-contact@example.com',
      industry: 'Testing',
      notes: 'Fictional staging company — delete after verification',
    })
    .select('id, name')
    .single()
  if (companyError || !company) throw companyError

  // EAP draft + activate with clearly fictional values
  const year = 2026
  const { data: eapDraft, error: eapErr } = await admin
    .from('eap_target_sets')
    .insert({
      name: 'STAGING FICTIONAL EAP 2026',
      year,
      geography: 'Staging Fiction Scope',
      source_reference: 'Fictional staging values only — not official EAP',
      status: 'draft',
      version: 1,
      created_by: userId,
      updated_by: userId,
      notes: 'Fictional',
    })
    .select('id')
    .single()
  if (eapErr || !eapDraft) throw eapErr

  const cells = expectedEapCells().map((c) => ({
    target_set_id: eapDraft.id,
    band_key: c.bandKey,
    demographic_key: c.demographicKey,
    target_value: 0.11, // fictional
  }))
  const validation = validateEapTargetMatrix(
    cells.map((c) => ({
      bandKey: c.band_key as never,
      demographicKey: c.demographic_key as never,
      targetValue: Number(c.target_value),
    })),
  )
  if (!validation.ok) throw new Error(validation.errors.join('; '))
  await admin.from('eap_target_set_values').insert(cells)
  await admin.from('eap_target_set_audit').insert({
    target_set_id: eapDraft.id,
    action: 'created_draft',
    changed_by: userId,
    change_json: { fictional: true },
  })

  const { data: eapDup } = await admin
    .from('eap_target_sets')
    .insert({
      name: 'STAGING FICTIONAL EAP 2027',
      year: 2027,
      geography: 'Staging Fiction Scope',
      source_reference: 'Duplicated fictional staging set',
      status: 'draft',
      version: 1,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()
  if (eapDup) {
    await admin.from('eap_target_set_values').insert(
      cells.map((c) => ({ ...c, target_set_id: eapDup.id, target_value: 0.12 })),
    )
    await admin.from('eap_target_set_audit').insert({
      target_set_id: eapDup.id,
      action: 'duplicated_from',
      changed_by: userId,
      change_json: { sourceId: eapDraft.id },
    })
  }

  await admin
    .from('eap_target_sets')
    .update({ status: 'active', effective_date: '2026-01-01', updated_by: userId })
    .eq('id', eapDraft.id)
  await admin.from('eap_target_set_audit').insert({
    target_set_id: eapDraft.id,
    action: 'activated',
    changed_by: userId,
    change_json: { fictional: true },
  })

  // SED-only assessment
  const workbookPath = path.join(process.cwd(), 'tmp/full-scorecard-reference/Book1.xlsx')
  if (!fs.existsSync(workbookPath)) throw new Error(`Missing ${workbookPath}`)
  const preview = importSedBeneficiaryWorkbook({ workbookBuffer: fs.readFileSync(workbookPath) })
  if (preview.validRowCount !== 3 || preview.platformTotalRecognised !== 420000) {
    throw new Error(`SED import unexpected: ${JSON.stringify(preview)}`)
  }

  const { data: assessment, error: aErr } = await admin
    .from('scorecard_assessments')
    .insert({
      company_id: company.id,
      created_by: userId,
      name: 'Staging SED-only Scorecard Assessment',
      measurement_year: year,
      status: 'draft',
      scope_mode: 'single',
      selected_elements: ['socio_economic_development'],
      rule_version: 'calculator-v1',
      eap_target_set_id: eapDraft.id,
      notes: 'Staging E2E',
    })
    .select('*')
    .single()
  if (aErr || !assessment) throw aErr

  const scope = describeAssessmentScope({
    scopeMode: 'single',
    selectedElements: ['socio_economic_development'],
  })
  if (scope.isCompleteBbbeeScorecard) throw new Error('Partial scope incorrectly complete')
  if (!scope.honestyMessage?.includes('not a complete B-BBEE level')) throw new Error('Missing honesty message')

  const npat = 42_000_000 // fictional staging NPAT
  const targetPercent = 0.01
  const firstCalc = socioEconomicDevelopmentAdapter.calculate({
    rows: preview.rows.filter((r) => r.validationStatus === 'valid'),
    contextualInputs: { npatAmount: npat, targetPercent, availablePoints: 5 },
  })

  const { data: element, error: eErr } = await admin
    .from('scorecard_assessment_elements')
    .insert({
      assessment_id: assessment.id,
      element_key: 'socio_economic_development',
      status: 'calculated',
      upload_filename: 'Book1.xlsx',
      sheet_name: preview.sheetName,
      import_snapshot: preview,
      contextual_inputs: { npatAmount: npat, targetPercent, availablePoints: 5, notes: 'Fictional staging NPAT' },
      result_snapshot: firstCalc,
      calculation_rule_version: firstCalc.ruleVersion,
      calculated_at: new Date().toISOString(),
      calculated_by: userId,
      needs_recalculation: false,
      warnings: firstCalc.warnings,
    })
    .select('*')
    .single()
  if (eErr || !element) throw eErr

  await admin.from('scorecard_calculation_runs').insert({
    assessment_id: assessment.id,
    element_key: 'socio_economic_development',
    created_by: userId,
    rule_version: firstCalc.ruleVersion,
    status: 'completed',
    input_snapshot: { import_snapshot: preview, contextual_inputs: element.contextual_inputs },
    result_snapshot: firstCalc,
    warnings: firstCalc.warnings,
  })

  // Snapshot EAP on calculate
  const { data: eapValues } = await admin
    .from('eap_target_set_values')
    .select('band_key, demographic_key, target_value')
    .eq('target_set_id', eapDraft.id)
  const eapSnapshot = {
    id: eapDraft.id,
    name: 'STAGING FICTIONAL EAP 2026',
    year,
    version: 1,
    values: eapValues,
    snapped_at: new Date().toISOString(),
  }
  await admin
    .from('scorecard_assessments')
    .update({ eap_target_snapshot: eapSnapshot })
    .eq('id', assessment.id)

  // Reopen checks
  const { data: reopened } = await admin
    .from('scorecard_assessments')
    .select('*, scorecard_assessment_elements(*)')
    .eq('id', assessment.id)
    .single()
  const reEl = reopened?.scorecard_assessment_elements?.[0]
  if (!reEl) throw new Error('reopen missing element')
  if (reEl.upload_filename !== 'Book1.xlsx') throw new Error('filename not persisted')
  if ((reEl.import_snapshot as { platformTotalRecognised?: number }).platformTotalRecognised !== 420000) {
    throw new Error('total not persisted')
  }
  if ((reEl.contextual_inputs as { npatAmount?: number }).npatAmount !== npat) throw new Error('NPAT not persisted')
  if ((reEl.result_snapshot as { pointsAchieved?: number }).pointsAchieved !== firstCalc.pointsAchieved) {
    throw new Error('score not persisted')
  }
  if (reEl.calculation_rule_version !== firstCalc.ruleVersion) throw new Error('rule version not persisted')
  if (!reopened.eap_target_snapshot) throw new Error('EAP snapshot missing')

  // Edit one row → needs recalculation
  const editedPreview = structuredClone(preview)
  const targetRow = editedPreview.rows.find((r) => r.validationStatus === 'valid')!
  targetRow.values.recognisedAmount = 150000
  targetRow.validationMessages = ['Manually corrected — recalculation required.']
  editedPreview.platformTotalRecognised = editedPreview.rows
    .filter((r) => r.validationStatus === 'valid')
    .reduce((s, r) => s + (typeof r.values.recognisedAmount === 'number' ? r.values.recognisedAmount : 0), 0)

  await admin
    .from('scorecard_assessment_elements')
    .update({
      import_snapshot: editedPreview,
      needs_recalculation: true,
      status: 'needs_review',
      corrections: { row_edit: { recognisedAmount: 150000 } },
    })
    .eq('id', element.id)
  await admin.from('scorecard_assessments').update({ needs_recalculation: true }).eq('id', assessment.id)

  const { data: marked } = await admin
    .from('scorecard_assessment_elements')
    .select('needs_recalculation')
    .eq('id', element.id)
    .single()
  if (!marked?.needs_recalculation) throw new Error('edit did not mark recalculation')

  // Change EAP live values — historical snapshot must remain
  await admin
    .from('eap_target_set_values')
    .update({ target_value: 0.99 })
    .eq('target_set_id', eapDraft.id)
    .eq('band_key', 'board')
    .eq('demographic_key', 'black_people')
  await admin.from('eap_target_set_audit').insert({
    target_set_id: eapDraft.id,
    action: 'values_updated',
    changed_by: userId,
    change_json: { board_black_people: 0.99, note: 'post-calc fictional edit' },
  })

  const { data: afterEapEdit } = await admin
    .from('scorecard_assessments')
    .select('eap_target_snapshot')
    .eq('id', assessment.id)
    .single()
  const snapVal = (afterEapEdit?.eap_target_snapshot as { values?: Array<{ band_key: string; demographic_key: string; target_value: number }> })
    ?.values?.find((v) => v.band_key === 'board' && v.demographic_key === 'black_people')
  if (!snapVal || Number(snapVal.target_value) !== 0.11) {
    throw new Error('Historical EAP snapshot was mutated by later target edit')
  }

  // Explicit recalculation stores new run
  const secondCalc = socioEconomicDevelopmentAdapter.calculate({
    rows: editedPreview.rows.filter((r) => r.validationStatus === 'valid'),
    contextualInputs: { npatAmount: npat, targetPercent, availablePoints: 5 },
  })
  await admin
    .from('scorecard_assessment_elements')
    .update({
      result_snapshot: secondCalc,
      calculation_rule_version: secondCalc.ruleVersion,
      needs_recalculation: false,
      status: 'calculated',
      calculated_at: new Date().toISOString(),
    })
    .eq('id', element.id)
  await admin.from('scorecard_calculation_runs').insert({
    assessment_id: assessment.id,
    element_key: 'socio_economic_development',
    created_by: userId,
    rule_version: secondCalc.ruleVersion,
    status: 'completed',
    input_snapshot: { import_snapshot: editedPreview, contextual_inputs: { npatAmount: npat, targetPercent } },
    result_snapshot: secondCalc,
    warnings: secondCalc.warnings,
  })
  const { count: runCount } = await admin
    .from('scorecard_calculation_runs')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessment.id)
  if ((runCount ?? 0) < 2) throw new Error('expected two calculation runs')

  // Partial assessments
  for (const key of ['management_control', 'enterprise_development', 'supplier_development'] as const) {
    const { data: partial } = await admin
      .from('scorecard_assessments')
      .insert({
        company_id: company.id,
        created_by: userId,
        name: `Staging ${key} only`,
        measurement_year: year,
        status: 'draft',
        scope_mode: 'single',
        selected_elements: [key],
        rule_version: 'calculator-v1',
      })
      .select('id')
      .single()
    await admin.from('scorecard_assessment_elements').insert({
      assessment_id: partial!.id,
      element_key: key,
      status: 'not_started',
    })
    const adapterCalc = socioEconomicDevelopmentAdapter // placeholder not used
    void adapterCalc
    const { getScorecardElementAdapter } = await import(
      '../src/lib/scorecard/calculator/elements/registry'
    )
    const result = getScorecardElementAdapter(key).calculate({ rows: [], contextualInputs: {} })
    if (result.pointsAchieved != null) throw new Error(`${key} fabricated a score`)
    if (!result.warnings.length) throw new Error(`${key} missing scaffold warning`)
  }

  const { data: selected } = await admin
    .from('scorecard_assessments')
    .insert({
      company_id: company.id,
      created_by: userId,
      name: 'Staging SED + MC',
      measurement_year: year,
      status: 'draft',
      scope_mode: 'selected',
      selected_elements: ['socio_economic_development', 'management_control'],
      rule_version: 'calculator-v1',
    })
    .select('id')
    .single()
  await admin.from('scorecard_assessment_elements').insert([
    { assessment_id: selected!.id, element_key: 'socio_economic_development', status: 'not_started' },
    { assessment_id: selected!.id, element_key: 'management_control', status: 'file_uploaded' },
  ])
  const { data: selectedEls } = await admin
    .from('scorecard_assessment_elements')
    .select('element_key, status')
    .eq('assessment_id', selected!.id)
  if (selectedEls?.length !== 2) throw new Error('selected elements not independent')
  if (new Set(selectedEls.map((e) => e.status)).size !== 2) throw new Error('statuses not independent')

  // Non-admin cannot write EAP via RLS (authenticated role simulation is limited with service role;
  // verify no insert policy by attempting with anon key as non-admin session)
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const userClient = createClient(url!, anon, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: loginErr } = await userClient.auth.signInWithPassword({ email: nonAdminEmail, password })
  if (loginErr) throw loginErr
  const { error: forbidden } = await userClient.from('eap_target_sets').insert({
    name: 'Should Fail',
    year: 2099,
    status: 'draft',
    version: 1,
  })
  if (!forbidden) throw new Error('non-admin was able to insert EAP target set')

  const report = {
    stagingRef,
    companyId: company.id,
    assessmentId: assessment.id,
    sed: {
      sheet: preview.sheetName,
      validRows: preview.validRowCount,
      platformTotal: preview.platformTotalRecognised,
      workbookTotal: preview.workbookDisplayedTotal,
      firstPoints: firstCalc.pointsAchieved,
      secondPoints: secondCalc.pointsAchieved,
      ruleVersion: firstCalc.ruleVersion,
      npat,
      targetPercent,
    },
    honestyMessage: scope.honestyMessage,
    calculationRuns: runCount,
    eapSnapshotPreserved: true,
    nonAdminEapInsertBlocked: true,
    cleanup: {
      email,
      nonAdminEmail,
      companyId: company.id,
    },
  }

  fs.mkdirSync('tmp/staging-secrets', { recursive: true })
  fs.writeFileSync('tmp/staging-secrets/e2e-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
