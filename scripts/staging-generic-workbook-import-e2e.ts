/**
 * Staging E2E: Generic full-workbook analyse → confirm import → procure attach → calculate.
 * Staging Supabase only (jzvqyryblsfxlinvoiuf). Deletes all created records.
 *
 * Usage:
 *   set -a; source tmp/staging-secrets/env.staging; set +a
 *   npx tsx scripts/staging-generic-workbook-import-e2e.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  analyseGenericScorecardWorkbook,
  applyWorkbookImportDecisions,
  defaultDecisionsForAnalysis,
} from '../src/lib/scorecard/generic/workbook-import'
import { calculateGenericScorecard } from '../src/lib/scorecard/generic'
import {
  assessmentResultColumns,
  buildGenericInputs,
  calculationRunRow,
  type StoredAssessmentRow,
  type StoredContributionRow,
  type StoredElementRow,
} from '../src/lib/scorecard/generic/persistence'
import { EMPTY_FINANCIAL_INPUTS } from '../src/lib/scorecard/generic/financial'
import { EMPTY_OWNERSHIP_INPUTS } from '../src/lib/scorecard/generic/elements/ownership'
import { EMPTY_MANAGEMENT_CONTROL_INPUTS } from '../src/lib/scorecard/generic/elements/management-control'
import { EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '../src/lib/scorecard/generic/elements/skills-development'
import { strongProcurementSnapshot } from '../src/lib/scorecard/generic/__tests__/fixtures'

const STAGING_REF = 'jzvqyryblsfxlinvoiuf'
const WORKBOOK = join(process.cwd(), 'tmp/full-scorecard-reference/Generic-Scorecard Calculator.xlsx')
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function main() {
  const stamp = Date.now()
  const email = `staging.workbook.${stamp}@example.com`
  const password = `StagingWb!${String(stamp).slice(-6)}`
  const created: {
    userId?: string
    companyId?: string
    assessmentId?: string
    runIds: string[]
  } = { runIds: [] }

  try {
    const buffer = readFileSync(WORKBOOK)
    const analysis = analyseGenericScorecardWorkbook({
      filename: 'Generic-Scorecard Calculator.xlsx',
      buffer,
    })
    assert(analysis.sheetCount === 22, `expected 22 sheets, got ${analysis.sheetCount}`)
    assert(analysis.recognisedSheetCount >= 20, 'expected most sheets recognised')
    assert(
      !analysis.elements.some((element) => element.elementKey === ('preferential_procurement' as never)),
      'procurement must not appear as an importable element',
    )
    assert(/Formal Procurement Assessment/.test(analysis.procurementNotice), 'procurement notice required')

    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    assert(!userErr && userData.user, `user create failed: ${userErr?.message}`)
    created.userId = userData.user!.id

    const { data: company, error: companyErr } = await admin
      .from('companies')
      .insert({
        name: `Synthetic Workbook Co ${stamp}`,
        owner_id: created.userId,
        email: 'workbook-contact@example.com',
      })
      .select('id')
      .single()
    assert(!companyErr && company, `company create failed: ${companyErr?.message}`)
    created.companyId = company!.id

    const { data: assessment, error: assessmentErr } = await admin
      .from('scorecard_assessments')
      .insert({
        company_id: company!.id,
        created_by: created.userId,
        name: `Workbook Import Assessment ${stamp}`,
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
        workbook_import_status: 'review_required',
        workbook_filename: analysis.filename,
        workbook_checksum_sha256: analysis.checksumSha256,
        workbook_file_size: analysis.fileSize,
        workbook_import_preview: analysis,
        needs_recalculation: true,
      })
      .select('id')
      .single()
    assert(!assessmentErr && assessment, `assessment create failed: ${assessmentErr?.message}`)
    created.assessmentId = assessment!.id

    const { count: beforeCount } = await admin
      .from('scorecard_assessment_elements')
      .select('*', { count: 'exact', head: true })
      .eq('assessment_id', assessment!.id)
    assert((beforeCount ?? 0) === 0, 'no element data should exist before confirm')

    const decisions = {
      ...defaultDecisionsForAnalysis(analysis, {}),
      ownership: 'import' as const,
      management_control: 'import' as const,
      financial: 'import' as const,
      skills_development: 'import' as const,
      enterprise_development: 'import' as const,
      supplier_development: 'import' as const,
      socio_economic_development: 'import' as const,
    }
    const applied = applyWorkbookImportDecisions({
      request: {
        analysis,
        decisions,
        acceptWarnings: true,
        acknowledgeProcurementSeparate: true,
        acknowledgeMissingFields: true,
      },
      existing: {
        financial: EMPTY_FINANCIAL_INPUTS,
        ownership: EMPTY_OWNERSHIP_INPUTS,
        managementControl: EMPTY_MANAGEMENT_CONTROL_INPUTS,
        managementControlImportSnapshot: null,
        skillsDevelopment: EMPTY_SKILLS_DEVELOPMENT_INPUTS,
        enterpriseDevelopmentContributions: [],
        supplierDevelopmentContributions: [],
        socioEconomicDevelopmentContributions: [],
        sedImportSnapshot: null,
      },
    })
    assert(applied.ownership != null, 'ownership should import')
    assert(applied.appliedElements.includes('ownership'), 'ownership applied')

    const now = new Date().toISOString()
    const procurementSnapshot = {
      ...strongProcurementSnapshot(),
      sourceAssessmentId: '00000000-0000-4000-8000-000000000099',
      sourceAssessmentName: 'Synthetic Formal Procurement',
      capturedAt: now,
      capturedBy: created.userId,
    }

    await admin
      .from('scorecard_assessments')
      .update({
        ownership_inputs: applied.ownership,
        financial_inputs: applied.financial ?? EMPTY_FINANCIAL_INPUTS,
        workbook_import_status: 'imported_with_warnings',
        workbook_import_snapshot: { ...analysis, decisions, confirmedAt: now },
        workbook_import_preview: null,
        workbook_imported_at: now,
        workbook_imported_by: created.userId,
        needs_recalculation: true,
        procurement_snapshot: procurementSnapshot,
      })
      .eq('id', assessment!.id)

    if (applied.managementControl || applied.managementControlImportSnapshot) {
      await admin.from('scorecard_assessment_elements').upsert(
        {
          assessment_id: assessment!.id,
          element_key: 'management_control',
          status: 'needs_review',
          contextual_inputs: applied.managementControl ?? EMPTY_MANAGEMENT_CONTROL_INPUTS,
          import_snapshot: applied.managementControlImportSnapshot,
          upload_filename: analysis.filename,
          needs_recalculation: true,
        },
        { onConflict: 'assessment_id,element_key' },
      )
    }

    if (applied.skillsDevelopment) {
      await admin.from('scorecard_assessment_elements').upsert(
        {
          assessment_id: assessment!.id,
          element_key: 'skills_development',
          status: 'needs_review',
          contextual_inputs: applied.skillsDevelopment,
          upload_filename: analysis.filename,
          needs_recalculation: true,
        },
        { onConflict: 'assessment_id,element_key' },
      )
    }

    for (const [elementKey, records] of [
      ['enterprise_development', applied.enterpriseDevelopmentContributions],
      ['supplier_development', applied.supplierDevelopmentContributions],
      ['socio_economic_development', applied.socioEconomicDevelopmentContributions],
    ] as const) {
      if (!records?.length) continue
      await admin.from('scorecard_contribution_records').insert(
        records.map((record) => ({
          assessment_id: assessment!.id,
          element_key: elementKey,
          beneficiary_name: record.beneficiaryName,
          beneficiary_classification: record.beneficiaryClassification,
          beneficiary_black_ownership_percentage: record.beneficiaryBlackOwnershipPercentage,
          was_eme_or_qse_at_first_assistance: record.wasEmeOrQseAtFirstAssistance,
          years_since_first_assistance: record.yearsSinceFirstAssistance,
          contribution_type: record.contributionType,
          actual_value: record.actualValue,
          supplied_benefit_factor: record.suppliedBenefitFactor,
          contribution_date: record.contributionDate,
          evidence_provided: record.evidenceProvided,
          notes: record.notes,
          black_beneficiary_percentage: record.blackBeneficiaryPercentage,
        })),
      )
    }

    const { data: reopened } = await admin
      .from('scorecard_assessments')
      .select('*')
      .eq('id', assessment!.id)
      .single()
    assert(reopened?.workbook_import_snapshot, 'import snapshot must persist on reopen')
    assert(reopened?.workbook_import_preview == null, 'preview must clear after confirm')

    const { data: elements } = await admin
      .from('scorecard_assessment_elements')
      .select('*')
      .eq('assessment_id', assessment!.id)
    const { data: contributions } = await admin
      .from('scorecard_contribution_records')
      .select('*')
      .eq('assessment_id', assessment!.id)

    const inputs = buildGenericInputs({
      assessment: reopened as unknown as StoredAssessmentRow,
      elements: (elements ?? []) as unknown as StoredElementRow[],
      contributions: (contributions ?? []) as unknown as StoredContributionRow[],
    })
    assert(
      inputs.procurementSnapshot?.sourceAssessmentId === procurementSnapshot.sourceAssessmentId,
      'procurement from formal snapshot only',
    )

    await admin
      .from('scorecard_assessments')
      .update({
        ownership_inputs: {
          ...(reopened!.ownership_inputs as object),
          netValuePercentage: 0.3,
        },
        needs_recalculation: true,
        workbook_import_status: 'needs_recalculation',
      })
      .eq('id', assessment!.id)

    const { data: corrected } = await admin
      .from('scorecard_assessments')
      .select('*')
      .eq('id', assessment!.id)
      .single()
    assert(corrected?.needs_recalculation === true, 'needs_recalculation after correction')
    assert(corrected?.workbook_import_status === 'needs_recalculation', 'import status after correction')
    assert(corrected?.workbook_import_snapshot, 'import snapshot preserved after correction')

    const { data: elements2 } = await admin
      .from('scorecard_assessment_elements')
      .select('*')
      .eq('assessment_id', assessment!.id)
    const inputs2 = buildGenericInputs({
      assessment: corrected as unknown as StoredAssessmentRow,
      elements: (elements2 ?? []) as unknown as StoredElementRow[],
      contributions: (contributions ?? []) as unknown as StoredContributionRow[],
    })
    const calc = calculateGenericScorecard(inputs2)
    const run = calculationRunRow({
      assessmentId: assessment!.id,
      userId: created.userId!,
      result: calc,
      inputs: inputs2,
      eapTargetSetVersion: null,
    })
    const { data: runRow, error: runErr } = await admin
      .from('scorecard_calculation_runs')
      .insert(run)
      .select('id')
      .single()
    assert(!runErr && runRow, `calc run failed: ${runErr?.message}`)
    created.runIds.push(runRow!.id)

    await admin
      .from('scorecard_assessments')
      .update({
        ...assessmentResultColumns(calc),
        workbook_import_status: 'calculated',
      })
      .eq('id', assessment!.id)

    console.log(
      JSON.stringify(
        {
          ok: true,
          assessmentId: assessment!.id,
          sheetCount: analysis.sheetCount,
          recognisedSheetCount: analysis.recognisedSheetCount,
          ownershipImported: Boolean(applied.ownership),
          financialImported: Boolean(applied.financial),
          managementControlImported: Boolean(applied.managementControlImportSnapshot),
          edSdSeparated: Boolean(
            applied.enterpriseDevelopmentContributions || applied.supplierDevelopmentContributions,
          ),
          procurementWillPopulate: false,
          preliminaryLevel: calc.preliminaryLevel.level,
          totalBasePoints: calc.totalBasePointsAchieved,
          needsRecalcAfterCorrection: true,
          snapshotPreserved: true,
        },
        null,
        2,
      ),
    )
  } finally {
    if (created.assessmentId) {
      await admin.from('scorecard_calculation_runs').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_contribution_records').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_assessment_elements').delete().eq('assessment_id', created.assessmentId)
      await admin.from('scorecard_assessments').delete().eq('id', created.assessmentId)
    }
    if (created.companyId) await admin.from('companies').delete().eq('id', created.companyId)
    if (created.userId) await admin.auth.admin.deleteUser(created.userId)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
