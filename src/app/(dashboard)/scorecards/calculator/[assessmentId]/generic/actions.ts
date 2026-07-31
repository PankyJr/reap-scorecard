'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { calculateGenericScorecard } from '@/lib/scorecard/generic'
import {
  assessmentResultColumns,
  buildGenericInputs,
  calculationRunRow,
  hydrateFinancialInputs,
  priorityResultRows,
  type StoredAssessmentRow,
  type StoredContributionRow,
  type StoredElementRow,
} from '@/lib/scorecard/generic/persistence'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import type { ProcurementSnapshot } from '@/lib/scorecard/generic/elements/procurement'

const CONTRIBUTION_ELEMENTS = new Set([
  'enterprise_development',
  'supplier_development',
  'socio_economic_development',
])

function basePath(assessmentId: string) {
  return `/scorecards/calculator/${assessmentId}/generic`
}

function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? '').trim()
  return value === '' ? null : value
}

function number(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? '').replace(/[\sR,]/g, '')
  if (raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/** Accepts either a fraction (0.25) or a percentage (25) and stores a fraction. */
function fraction(formData: FormData, key: string): number | null {
  const value = number(formData, key)
  if (value == null) return null
  return value > 1 ? value / 100 : value
}

function tristate(formData: FormData, key: string): boolean | null {
  const value = String(formData.get(key) ?? '')
  if (value === 'yes') return true
  if (value === 'no') return false
  return null
}

async function requireOwnedAssessment(assessmentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assessment } = await supabase
    .from('scorecard_assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle()
  if (!assessment) redirect('/scorecards/new?error=Assessment+not+found')

  const { data: company } = await supabase
    .from('companies')
    .select('id, owner_id')
    .eq('id', assessment.company_id)
    .maybeSingle()
  if (!company || company.owner_id !== user.id) redirect('/scorecards/new?error=Unauthorised')

  return { supabase, user, assessment }
}

async function recordAudit(args: {
  supabase: Awaited<ReturnType<typeof createClient>>
  assessmentId: string
  action: string
  actor: string
  elementKey?: string | null
  detail?: Record<string, unknown>
}) {
  await args.supabase.from('scorecard_assessment_audit_log').insert({
    assessment_id: args.assessmentId,
    action: args.action,
    element_key: args.elementKey ?? null,
    actor: args.actor,
    detail: args.detail ?? {},
  })
}

function finish(assessmentId: string, step: string, flag = 'saved=1') {
  revalidatePath(basePath(assessmentId))
  revalidatePath(`${basePath(assessmentId)}/${step}`)
  redirect(`${basePath(assessmentId)}/${step}?${flag}`)
}

// ---------------------------------------------------------------------------
// Step 2 — Applicability
// ---------------------------------------------------------------------------
export async function saveApplicability(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)

  const electionRequested = String(formData.get('fullScorecardElection') ?? '') === 'yes'
  const electionReason = text(formData, 'electionReason')

  const snapshot = {
    measurementPeriodStart: text(formData, 'measurementPeriodStart'),
    measurementPeriodEnd: text(formData, 'measurementPeriodEnd'),
    annualRevenue: number(formData, 'annualRevenue'),
    entityType: text(formData, 'entityType'),
    sector: text(formData, 'sector'),
    sectorCodeApplies: tristate(formData, 'sectorCodeApplies'),
    sectorCodeName: text(formData, 'sectorCodeName'),
    blackOwnershipPercentage: fraction(formData, 'blackOwnershipPercentage'),
    blackWomenOwnershipPercentage: fraction(formData, 'blackWomenOwnershipPercentage'),
    isStartUp: tristate(formData, 'isStartUp'),
    fullScorecardElection: electionRequested
      ? {
          elected: true,
          reason: electionReason ?? '',
          evidence: text(formData, 'electionEvidence'),
          electedBy: user.id,
          electedAt: new Date().toISOString(),
        }
      : null,
  }

  await supabase
    .from('scorecard_assessments')
    .update({
      applicability_snapshot: snapshot,
      measurement_period_start: snapshot.measurementPeriodStart,
      measurement_period_end: snapshot.measurementPeriodEnd,
    })
    .eq('id', assessmentId)

  await recordAudit({
    supabase,
    assessmentId,
    action: 'applicability.updated',
    actor: user.id,
    detail: { previousRevenue: (assessment.applicability_snapshot as { annualRevenue?: number } | null)?.annualRevenue ?? null },
  })

  finish(assessmentId, 'applicability')
}

