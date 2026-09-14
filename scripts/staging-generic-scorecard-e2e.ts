/**
 * Staging data-layer E2E for the Generic Scorecard Engine.
 *
 * Uses only REAP staging Supabase (jzvqyryblsfxlinvoiuf). Creates fictional
 * records, persists inputs, runs the pure engine, stores a calculation run,
 * reopens, verifies discounting, then deletes everything.
 *
 * Usage:
 *   set -a; source tmp/staging-secrets/env.staging; set +a
 *   npx tsx scripts/staging-generic-scorecard-e2e.ts
 */
import { createClient } from '@supabase/supabase-js'
import { calculateGenericScorecard } from '../src/lib/scorecard/generic'
import {
  assessmentResultColumns,
  calculationRunRow,
  priorityResultRows,
} from '../src/lib/scorecard/generic/persistence'
import { completeScorecardInputs, grantContribution } from '../src/lib/scorecard/generic/__tests__/fixtures'

const STAGING_REF = 'jzvqyryblsfxlinvoiuf'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!url.includes(STAGING_REF)) {
  console.error(`Refusing to run: URL must point at staging ${STAGING_REF}`)
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  const stamp = Date.now()
  const email = `staging.generic.${stamp}@example.com`
  const password = `StagingGeneric!${String(stamp).slice(-6)}`
  const created: {
    userId?: string
    companyId?: string
    assessmentId?: string
    contributionIds: string[]
    runIds: string[]
  } = { contributionIds: [], runIds: [] }

  try {
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (userErr || !userData.user) throw userErr ?? new Error('user create failed')
    created.userId = userData.user.id

    const { data: company, error: companyErr } = await admin
      .from('companies')
      .insert({
        name: `Synthetic Generic Co ${stamp}`,
        owner_id: created.userId,
        email: 'generic-contact@example.com',
      })
      .select('id')
      .single()
    if (companyErr || !company) throw companyErr ?? new Error('company create failed')
    created.companyId = company.id

    const inputs = completeScorecardInputs()
    const { data: assessment, error: assessmentErr } = await admin
      .from('scorecard_assessments')
      .insert({
        company_id: company.id,
        created_by: created.userId,
        name: `Generic LE Assessment ${stamp}`,
        measurement_year: 2026,
        status: 'draft',
        scope_mode: 'full',
        selected_elements: [
          'ownership',
          'management_control',
          'skills_development',
          'preferential_procurement',
          'supplier_development',
          'enterprise_development',
          'socio_economic_development',
        ],
        rule_version: 'generic-codes-2019-v1',
        rule_set_key: 'generic-codes-2019-v1',
        applicability_snapshot: inputs.applicability,
        financial_inputs: inputs.financial,
        ownership_inputs: inputs.ownership,
        procurement_snapshot: inputs.procurementSnapshot,
        eap_target_snapshot: {
          name: 'Synthetic EAP',
          version: 1,
          values: [
            { demographic_key: 'african_male', target_value: 43.5 },
            { demographic_key: 'coloured_male', target_value: 4.6 },
            { demographic_key: 'indian_male', target_value: 1.7 },
            { demographic_key: 'african_female', target_value: 37.5 },
            { demographic_key: 'coloured_female', target_value: 4.2 },
            { demographic_key: 'indian_female', target_value: 1.0 },
          ],
        },
        metadata: { product_name: 'Generic Scorecard Calculator', synthetic: true },
      })
      .select('id')
      .single()
    if (assessmentErr || !assessment) throw assessmentErr ?? new Error('assessment create failed')
    created.assessmentId = assessment.id

    const elementRows = [
      'ownership',
      'management_control',
      'skills_development',
      'preferential_procurement',
      'supplier_development',
      'enterprise_development',
      'socio_economic_development',
    ].map((element_key) => ({
      assessment_id: assessment.id,
      element_key,
      status: 'ready_to_calculate',
      contextual_inputs:
        element_key === 'management_control'
          ? inputs.managementControl
          : element_key === 'skills_development'
            ? inputs.skillsDevelopment
            : element_key === 'enterprise_development'
              ? { bonusConfirmed: true, bonusEvidenceProvided: true }
              : element_key === 'supplier_development'
                ? { bonusConfirmed: true, bonusEvidenceProvided: true }
                : {},
    }))
    const { error: elErr } = await admin.from('scorecard_assessment_elements').insert(elementRows)
    if (elErr) throw elErr

    for (const [element_key, record] of [
      ['enterprise_development', grantContribution({ id: 'ed-1', actualValue: 300_000 })],
      ['supplier_development', grantContribution({ id: 'sd-1', actualValue: 600_000 })],
      [
        'socio_economic_development',
        {
          ...grantContribution({ id: 'sed-1', actualValue: 300_000 }),
          beneficiaryClassification: 'individual',
          beneficiaryBlackOwnershipPercentage: null,
          blackBeneficiaryPercentage: 1,
        },
      ],
    ] as const) {
      const { data: row, error } = await admin
        .from('scorecard_contribution_records')
        .insert({
          assessment_id: assessment.id,
          element_key,
          beneficiary_name: record.beneficiaryName,
          beneficiary_classification: record.beneficiaryClassification,
          beneficiary_black_ownership_percentage: record.beneficiaryBlackOwnershipPercentage,
          was_eme_or_qse_at_first_assistance: record.wasEmeOrQseAtFirstAssistance,
          years_since_first_assistance: record.yearsSinceFirstAssistance,
          contribution_type: record.contributionType,
          actual_value: record.actualValue,
          contribution_date: record.contributionDate,
          evidence_provided: record.evidenceProvided,
          black_beneficiary_percentage: record.blackBeneficiaryPercentage,
          notes: record.notes,
          claimed_raw: element_key === 'socio_economic_development' ? 'RAW_CLAIMED_UNSCORED' : null,
        })
        .select('id')
        .single()
      if (error || !row) throw error ?? new Error('contribution insert failed')
      created.contributionIds.push(row.id)
    }

    // First calculation — complete and compliant
    const first = calculateGenericScorecard(inputs)
    if (!first.readiness.complete) {
      throw new Error(`Expected complete readiness, got: ${first.readiness.reasons.join('; ')}`)
    }

    const { data: run1, error: run1Err } = await admin
      .from('scorecard_calculation_runs')
      .insert(
        calculationRunRow({
          assessmentId: assessment.id,
          userId: created.userId,
          result: first,
          inputs,
          eapTargetSetVersion: '1',
        }),
      )
      .select('id')
      .single()
    if (run1Err || !run1) throw run1Err ?? new Error('run1 insert failed')
    created.runIds.push(run1.id)

    await admin.from('scorecard_assessments').update(assessmentResultColumns(first)).eq('id', assessment.id)
    await admin.from('scorecard_priority_results').insert(
      priorityResultRows({ assessmentId: assessment.id, calculationRunId: run1.id, result: first }),
    )

    // Trigger a priority failure and recalculate
    const failingInputs = completeScorecardInputs({
      supplierDevelopment: { records: [grantContribution({ id: 'sd-1', actualValue: 1 })] },
    })
    const failing = calculateGenericScorecard(failingInputs)
    if (!failing.discountApplied) throw new Error('Expected one-level discount on failed SD sub-minimum')

    await admin
      .from('scorecard_contribution_records')
      .update({ actual_value: 1 })
      .eq('assessment_id', assessment.id)
      .eq('element_key', 'supplier_development')

    const { data: run2, error: run2Err } = await admin
      .from('scorecard_calculation_runs')
      .insert(
        calculationRunRow({
          assessmentId: assessment.id,
          userId: created.userId,
          result: failing,
          inputs: failingInputs,
          eapTargetSetVersion: '1',
        }),
      )
      .select('id')
      .single()
    if (run2Err || !run2) throw run2Err ?? new Error('run2 insert failed')
    created.runIds.push(run2.id)

    await admin.from('scorecard_assessments').update(assessmentResultColumns(failing)).eq('id', assessment.id)
    await admin.from('scorecard_priority_results').insert(
      priorityResultRows({ assessmentId: assessment.id, calculationRunId: run2.id, result: failing }),
    )

    // Fix and recalculate again
    const fixed = calculateGenericScorecard(inputs)
    await admin
      .from('scorecard_contribution_records')
      .update({ actual_value: 600_000 })
      .eq('assessment_id', assessment.id)
      .eq('element_key', 'supplier_development')

    const { data: run3, error: run3Err } = await admin
      .from('scorecard_calculation_runs')
      .insert(
        calculationRunRow({
          assessmentId: assessment.id,
          userId: created.userId,
          result: fixed,
          inputs,
          eapTargetSetVersion: '1',
        }),
      )
      .select('id')
      .single()
    if (run3Err || !run3) throw run3Err ?? new Error('run3 insert failed')
    created.runIds.push(run3.id)
    await admin.from('scorecard_assessments').update(assessmentResultColumns(fixed)).eq('id', assessment.id)

    // Reopen / persistence checks
    const { data: reopened } = await admin
      .from('scorecard_assessments')
      .select(
        'rule_set_key,rule_set_version,final_level,preliminary_level,discount_applied,readiness_complete,financial_inputs,ownership_inputs,procurement_snapshot,overall_result_snapshot',
      )
      .eq('id', assessment.id)
      .single()
    if (!reopened?.readiness_complete) throw new Error('Reopened assessment is not complete')
    if (reopened.final_level !== fixed.finalLevel.level) {
      throw new Error(`Reopened final level ${reopened.final_level} != ${fixed.finalLevel.level}`)
    }
    if (!reopened.financial_inputs || !reopened.ownership_inputs || !reopened.procurement_snapshot) {
      throw new Error('Snapshots missing on reopen')
    }

    const { count: runCount } = await admin
      .from('scorecard_calculation_runs')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', assessment.id)
    if (runCount !== 3) throw new Error(`Expected 3 calculation runs, got ${runCount}`)

    const { data: claimed } = await admin
      .from('scorecard_contribution_records')
      .select('claimed_raw')
      .eq('assessment_id', assessment.id)
      .eq('element_key', 'socio_economic_development')
      .maybeSingle()
    if (claimed?.claimed_raw !== 'RAW_CLAIMED_UNSCORED') {
      throw new Error('Claimed column was not preserved as raw unscored input')
    }

    console.log(
      JSON.stringify(
        {
          status: 'PASSED',
          stagingRef: STAGING_REF,
          assessmentId: assessment.id,
          firstLevel: first.finalLevel.level,
          failingLevel: failing.finalLevel.level,
          discountApplied: failing.discountApplied,
          fixedLevel: fixed.finalLevel.level,
          runs: 3,
          claimedPreserved: true,
        },
        null,
        2,
      ),
    )
  } finally {
    // Cleanup in FK-safe order
    if (created.assessmentId) {
      await admin.from('scorecard_priority_results').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_assessment_audit_log').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_assessment_overrides').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_contribution_records').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_calculation_runs').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_assessment_elements').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_assessments').delete().eq('id', created.assessmentId)
    }
    if (created.companyId) {
      await admin.from('companies').delete().eq('id', created.companyId)
    }
    if (created.userId) {
      await admin.auth.admin.deleteUser(created.userId)
    }
    console.log(JSON.stringify({ cleanupCompleted: true, created }, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
