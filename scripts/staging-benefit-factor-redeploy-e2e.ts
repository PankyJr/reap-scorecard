/**
 * Staging redeploy regression for Annexe 400(B) / 500(A) benefit-factor correction.
 * Staging Supabase only (jzvqyryblsfxlinvoiuf). Creates fictional data, verifies,
 * then deletes everything.
 *
 * Usage:
 *   set -a; source tmp/staging-secrets/env.staging; set +a
 *   npx tsx scripts/staging-benefit-factor-redeploy-e2e.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  importSedBeneficiaryWorkbook,
  sumValidRecognisedAmount,
} from '../src/lib/scorecard/calculator/elements/socio-economic-development/import'
import { calculateSedBeneficiaryScore } from '../src/lib/scorecard/calculator/rules/sed-beneficiary-v1'
import {
  findBenefitFactor,
  resolveBenefitFactor,
  SED_BENEFIT_FACTORS,
  ESD_BENEFIT_FACTORS,
} from '../src/lib/scorecard/generic/benefit-factors'
import { calculateGenericScorecard } from '../src/lib/scorecard/generic'
import {
  assessmentResultColumns,
  calculationRunRow,
  priorityResultRows,
} from '../src/lib/scorecard/generic/persistence'
import { completeScorecardInputs, grantContribution, sedContribution } from '../src/lib/scorecard/generic/__tests__/fixtures'

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
  const email = `staging.bf.${stamp}@example.com`
  const password = `StagingBf!${String(stamp).slice(-6)}`
  const created: {
    userId?: string
    companyId?: string
    assessmentId?: string
    modularAssessmentId?: string
    contributionIds: string[]
    runIds: string[]
  } = { contributionIds: [], runIds: [] }

  try {
    // --- Matrix invariants (runtime, same code as deployed) ---
    const sedKeys = SED_BENEFIT_FACTORS.map((d) => d.key)
    if (sedKeys.length !== 7) throw new Error(`SED expected 7 rows, got ${sedKeys.length}`)
    for (const excluded of ['interest_free_loan', 'standard_loan', 'guarantee', 'minority_investment']) {
      if (findBenefitFactor('sed', excluded)) throw new Error(`SED unexpectedly includes ${excluded}`)
      const rejected = resolveBenefitFactor({ scope: 'sed', contributionType: excluded, suppliedFactor: null })
      if (rejected.factor != null) throw new Error(`SED must reject ${excluded}`)
    }
    if (findBenefitFactor('sed', 'professional_services_discount')?.factor !== 0.8) {
      throw new Error('SED professional_services_discount must be 80%')
    }
    if (findBenefitFactor('esd', 'guarantee')?.factor !== 0.5) {
      throw new Error('ESD guarantee must be 50%')
    }
    if (!findBenefitFactor('esd', 'standard_loan') || !ESD_BENEFIT_FACTORS.some((d) => d.key === 'guarantee')) {
      throw new Error('ESD must retain loan/guarantee options')
    }

    // --- Book1 / synthetic SED importer regression ---
    const fixturePath = path.join(
      process.cwd(),
      'src/lib/scorecard/calculator/fixtures/sed-beneficiaries-synthetic.xlsx',
    )
    const book1Path = path.join(process.cwd(), 'tmp/full-scorecard-reference/Book1.xlsx')
    const workbookBuffer = fs.existsSync(book1Path)
      ? fs.readFileSync(book1Path)
      : fs.readFileSync(fixturePath)
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer })
    if (preview.validRowCount !== 3) throw new Error(`SED import expected 3 valid rows, got ${preview.validRowCount}`)
    if (preview.platformTotalRecognised !== 420000) {
      throw new Error(`SED recognised total expected 420000, got ${preview.platformTotalRecognised}`)
    }
    const sedScore = calculateSedBeneficiaryScore({
      totalRecognisedAmount: sumValidRecognisedAmount(preview.rows),
      npatAmount: 20_000_000,
      targetPercent: 0.01,
      availablePoints: 5,
    })
    if (sedScore.pointsAchieved !== 5) {
      throw new Error(`SED score expected 5.00, got ${sedScore.pointsAchieved}`)
    }

    // --- Persist assessment with SED contribution using corrected factor ---
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
        name: `Synthetic BF Co ${stamp}`,
        owner_id: created.userId,
        email: 'bf-contact@example.com',
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
        name: `BF Matrix Assessment ${stamp}`,
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
        ...assessmentResultColumns(
          calculateGenericScorecard({
            ...inputs,
            socioEconomicDevelopment: {
              ...inputs.socioEconomicDevelopment,
              records: [
                sedContribution({
                  contributionType: 'professional_services_discount',
                  actualValue: 200_000,
                  blackBeneficiaryPercentage: 1,
                }),
              ],
            },
          }),
        ),
      })
      .select('id')
      .single()
    if (assessmentErr || !assessment) throw assessmentErr ?? new Error('assessment create failed')
    created.assessmentId = assessment.id

    const { data: contrib, error: contribErr } = await admin
      .from('scorecard_contribution_records')
      .insert({
        assessment_id: assessment.id,
        element_key: 'socio_economic_development',
        beneficiary_name: 'Fiction SED Beneficiary',
        contribution_type: 'professional_services_discount',
        actual_value: 200_000,
        supplied_benefit_factor: null,
        black_beneficiary_percentage: 1,
        evidence_provided: true,
        notes: 'staging BF redeploy',
      })
      .select('id, contribution_type, actual_value, supplied_benefit_factor')
      .single()
    if (contribErr || !contrib) throw contribErr ?? new Error('contribution insert failed')
    created.contributionIds.push(contrib.id)

    const { data: edContrib, error: edErr } = await admin
      .from('scorecard_contribution_records')
      .insert({
        assessment_id: assessment.id,
        element_key: 'enterprise_development',
        beneficiary_name: 'Fiction ED Beneficiary',
        contribution_type: 'guarantee',
        actual_value: 100_000,
        supplied_benefit_factor: null,
        beneficiary_black_ownership_percentage: 0.6,
        beneficiary_classification: 'eme',
        evidence_provided: true,
        notes: 'staging ESD guarantee 50%',
      })
      .select('id, contribution_type')
      .single()
    if (edErr || !edContrib) throw edErr ?? new Error('ED contribution insert failed')
    created.contributionIds.push(edContrib.id)

    // Reopen contribution and confirm persistence
    const { data: reopened, error: reopenErr } = await admin
      .from('scorecard_contribution_records')
      .select('contribution_type, actual_value, supplied_benefit_factor, element_key')
      .eq('id', contrib.id)
      .single()
    if (reopenErr || !reopened) throw reopenErr ?? new Error('reopen failed')
    if (reopened.contribution_type !== 'professional_services_discount') {
      throw new Error('persisted contribution type mismatch')
    }

    // Discount path still works
    const failingInputs = completeScorecardInputs({
      supplierDevelopment: { records: [grantContribution({ id: 'sd-1', actualValue: 1 })] },
    })
    const failResult = calculateGenericScorecard(failingInputs)
    if (!failResult.discountApplied || failResult.finalLevel.level === failResult.preliminaryLevel.level) {
      throw new Error('one-level discount regression failed')
    }

    const { data: run, error: runErr } = await admin
      .from('scorecard_calculation_runs')
      .insert(
        calculationRunRow({
          assessmentId: assessment.id,
          userId: created.userId!,
          result: failResult,
          inputs: failingInputs,
          eapTargetSetVersion: '1',
        }),
      )
      .select('id')
      .single()
    if (runErr || !run) throw runErr ?? new Error('run insert failed')
    created.runIds.push(run.id)

    const priorityRows = priorityResultRows({
      assessmentId: assessment.id,
      calculationRunId: run.id,
      result: failResult,
    })
    if (priorityRows.length) {
      const { error: pErr } = await admin.from('scorecard_priority_results').insert(priorityRows)
      if (pErr) throw pErr
    }

    // Modular SED assessment for Book1-style import snapshot persistence
    const { data: modular, error: modularErr } = await admin
      .from('scorecard_assessments')
      .insert({
        company_id: company.id,
        created_by: created.userId,
        name: `Modular SED ${stamp}`,
        measurement_year: 2026,
        status: 'draft',
        scope_mode: 'single',
        selected_elements: ['socio_economic_development'],
        rule_version: 'calculator-v1',
      })
      .select('id')
      .single()
    if (modularErr || !modular) throw modularErr ?? new Error('modular assessment failed')
    created.modularAssessmentId = modular.id

    const { error: elErr } = await admin.from('scorecard_assessment_elements').insert({
      assessment_id: modular.id,
      element_key: 'socio_economic_development',
      status: 'ready_to_calculate',
      upload_filename: fs.existsSync(book1Path) ? 'Book1.xlsx' : 'sed-beneficiaries-synthetic.xlsx',
      sheet_name: preview.sheetName,
      import_snapshot: preview,
      contextual_inputs: { npatAmount: 20_000_000, targetPercent: 0.01, availablePoints: 5 },
      result_snapshot: {
        formulaName: 'sed_beneficiary_proportional_points',
        ruleVersion: 'sed-beneficiary-v1',
        pointsAchieved: sedScore.pointsAchieved,
        pointsAvailable: 5,
        explanation: `Recognised R${preview.platformTotalRecognised}. Benefit factors apply via Annexe 500(A); professional services at discount = 80%.`,
      },
      calculation_rule_version: 'sed-beneficiary-v1',
    })
    if (elErr) throw elErr

    const { data: reEl } = await admin
      .from('scorecard_assessment_elements')
      .select('import_snapshot, result_snapshot, upload_filename')
      .eq('assessment_id', modular.id)
      .eq('element_key', 'socio_economic_development')
      .single()
    const snap = reEl?.import_snapshot as { platformTotalRecognised?: number; validRowCount?: number }
    if (snap?.platformTotalRecognised !== 420000 || snap?.validRowCount !== 3) {
      throw new Error('modular SED snapshot reopen failed')
    }

    console.log(
      JSON.stringify(
        {
          status: 'PASSED',
          stagingRef: STAGING_REF,
          sedKeys,
          sedProfessionalDiscount: 0.8,
          esdGuarantee: 0.5,
          book1ValidRows: preview.validRowCount,
          book1Recognised: preview.platformTotalRecognised,
          book1Score: sedScore.pointsAchieved,
          discountApplied: failResult.discountApplied,
          finalLevel: failResult.finalLevel.level,
          preliminaryLevel: failResult.preliminaryLevel.level,
          contributionPersisted: reopened.contribution_type,
          workbookSource: fs.existsSync(book1Path) ? 'Book1.xlsx' : 'sed-beneficiaries-synthetic.xlsx',
        },
        null,
        2,
      ),
    )
  } finally {
    if (created.assessmentId) {
      await admin.from('scorecard_priority_results').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_calculation_runs').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_contribution_records').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_assessments').delete().eq('id', created.assessmentId)
    }
    if (created.modularAssessmentId) {
      await admin.from('scorecard_assessment_elements').delete().eq('assessment_id', created.modularAssessmentId)
      await admin.from('scorecard_assessments').delete().eq('id', created.modularAssessmentId)
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