// ---------------------------------------------------------------------------
// Step 3 — Shared financial inputs
// ---------------------------------------------------------------------------
export async function saveFinancialInputs(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)

  const existing = hydrateFinancialInputs(assessment.financial_inputs)
  const inputs = {
    ...existing,
    measurementPeriodStart: text(formData, 'measurementPeriodStart'),
    measurementPeriodEnd: text(formData, 'measurementPeriodEnd'),
    revenue: number(formData, 'revenue'),
    actualNpat: number(formData, 'actualNpat'),
    npbt: number(formData, 'npbt'),
    companyTax: number(formData, 'companyTax'),
    leviableAmount: number(formData, 'leviableAmount'),
    totalPayroll: number(formData, 'totalPayroll'),
    totalEmployees: number(formData, 'totalEmployees'),
    industryClassification: text(formData, 'industryClassification'),
    industryNpatMargin: fraction(formData, 'industryNpatMargin'),
    industryProfitNormSource: text(formData, 'industryProfitNormSource'),
    industryProfitNormPeriod: text(formData, 'industryProfitNormPeriod'),
  }

  await supabase.from('scorecard_assessments').update({ financial_inputs: inputs }).eq('id', assessmentId)
  await recordAudit({ supabase, assessmentId, action: 'financial_inputs.updated', actor: user.id })

  finish(assessmentId, 'financial')
}

/**
 * Only a REAP internal admin may pin the NPAT denominator, and only with a
 * reason. The previous value and the reason are stored in the override trail.
 */
export async function overrideNpatDenominator(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)

  if (!(await isReapInternalAdmin(user.id))) {
    redirect(`${basePath(assessmentId)}/financial?error=${encodeURIComponent('Only a REAP administrator may override the NPAT denominator.')}`)
  }

  const selection = String(formData.get('selection') ?? '')
  const reason = text(formData, 'reason')
  if (!['actual', 'deemed', 'authorised_override'].includes(selection)) {
    redirect(`${basePath(assessmentId)}/financial?error=${encodeURIComponent('Choose which NPAT denominator applies.')}`)
  }
  if (!reason) {
    redirect(`${basePath(assessmentId)}/financial?error=${encodeURIComponent('A reason is required for an NPAT override.')}`)
  }

  const existing = hydrateFinancialInputs(assessment.financial_inputs)
  const override = {
    selection: selection as 'actual' | 'deemed' | 'authorised_override',
    value: selection === 'authorised_override' ? number(formData, 'value') : null,
    reason,
    overriddenBy: user.id,
    overriddenAt: new Date().toISOString(),
  }

  await supabase
    .from('scorecard_assessments')
    .update({ financial_inputs: { ...existing, npatOverride: override } })
    .eq('id', assessmentId)

  await supabase.from('scorecard_assessment_overrides').insert({
    assessment_id: assessmentId,
    scope: 'financial',
    target_key: 'npat_denominator',
    previous_value: (existing.npatOverride ?? null) as unknown as Record<string, unknown> | null,
    new_value: override as unknown as Record<string, unknown>,
    reason,
    overridden_by: user.id,
  })

  finish(assessmentId, 'financial', 'override=1')
}

export async function clearNpatOverride(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)
  if (!(await isReapInternalAdmin(user.id))) {
    redirect(`${basePath(assessmentId)}/financial?error=${encodeURIComponent('Only a REAP administrator may change the NPAT denominator.')}`)
  }

  const existing = hydrateFinancialInputs(assessment.financial_inputs)
  await supabase
    .from('scorecard_assessments')
    .update({ financial_inputs: { ...existing, npatOverride: null } })
    .eq('id', assessmentId)

  await supabase.from('scorecard_assessment_overrides').insert({
    assessment_id: assessmentId,
    scope: 'financial',
    target_key: 'npat_denominator',
    previous_value: (existing.npatOverride ?? null) as unknown as Record<string, unknown> | null,
    new_value: null,
    reason: 'Override cleared; the engine resolves the denominator again.',
    overridden_by: user.id,
  })

  finish(assessmentId, 'financial', 'override=cleared')
}

// ---------------------------------------------------------------------------
// Step 4 — Ownership
// ---------------------------------------------------------------------------
export async function saveOwnership(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user } = await requireOwnedAssessment(assessmentId)

  const inputs = {
    totalExercisableVotes: number(formData, 'totalExercisableVotes'),
    blackExercisableVotes: number(formData, 'blackExercisableVotes'),
    blackWomenExercisableVotes: number(formData, 'blackWomenExercisableVotes'),
    blackVotingRightsPercentage: fraction(formData, 'blackVotingRightsPercentage'),
    blackWomenVotingRightsPercentage: fraction(formData, 'blackWomenVotingRightsPercentage'),
    blackEconomicInterestPercentage: fraction(formData, 'blackEconomicInterestPercentage'),
    blackWomenEconomicInterestPercentage: fraction(formData, 'blackWomenEconomicInterestPercentage'),
    designatedGroupsEconomicInterestPercentage: fraction(formData, 'designatedGroupsEconomicInterestPercentage'),
    newEntrantsEconomicInterestPercentage: fraction(formData, 'newEntrantsEconomicInterestPercentage'),
    netValuePercentage: fraction(formData, 'netValuePercentage'),
    evidenceSource: text(formData, 'evidenceSource'),
    practitionerNotes: text(formData, 'practitionerNotes'),
    measurementDate: text(formData, 'measurementDate'),
    modifiedFlowThroughApplied: tristate(formData, 'modifiedFlowThroughApplied'),
    exclusionPrincipleApplied: tristate(formData, 'exclusionPrincipleApplied'),
  }

  await supabase.from('scorecard_assessments').update({ ownership_inputs: inputs }).eq('id', assessmentId)
  await recordAudit({ supabase, assessmentId, action: 'ownership.updated', actor: user.id, elementKey: 'ownership' })
  await markElementNeedsRecalculation(supabase, assessmentId, 'ownership')

  finish(assessmentId, 'ownership')
}

async function markElementNeedsRecalculation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
  elementKey: string,
) {
  await supabase
    .from('scorecard_assessment_elements')
    .update({ needs_recalculation: true, updated_at: new Date().toISOString() })
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)

  const { data: assessment } = await supabase
    .from('scorecard_assessments')
    .select('workbook_import_status')
    .eq('id', assessmentId)
    .maybeSingle()

  const importStatus = (assessment as { workbook_import_status?: string | null } | null)
    ?.workbook_import_status
  const assessmentUpdate: Record<string, unknown> = {
    needs_recalculation: true,
    updated_at: new Date().toISOString(),
  }
  if (
    importStatus === 'imported' ||
    importStatus === 'imported_with_warnings' ||
    importStatus === 'calculated' ||
    importStatus === 'complete' ||
    importStatus === 'manually_corrected'
  ) {
    assessmentUpdate.workbook_import_status = 'needs_recalculation'
  }

  await supabase.from('scorecard_assessments').update(assessmentUpdate).eq('id', assessmentId)
}

// ---------------------------------------------------------------------------
// Step 5 — Management Control denominators
// ---------------------------------------------------------------------------
export async function saveManagementControlInputs(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user } = await requireOwnedAssessment(assessmentId)

  const band = (prefix: string) => ({
    total: number(formData, `${prefix}Total`),
    byDemographic: {
      african_male: number(formData, `${prefix}AfricanMale`) ?? 0,
      coloured_male: number(formData, `${prefix}ColouredMale`) ?? 0,
      indian_male: number(formData, `${prefix}IndianMale`) ?? 0,
      african_female: number(formData, `${prefix}AfricanFemale`) ?? 0,
      coloured_female: number(formData, `${prefix}ColouredFemale`) ?? 0,
      indian_female: number(formData, `${prefix}IndianFemale`) ?? 0,
    },
  })

  const inputs = {
    board: {
      total: number(formData, 'boardTotal'),
      black: number(formData, 'boardBlack'),
      blackWomen: number(formData, 'boardBlackWomen'),
    },
    executiveDirectors: {
      total: number(formData, 'execDirTotal'),
      black: number(formData, 'execDirBlack'),
      blackWomen: number(formData, 'execDirBlackWomen'),
    },
    otherExecutiveManagement: {
      total: number(formData, 'otherExecTotal'),
      black: number(formData, 'otherExecBlack'),
      blackWomen: number(formData, 'otherExecBlackWomen'),
    },
    seniorManagement: band('senior'),
    middleManagement: band('middle'),
    juniorManagement: band('junior'),
    blackEmployeesWithDisabilities: number(formData, 'blackEmployeesWithDisabilities'),
    totalEmployees: number(formData, 'totalEmployees'),
    eapDistribution: null,
    eapTargetSetLabel: null,
  }

  await supabase
    .from('scorecard_assessment_elements')
    .update({ contextual_inputs: inputs, needs_recalculation: true, updated_at: new Date().toISOString() })
    .eq('assessment_id', assessmentId)
    .eq('element_key', 'management_control')

  await recordAudit({
    supabase,
    assessmentId,
    action: 'management_control.inputs_updated',
    actor: user.id,
    elementKey: 'management_control',
  })
  await markElementNeedsRecalculation(supabase, assessmentId, 'management_control')

  finish(assessmentId, 'management-control')
}

// ---------------------------------------------------------------------------
// Step 6 — Skills Development
// ---------------------------------------------------------------------------
export async function saveSkillsDevelopmentInputs(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user } = await requireOwnedAssessment(assessmentId)

  const spend = (prefix: string) => ({
    african_male: number(formData, `${prefix}AfricanMale`) ?? 0,
    coloured_male: number(formData, `${prefix}ColouredMale`) ?? 0,
    indian_male: number(formData, `${prefix}IndianMale`) ?? 0,
    african_female: number(formData, `${prefix}AfricanFemale`) ?? 0,
    coloured_female: number(formData, `${prefix}ColouredFemale`) ?? 0,
    indian_female: number(formData, `${prefix}IndianFemale`) ?? 0,
  })

  const inputs = {
    leviableAmount: number(formData, 'leviableAmount'),
    totalEmployees: number(formData, 'totalEmployees'),
    wspAtrSetaApproved: tristate(formData, 'wspAtrSetaApproved'),
    pivotalReportSubmitted: tristate(formData, 'pivotalReportSubmitted'),
    prioritySkillsProgrammeImplemented: tristate(formData, 'prioritySkillsProgrammeImplemented'),
    trainingRegisterMaintained: tristate(formData, 'trainingRegisterMaintained'),
    generalTrainingSpendByDemographic: spend('general'),
    bursarySpendByDemographic: spend('bursary'),
    disabilityTrainingSpend: number(formData, 'disabilityTrainingSpend'),
    learnerHeadcountByDemographic: spend('learner'),
    totalSkillsDevelopmentSpend: number(formData, 'totalSkillsDevelopmentSpend'),
    informalWorkplaceLearningSpend: number(formData, 'informalWorkplaceLearningSpend'),
    trainingAdministrationCost: number(formData, 'trainingAdministrationCost'),
    learnersCompleted: number(formData, 'learnersCompleted'),
    learnersAbsorbed: number(formData, 'learnersAbsorbed'),
    eapDistribution: null,
    eapTargetSetLabel: null,
  }

  await supabase
    .from('scorecard_assessment_elements')
    .update({ contextual_inputs: inputs, needs_recalculation: true, updated_at: new Date().toISOString() })
    .eq('assessment_id', assessmentId)
    .eq('element_key', 'skills_development')

  await recordAudit({
    supabase,
    assessmentId,
    action: 'skills_development.inputs_updated',
    actor: user.id,
    elementKey: 'skills_development',
  })
  await markElementNeedsRecalculation(supabase, assessmentId, 'skills_development')

  finish(assessmentId, 'skills-development')
}

// ---------------------------------------------------------------------------
// Step 7 — Procurement attachment
// ---------------------------------------------------------------------------
export async function attachProcurementAssessment(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const sourceId = String(formData.get('procurementAssessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)

  if (!sourceId) {
    redirect(`${basePath(assessmentId)}/procurement?error=${encodeURIComponent('Select a completed procurement assessment.')}`)
  }

  const existing = assessment.procurement_snapshot as ProcurementSnapshot | null
  const confirmedReplacement = String(formData.get('confirmReplacement') ?? '') === 'yes'
  if (existing?.sourceAssessmentId && existing.sourceAssessmentId !== sourceId && !confirmedReplacement) {
    redirect(`${basePath(assessmentId)}/procurement?error=${encodeURIComponent('Confirm that you want to replace the attached procurement assessment.')}`)
  }

  const snapshot = await buildProcurementSnapshot(supabase, sourceId, user.id)
  if (!snapshot) {
    redirect(`${basePath(assessmentId)}/procurement?error=${encodeURIComponent('That procurement assessment could not be read.')}`)
  }

  await supabase
    .from('scorecard_assessments')
    .update({ procurement_assessment_id: sourceId, procurement_snapshot: snapshot })
    .eq('id', assessmentId)

  await recordAudit({
    supabase,
    assessmentId,
    action: existing ? 'procurement.snapshot_replaced' : 'procurement.snapshot_attached',
    actor: user.id,
    elementKey: 'preferential_procurement',
    detail: {
      previousAssessmentId: existing?.sourceAssessmentId ?? null,
      newAssessmentId: sourceId,
    },
  })
  await markElementNeedsRecalculation(supabase, assessmentId, 'preferential_procurement')

  finish(assessmentId, 'procurement', 'attached=1')
}

export async function detachProcurementAssessment(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)
  const existing = assessment.procurement_snapshot as ProcurementSnapshot | null

  await supabase
    .from('scorecard_assessments')
    .update({ procurement_assessment_id: null, procurement_snapshot: null })
    .eq('id', assessmentId)

  await recordAudit({
    supabase,
    assessmentId,
    action: 'procurement.snapshot_detached',
    actor: user.id,
    elementKey: 'preferential_procurement',
    detail: { previousAssessmentId: existing?.sourceAssessmentId ?? null },
  })
  await markElementNeedsRecalculation(supabase, assessmentId, 'preferential_procurement')

  finish(assessmentId, 'procurement', 'detached=1')
}

/**
 * Freeze the measured spend ratios from a completed procurement assessment.
 * The full scorecard scores those ratios itself so that the points always match
 * the selected rule set.
 */
async function buildProcurementSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceAssessmentId: string,
  userId: string,
): Promise<ProcurementSnapshot | null> {
  const { data: source } = await supabase
    .from('procurement_assessments')
    .select('*')
    .eq('id', sourceAssessmentId)
    .maybeSingle()
  if (!source) return null

  const { data: suppliers } = await supabase
    .from('procurement_suppliers')
    .select(
      'bbbee_spend, eme_amount, qse_amount, black_owned_amount, black_women_amount, bdgs_amount, is_51_percent_flow_through',
    )
    .eq('assessment_id', sourceAssessmentId)

  const rows = suppliers ?? []
  const sumOf = (key: keyof (typeof rows)[number]) =>
    rows.reduce((sum, row) => {
      const value = Number(row[key] ?? 0)
      return Number.isFinite(value) ? sum + value : sum
    }, 0)

  const total = Number(source.total_measured_procurement_spend ?? 0)

  return {
    sourceAssessmentId,
    sourceAssessmentName: `Formal Procurement Assessment ${source.assessment_year}`,
    measurementPeriodStart: null,
    measurementPeriodEnd: null,
    capturedAt: new Date().toISOString(),
    capturedBy: userId,
    totalMeasuredProcurementSpend: total > 0 ? total : null,
    recognisedSpend: {
      'preferential_procurement.all_empowering_suppliers': sumOf('bbbee_spend'),
      'preferential_procurement.qse': sumOf('qse_amount'),
      'preferential_procurement.eme': sumOf('eme_amount'),
      'preferential_procurement.black_owned_51': sumOf('black_owned_amount'),
      'preferential_procurement.black_women_owned_30': sumOf('black_women_amount'),
      'preferential_procurement.bonus.designated_group': sumOf('bdgs_amount'),
    },
    flowThroughApplied: rows.some((row) => row.is_51_percent_flow_through === true),
    // The procurement product stores one combined score whose base/bonus split
    // is not recorded, so there is nothing to reconcile against here. The
    // source assessment's own score is shown next to the link instead.
    sourceReportedBasePoints: null,
    sourceReportedBonusPoints: null,
  }
}

// ---------------------------------------------------------------------------
// Steps 8–10 — ED / SD / SED contribution records
// ---------------------------------------------------------------------------
function contributionStep(elementKey: string) {
  if (elementKey === 'enterprise_development') return 'enterprise-development'
  if (elementKey === 'supplier_development') return 'supplier-development'
  return 'socio-economic-development'
}

export async function saveContributionRecord(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const elementKey = String(formData.get('elementKey') ?? '')
  const { supabase, user } = await requireOwnedAssessment(assessmentId)
  if (!CONTRIBUTION_ELEMENTS.has(elementKey)) redirect(basePath(assessmentId))

  const recordId = text(formData, 'recordId')
  const payload = {
    assessment_id: assessmentId,
    element_key: elementKey,
    beneficiary_name: text(formData, 'beneficiaryName'),
    beneficiary_classification: text(formData, 'beneficiaryClassification'),
    beneficiary_black_ownership_percentage: fraction(formData, 'beneficiaryBlackOwnershipPercentage'),
    was_eme_or_qse_at_first_assistance: tristate(formData, 'wasEmeOrQseAtFirstAssistance'),
    years_since_first_assistance: number(formData, 'yearsSinceFirstAssistance'),
    contribution_type: text(formData, 'contributionType'),
    actual_value: number(formData, 'actualValue'),
    supplied_benefit_factor: fraction(formData, 'suppliedBenefitFactor'),
    contribution_date: text(formData, 'contributionDate'),
    evidence_provided: String(formData.get('evidenceProvided') ?? '') === 'on',
    black_beneficiary_percentage: fraction(formData, 'blackBeneficiaryPercentage'),
    notes: text(formData, 'notes'),
    claimed_raw: text(formData, 'claimedRaw'),
    updated_at: new Date().toISOString(),
  }

  if (recordId) {
    const { data: previous } = await supabase
      .from('scorecard_contribution_records')
      .select('*')
      .eq('id', recordId)
      .eq('assessment_id', assessmentId)
      .maybeSingle()

    await supabase.from('scorecard_contribution_records').update(payload).eq('id', recordId)

    const reason = text(formData, 'correctionReason')
    if (reason && previous) {
      await supabase.from('scorecard_assessment_overrides').insert({
        assessment_id: assessmentId,
        scope: elementKey,
        target_key: `contribution:${recordId}`,
        previous_value: previous as unknown as Record<string, unknown>,
        new_value: payload as unknown as Record<string, unknown>,
        reason,
        overridden_by: user.id,
      })
    }
  } else {
    await supabase.from('scorecard_contribution_records').insert(payload)
  }

  await recordAudit({
    supabase,
    assessmentId,
    action: recordId ? 'contribution.updated' : 'contribution.created',
    actor: user.id,
    elementKey,
  })
  await markElementNeedsRecalculation(supabase, assessmentId, elementKey)

  finish(assessmentId, contributionStep(elementKey))
}

export async function deleteContributionRecord(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const elementKey = String(formData.get('elementKey') ?? '')
  const recordId = String(formData.get('recordId') ?? '')
  const { supabase, user } = await requireOwnedAssessment(assessmentId)
  if (!CONTRIBUTION_ELEMENTS.has(elementKey) || !recordId) redirect(basePath(assessmentId))

  await supabase
    .from('scorecard_contribution_records')
    .delete()
    .eq('id', recordId)
    .eq('assessment_id', assessmentId)

  await recordAudit({ supabase, assessmentId, action: 'contribution.deleted', actor: user.id, elementKey })
  await markElementNeedsRecalculation(supabase, assessmentId, elementKey)

  finish(assessmentId, contributionStep(elementKey), 'deleted=1')
}

export async function saveEsdBonusFlags(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const elementKey = String(formData.get('elementKey') ?? '')
  const { supabase, user } = await requireOwnedAssessment(assessmentId)
  if (elementKey !== 'enterprise_development' && elementKey !== 'supplier_development') {
    redirect(basePath(assessmentId))
  }

  const { data: element } = await supabase
    .from('scorecard_assessment_elements')
    .select('contextual_inputs')
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)
    .maybeSingle()

  const existing =
    element?.contextual_inputs && typeof element.contextual_inputs === 'object'
      ? (element.contextual_inputs as Record<string, unknown>)
      : {}

  await supabase
    .from('scorecard_assessment_elements')
    .update({
      contextual_inputs: {
        ...existing,
        bonusConfirmed: tristate(formData, 'bonusConfirmed'),
        bonusEvidenceProvided: String(formData.get('bonusEvidenceProvided') ?? '') === 'on',
      },
      needs_recalculation: true,
      updated_at: new Date().toISOString(),
    })
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)

  await recordAudit({ supabase, assessmentId, action: 'esd_bonus.updated', actor: user.id, elementKey })
  await markElementNeedsRecalculation(supabase, assessmentId, elementKey)

  finish(assessmentId, contributionStep(elementKey), 'bonus=1')
}

// ---------------------------------------------------------------------------
// Step 12 — Explicit whole-scorecard calculation
// ---------------------------------------------------------------------------
export async function calculateGenericScorecardRun(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)

  const [{ data: elements }, { data: contributions }] = await Promise.all([
    supabase.from('scorecard_assessment_elements').select('*').eq('assessment_id', assessmentId),
    supabase.from('scorecard_contribution_records').select('*').eq('assessment_id', assessmentId),
  ])

  const inputs = buildGenericInputs({
    assessment: assessment as unknown as StoredAssessmentRow,
    elements: (elements ?? []) as unknown as StoredElementRow[],
    contributions: (contributions ?? []) as unknown as StoredContributionRow[],
  })
  const result = calculateGenericScorecard(inputs)

  const eapSnapshot = assessment.eap_target_snapshot as { version?: unknown } | null
  const { data: run } = await supabase
    .from('scorecard_calculation_runs')
    .insert(
      calculationRunRow({
        assessmentId,
        userId: user.id,
        result,
        inputs,
        eapTargetSetVersion: eapSnapshot?.version == null ? null : String(eapSnapshot.version),
      }),
    )
    .select('id')
    .single()

  await supabase.from('scorecard_assessments').update(assessmentResultColumns(result)).eq('id', assessmentId)

  const priorityRows = priorityResultRows({ assessmentId, calculationRunId: run?.id ?? null, result })
  if (priorityRows.length > 0) {
    await supabase.from('scorecard_priority_results').insert(priorityRows)
  }

  for (const element of result.elements) {
    await supabase
      .from('scorecard_assessment_elements')
      .update({
        result_snapshot: element as unknown as Record<string, unknown>,
        rule_set_key: result.ruleSetKey,
        rule_set_version: result.ruleSetVersion,
        calculation_rule_version: result.ruleSetKey,
        base_points_achieved: element.basePointsAchieved,
        bonus_points_achieved: element.bonusPointsAchieved,
        base_points_available: element.basePointsAvailable,
        bonus_points_available: element.bonusPointsAvailable,
        missing_inputs: element.missingInputs,
        warnings: element.warnings,
        status: element.status === 'scored' ? 'calculated' : element.status === 'not_started' ? 'not_started' : 'needs_review',
        calculated_at: new Date().toISOString(),
        calculated_by: user.id,
        needs_recalculation: false,
        updated_at: new Date().toISOString(),
      })
      .eq('assessment_id', assessmentId)
      .eq('element_key', element.elementKey)
  }

  await recordAudit({
    supabase,
    assessmentId,
    action: 'scorecard.calculated',
    actor: user.id,
    detail: {
      runId: run?.id ?? null,
      preliminaryLevel: result.preliminaryLevel.level,
      finalLevel: result.readiness.complete ? result.finalLevel.level : null,
      discountApplied: result.discountApplied,
    },
  })

  revalidatePath(basePath(assessmentId))
  redirect(`${basePath(assessmentId)}/result?calculated=1`)
}

/**
 * Analyse a Generic Scorecard Calculator workbook and store a pending review
 * preview. No element inputs or contribution rows are written until confirm.
 */
export async function uploadGenericWorkbookForReview(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user } = await requireOwnedAssessment(assessmentId)
  const file = formData.get('workbook')
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${basePath(assessmentId)}?error=${encodeURIComponent('Choose a Generic Scorecard workbook (.xlsx).')}`)
  }

  try {
    const { assertSafeWorkbookFile, analyseGenericWorkbook } = await import(
      '@/lib/scorecard/generic/workbook-import'
    )
    assertSafeWorkbookFile({ filename: file.name, size: file.size })
    const buffer = Buffer.from(await file.arrayBuffer())
    const analysis = analyseGenericWorkbook({
      filename: file.name,
      buffer,
      fileSize: file.size,
    })

    await supabase
      .from('scorecard_assessments')
      .update({
        workbook_import_status: 'review_required',
        workbook_filename: analysis.filename,
        workbook_checksum_sha256: analysis.checksumSha256,
        workbook_file_size: analysis.fileSize,
        workbook_import_preview: analysis as unknown as Record<string, unknown>,
        needs_recalculation: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)

    await recordAudit({
      supabase,
      assessmentId,
      action: 'workbook.analysed_for_review',
      actor: user.id,
      detail: {
        filename: analysis.filename,
        checksum: analysis.checksumSha256,
        detectedSheetCount: analysis.detectedSheetCount,
        recognisedSheetCount: analysis.recognisedSheetCount,
      },
    })

    revalidatePath(basePath(assessmentId))
    redirect(`${basePath(assessmentId)}/workbook-review?ready=1`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workbook analysis failed.'
    redirect(`${basePath(assessmentId)}?error=${encodeURIComponent(message)}`)
  }
}

/**
 * Apply confirmed import decisions from the review screen into the assessment.
 * Existing element data is never overwritten unless the user chose replace.
 */
export async function confirmGenericWorkbookImport(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)
  const preview = assessment.workbook_import_preview as import('@/lib/scorecard/generic/workbook-import').GenericWorkbookAnalysis | null
  if (!preview) {
    redirect(`${basePath(assessmentId)}?error=${encodeURIComponent('Upload and review a workbook before confirming import.')}`)
  }

  const warningsAccepted = String(formData.get('warningsAccepted') ?? '') === 'on'
  const procurementAcknowledged = String(formData.get('procurementAcknowledged') ?? '') === 'on'
  if (!warningsAccepted || !procurementAcknowledged) {
    redirect(
      `${basePath(assessmentId)}/workbook-review?error=${encodeURIComponent('Confirm warnings and that procurement will be attached separately.')}`,
    )
  }

  const { applyWorkbookImportDecisions } = await import('@/lib/scorecard/generic/workbook-import')
  type ElementImportDecision = import('@/lib/scorecard/generic/workbook-import').ElementImportDecision

  const decisions: Record<string, ElementImportDecision> = {}
  for (const element of preview.elements) {
    const raw = String(formData.get(`decision_${element.elementKey}`) ?? 'skip')
    decisions[element.elementKey] = raw as ElementImportDecision
  }

  const [{ data: elements }, { data: contributions }] = await Promise.all([
    supabase.from('scorecard_assessment_elements').select('*').eq('assessment_id', assessmentId),
    supabase.from('scorecard_contribution_records').select('*').eq('assessment_id', assessmentId),
  ])

  const inputs = buildGenericInputs({
    assessment: assessment as unknown as StoredAssessmentRow,
    elements: (elements ?? []) as unknown as StoredElementRow[],
    contributions: (contributions ?? []) as unknown as StoredContributionRow[],
  })

  const applied = applyWorkbookImportDecisions({
    analysis: preview,
    decisions,
    warningsAccepted,
    existing: {
      financial: inputs.financial,
      ownership: inputs.ownership,
      managementControl: inputs.managementControl,
      skillsDevelopment: inputs.skillsDevelopment,
      enterpriseDevelopmentRecords: inputs.enterpriseDevelopment.records,
      supplierDevelopmentRecords: inputs.supplierDevelopment.records,
      socioEconomicDevelopmentRecords: inputs.socioEconomicDevelopment.records,
    },
  })

  const now = new Date().toISOString()
  const assessmentUpdate: Record<string, unknown> = {
    workbook_import_status: preview.demonstrationWarnings.length || preview.workbookDefects.length
      ? 'imported_with_warnings'
      : 'imported',
    workbook_import_snapshot: {
      ...preview,
      decisions,
      warningsAccepted,
      importedAt: now,
      importedBy: user.id,
      applied,
    },
    workbook_imported_at: now,
    workbook_imported_by: user.id,
    needs_recalculation: true,
    updated_at: now,
  }

  if (applied.financial) assessmentUpdate.financial_inputs = applied.financial
  if (applied.ownership) {
    assessmentUpdate.ownership_inputs = {
      ...applied.ownership,
      evidenceSource: applied.ownership.evidenceSource ?? `Full Generic Workbook · ${preview.filename}`,
    }
  }

  await supabase.from('scorecard_assessments').update(assessmentUpdate).eq('id', assessmentId)

  const upsertElement = async (
    elementKey: string,
    contextual: Record<string, unknown> | null,
    importSnapshot: Record<string, unknown> | null,
  ) => {
    if (!contextual && !importSnapshot) return
    await supabase.from('scorecard_assessment_elements').upsert(
      {
        assessment_id: assessmentId,
        element_key: elementKey,
        status: 'needs_review',
        contextual_inputs: contextual ?? {},
        import_snapshot: importSnapshot,
        upload_filename: preview.filename,
        needs_recalculation: true,
        warnings: [],
        updated_at: now,
      },
      { onConflict: 'assessment_id,element_key' },
    )
  }

  if (applied.managementControl) {
    const mcEl = preview.elements.find((e) => e.elementKey === 'management_control')
    await upsertElement('management_control', applied.managementControl as unknown as Record<string, unknown>, {
      source: 'full_generic_workbook',
      filename: preview.filename,
      checksum: preview.checksumSha256,
      managementControlImport: mcEl?.managementControlImport ?? null,
    })
  }
  if (applied.skillsDevelopment) {
    await upsertElement('skills_development', applied.skillsDevelopment as unknown as Record<string, unknown>, {
      source: 'full_generic_workbook',
      filename: preview.filename,
      checksum: preview.checksumSha256,
    })
  }

  const writeContributions = async (elementKey: string, records: typeof applied.enterpriseDevelopmentRecords) => {
    if (!records) return
    if (decisions[elementKey] === 'replace_existing') {
      await supabase
        .from('scorecard_contribution_records')
        .delete()
        .eq('assessment_id', assessmentId)
        .eq('element_key', elementKey)
    }
    for (const record of records) {
      await supabase.from('scorecard_contribution_records').insert({
        assessment_id: assessmentId,
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
        black_beneficiary_percentage: record.blackBeneficiaryPercentage,
        notes: record.notes,
        claimed_raw: record.claimedRaw ?? null,
        source_sheet: record.sourceSheet ?? null,
        source_row_number: record.sourceRowNumber ?? null,
        warnings: ['Imported from Full Generic Workbook — review before scoring.'],
      })
    }
    await upsertElement(elementKey, null, {
      source: 'full_generic_workbook',
      filename: preview.filename,
      checksum: preview.checksumSha256,
      contributionCount: records.length,
    })
  }

  await writeContributions('enterprise_development', applied.enterpriseDevelopmentRecords)
  await writeContributions('supplier_development', applied.supplierDevelopmentRecords)
  await writeContributions('socio_economic_development', applied.socioEconomicDevelopmentRecords)

  // Clear pending preview after successful confirm (snapshot retains the analysis).
  await supabase
    .from('scorecard_assessments')
    .update({ workbook_import_preview: null, updated_at: now })
    .eq('id', assessmentId)

  await recordAudit({
    supabase,
    assessmentId,
    action: 'workbook.import_confirmed',
    actor: user.id,
    detail: { decisions, filename: preview.filename, checksum: preview.checksumSha256 },
  })

  revalidatePath(basePath(assessmentId))
  redirect(`${basePath(assessmentId)}?imported=1`)
}

