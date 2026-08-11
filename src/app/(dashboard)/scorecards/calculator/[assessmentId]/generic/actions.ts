'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import {
  buildEapSnapshot,
  findActiveEapTargetSet,
  resolveEapSnapshotForCalculation,
} from './eap-target-set'
import { calculateGenericScorecard } from '@/lib/scorecard/generic'
import {
  assessmentResultColumns,
  buildGenericInputs,
  calculationRunRow,
  hydrateFinancialInputs,
  hydrateOwnership,
  priorityResultRows,
  type StoredAssessmentRow,
  type StoredContributionRow,
  type StoredElementRow,
} from '@/lib/scorecard/generic/persistence'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import type { ProcurementSnapshot } from '@/lib/scorecard/generic/elements/procurement'
import { normaliseSourceProcurementPoints } from '@/lib/scorecard/generic/elements/procurement'
import { calculateProcurementResults } from '@/lib/procurement/assessment'
import {
  analyseGenericScorecardWorkbook,
  applyWorkbookImportDecisions,
  type ElementImportDecision,
  type GenericWorkbookAnalysis,
  type ImportElementKey,
} from '@/lib/scorecard/generic/workbook-import'
import type { ManagementControlInputs } from '@/lib/scorecard/generic/elements/management-control'
import type { SkillsDevelopmentInputs } from '@/lib/scorecard/generic/elements/skills-development'
import type { ContributionRecord } from '@/lib/scorecard/generic/elements/contributions'

/**
 * Machine-findable marker: contribution_type was auto-defaulted to
 * 'grant_contribution' during phase 1, not chosen by the user.
 *
 * TODO(phase-2): when the benefit factor matrix and the contribution-type
 * selector are restored, re-type every row carrying this marker before relying
 * on its recognised value, then clear the marker.
 */
// Not exported: this is a "use server" module, where only async functions may
// be exported. Phase 2 should match on the literal string.
const CONTRIBUTION_TYPE_DEFAULTED_MARKER = 'contribution_type_defaulted:phase1'

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
 * Narrow patch of actual NPAT only, so it can be captured inline from the ED,
 * SD and SED steps without a detour to the Financial step.
 *
 * Deliberately not `saveFinancialInputs`: that action rebuilds the whole
 * financial object from the posted form, so a partial post would null out
 * revenue, leviable amount and the industry norm.
 */
export async function saveActualNpatInline(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const elementKey = String(formData.get('elementKey') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)

  const existing = hydrateFinancialInputs(assessment.financial_inputs)
  const actualNpat = number(formData, 'actualNpat')

  await supabase
    .from('scorecard_assessments')
    .update({ financial_inputs: { ...existing, actualNpat } })
    .eq('id', assessmentId)
  await recordAudit({
    supabase,
    assessmentId,
    action: 'financial_inputs.updated',
    actor: user.id,
    detail: { field: 'actualNpat', capturedFrom: elementKey || 'financial' },
  })

  if (CONTRIBUTION_ELEMENTS.has(elementKey)) {
    await markElementNeedsRecalculation(supabase, assessmentId, elementKey)
    return finish(assessmentId, contributionStep(elementKey), 'npat=1')
  }
  return finish(assessmentId, 'financial')
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

  await supabase
    .from('scorecard_assessments')
    .update({ needs_recalculation: true })
    .eq('id', assessmentId)
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
  const recognisedSpend = {
    'preferential_procurement.all_empowering_suppliers': sumOf('bbbee_spend'),
    'preferential_procurement.qse': sumOf('qse_amount'),
    'preferential_procurement.eme': sumOf('eme_amount'),
    'preferential_procurement.black_owned_51': sumOf('black_owned_amount'),
    'preferential_procurement.black_women_owned_30': sumOf('black_women_amount'),
    'preferential_procurement.bonus.designated_group': sumOf('bdgs_amount'),
  }

  // Separate Formal Procurement category points so a combined total_score is
  // never treated as base-only. The Generic engine still re-scores from spend.
  const formal = calculateProcurementResults({
    totals: {
      all_bbbee_suppliers: recognisedSpend['preferential_procurement.all_empowering_suppliers'],
      all_qses: recognisedSpend['preferential_procurement.qse'],
      all_emes: recognisedSpend['preferential_procurement.eme'],
      black_owned_51: recognisedSpend['preferential_procurement.black_owned_51'],
      black_women_30: recognisedSpend['preferential_procurement.black_women_owned_30'],
      bdgs_51: recognisedSpend['preferential_procurement.bonus.designated_group'],
    },
    totalMeasuredSpend: total,
  })
  const categoryBonus =
    formal.categories.find((category) => category.key === 'bdgs_51')?.pointsAchieved ?? 0
  const categoryBase = formal.categories
    .filter((category) => category.key !== 'bdgs_51')
    .reduce((sum, category) => sum + category.pointsAchieved, 0)
  const normalised = normaliseSourceProcurementPoints({
    combinedTotal: source.total_score != null ? Number(source.total_score) : formal.totalScore,
    categoryBasePoints: categoryBase,
    categoryBonusPoints: categoryBonus,
  })

  return {
    sourceAssessmentId,
    sourceAssessmentName: `Formal Procurement Assessment ${source.assessment_year}`,
    measurementPeriodStart: null,
    measurementPeriodEnd: null,
    capturedAt: new Date().toISOString(),
    capturedBy: userId,
    totalMeasuredProcurementSpend: total > 0 ? total : null,
    recognisedSpend,
    flowThroughApplied: rows.some((row) => row.is_51_percent_flow_through === true),
    sourceReportedBasePoints: normalised.sourceReportedBasePoints,
    sourceReportedBonusPoints: normalised.sourceReportedBonusPoints,
    sourceReportedCombinedPoints: normalised.sourceReportedCombinedPoints,
    sourceNormalisationWarning: normalised.sourceNormalisationWarning,
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
    // PHASE 1: every contribution is captured as a 100%-recognised grant.
    //
    // The contribution-type selector, the supplied benefit factor and the raw
    // "Claimed" column were removed from the form at client request. Writing
    // 'grant_contribution' resolves to a benefit factor of 1.0 through the
    // existing matrix (ESD_BENEFIT_FACTORS / SED_BENEFIT_FACTORS), so nothing
    // in the calculation path is bypassed or hard-coded.
    //
    // TODO(phase-2): restore the Annexe 400(B) / 500(A) benefit factor matrix
    // in `src/lib/scorecard/generic/benefit-factors.ts` and re-expose the
    // contribution-type selector plus the rate-based `suppliedBenefitFactor`
    // input for the four variable rows (lower_interest_rate_loan,
    // investment_lower_dividend, shorter_payment_period, and the SED
    // equivalents). The DB columns supplied_benefit_factor and claimed_raw are
    // deliberately retained for that work.
    contribution_type: 'grant_contribution',
    // PROVENANCE: 'grant_contribution' above is a DEFAULT, not a user choice.
    // Without this marker, phase-1 rows are indistinguishable from deliberately
    // typed grants once the selector returns, and any loan or guarantee captured
    // now would silently keep its 100% recognition.
    //
    // `warnings` is jsonb (default '[]') on scorecard_contribution_records and is
    // not read by the app — StoredContributionRow does not carry it — so this is
    // inert provenance, not behaviour.
    //
    // Find every affected row:
    //   select id, assessment_id, element_key, beneficiary_name, actual_value
    //   from public.scorecard_contribution_records
    //   where warnings @> '["contribution_type_defaulted:phase1"]'::jsonb;
    warnings: [CONTRIBUTION_TYPE_DEFAULTED_MARKER],
    actual_value: number(formData, 'actualValue'),
    supplied_benefit_factor: null,
    contribution_date: text(formData, 'contributionDate'),
    evidence_provided: String(formData.get('evidenceProvided') ?? '') === 'on',
    black_beneficiary_percentage: fraction(formData, 'blackBeneficiaryPercentage'),
    notes: text(formData, 'notes'),
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

  // Freeze the EAP target set BEFORE building inputs. `buildGenericInputs`
  // reads `eap_target_snapshot`, so building it afterwards (as the older
  // calculator path does) leaves the first calculation with no EAP at all.
  // An existing snapshot always wins, so a recalculation keeps scoring against
  // the rules it was originally calculated under.
  const resolvedEap = await resolveEapSnapshotForCalculation(supabase, {
    id: assessmentId,
    eap_target_set_id: assessment.eap_target_set_id as string | null,
    eap_target_snapshot: assessment.eap_target_snapshot,
  })
  if (resolvedEap.error) {
    redirect(`${basePath(assessmentId)}/review?error=${encodeURIComponent(resolvedEap.error)}`)
  }
  if (resolvedEap.freshlyBuilt && resolvedEap.snapshot) {
    await supabase
      .from('scorecard_assessments')
      .update({ eap_target_snapshot: resolvedEap.snapshot })
      .eq('id', assessmentId)
  }

  const inputs = buildGenericInputs({
    assessment: {
      ...(assessment as unknown as StoredAssessmentRow),
      eap_target_snapshot: resolvedEap.snapshot,
    },
    elements: (elements ?? []) as unknown as StoredElementRow[],
    contributions: (contributions ?? []) as unknown as StoredContributionRow[],
  })
  const result = calculateGenericScorecard(inputs)

  const eapSnapshot = resolvedEap.snapshot as { version?: unknown } | null
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

async function upsertElementRow(args: {
  supabase: Awaited<ReturnType<typeof createClient>>
  assessmentId: string
  elementKey: string
  patch: Record<string, unknown>
}) {
  const { data: existing } = await args.supabase
    .from('scorecard_assessment_elements')
    .select('id')
    .eq('assessment_id', args.assessmentId)
    .eq('element_key', args.elementKey)
    .maybeSingle()

  if (existing) {
    await args.supabase
      .from('scorecard_assessment_elements')
      .update({ ...args.patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    return
  }

  await args.supabase.from('scorecard_assessment_elements').insert({
    assessment_id: args.assessmentId,
    element_key: args.elementKey,
    status: 'needs_review',
    ...args.patch,
  })
}

/**
 * Analyse the full Generic Scorecard workbook and store a pending review snapshot.
 * No element inputs are written until the user confirms on the review screen.
 */
export async function uploadGenericWorkbookForReview(formData: FormData): Promise<void> {
  const assessmentId = String(formData.get('assessmentId') ?? '').trim()
  if (!assessmentId) redirect('/scorecards/new')

  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)
  const file = formData.get('workbook')
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${basePath(assessmentId)}?error=${encodeURIComponent('Choose a Generic Scorecard workbook (.xlsx).')}`)
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const analysis = analyseGenericScorecardWorkbook({
      filename: file.name,
      buffer,
      fileSize: file.size,
    })

    const metadata = {
      ...((assessment.metadata as Record<string, unknown> | null) ?? {}),
      generic_workbook_import: {
        status: 'review_required',
        pending_analysis: analysis,
        confirmed_snapshot: null,
      },
    }

    await supabase
      .from('scorecard_assessments')
      .update({
        metadata,
        workbook_import_status: 'review_required',
        workbook_import_preview: analysis,
        workbook_filename: analysis.filename,
        workbook_checksum_sha256: analysis.checksumSha256,
        workbook_file_size: analysis.fileSize,
        needs_recalculation: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)

    await recordAudit({
      supabase,
      assessmentId,
      action: 'workbook.analysed',
      actor: user.id,
      detail: {
        filename: analysis.filename,
        checksumSha256: analysis.checksumSha256,
        sheetCount: analysis.sheetCount,
        recognisedSheetCount: analysis.recognisedSheetCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Workbook analysis failed.'
    redirect(`${basePath(assessmentId)}?error=${encodeURIComponent(message)}`)
  }

  revalidatePath(basePath(assessmentId))
  redirect(`${basePath(assessmentId)}/workbook-review`)
}

/**
 * Confirm the pending workbook import with per-element decisions.
 * Never overwrites existing data unless the user chooses replace_existing.
 */
export async function confirmGenericWorkbookImport(formData: FormData): Promise<void> {
  const assessmentId = String(formData.get('assessmentId') ?? '').trim()
  if (!assessmentId) redirect('/scorecards/new')

  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)
  const pending =
    (assessment.workbook_import_preview as GenericWorkbookAnalysis | null) ??
    ((assessment.metadata as { generic_workbook_import?: { pending_analysis?: GenericWorkbookAnalysis } } | null)
      ?.generic_workbook_import?.pending_analysis ?? null)

  if (!pending) {
    redirect(`${basePath(assessmentId)}?error=${encodeURIComponent('No workbook review is pending. Upload a workbook first.')}`)
  }

  const analysis = pending as GenericWorkbookAnalysis

  const elementKeys: ImportElementKey[] = [
    'financial',
    'ownership',
    'management_control',
    'skills_development',
    'enterprise_development',
    'supplier_development',
    'socio_economic_development',
  ]
  const decisions = {} as Record<ImportElementKey, ElementImportDecision>
  for (const key of elementKeys) {
    const raw = String(formData.get(`decision_${key}`) ?? 'skip') as ElementImportDecision
    decisions[key] = [
      'import',
      'skip',
      'keep_existing',
      'replace_existing',
      'merge_missing_only',
    ].includes(raw)
      ? raw
      : 'skip'
  }

  const [{ data: elements }, { data: contributions }] = await Promise.all([
    supabase.from('scorecard_assessment_elements').select('*').eq('assessment_id', assessmentId),
    supabase.from('scorecard_contribution_records').select('*').eq('assessment_id', assessmentId),
  ])

  const mcElement = (elements ?? []).find((row) => row.element_key === 'management_control')
  const skillsElement = (elements ?? []).find((row) => row.element_key === 'skills_development')

  let applied
  try {
    applied = applyWorkbookImportDecisions({
      request: {
        analysis,
        decisions,
        acceptWarnings: String(formData.get('acceptWarnings') ?? '') === 'on',
        acknowledgeProcurementSeparate: String(formData.get('acknowledgeProcurementSeparate') ?? '') === 'on',
        acknowledgeMissingFields: String(formData.get('acknowledgeMissingFields') ?? '') === 'on',
      },
      existing: {
        financial: hydrateFinancialInputs(assessment.financial_inputs),
        ownership: hydrateOwnership(assessment.ownership_inputs),
        managementControl: (mcElement?.contextual_inputs as ManagementControlInputs | null) ?? null,
        managementControlImportSnapshot: mcElement?.import_snapshot ?? null,
        skillsDevelopment: (skillsElement?.contextual_inputs as SkillsDevelopmentInputs | null) ?? null,
        enterpriseDevelopmentContributions: (contributions ?? [])
          .filter((row) => row.element_key === 'enterprise_development')
          .map((row) => ({
            id: row.id,
            beneficiaryName: row.beneficiary_name,
            beneficiaryClassification: row.beneficiary_classification as ContributionRecord['beneficiaryClassification'],
            beneficiaryBlackOwnershipPercentage: row.beneficiary_black_ownership_percentage == null ? null : Number(row.beneficiary_black_ownership_percentage),
            wasEmeOrQseAtFirstAssistance: row.was_eme_or_qse_at_first_assistance,
            yearsSinceFirstAssistance: row.years_since_first_assistance == null ? null : Number(row.years_since_first_assistance),
            contributionType: row.contribution_type,
            actualValue: row.actual_value == null ? null : Number(row.actual_value),
            suppliedBenefitFactor: row.supplied_benefit_factor == null ? null : Number(row.supplied_benefit_factor),
            contributionDate: row.contribution_date,
            evidenceProvided: Boolean(row.evidence_provided),
            notes: row.notes,
            blackBeneficiaryPercentage: row.black_beneficiary_percentage == null ? null : Number(row.black_beneficiary_percentage),
          })),
        supplierDevelopmentContributions: (contributions ?? [])
          .filter((row) => row.element_key === 'supplier_development')
          .map((row) => ({
            id: row.id,
            beneficiaryName: row.beneficiary_name,
            beneficiaryClassification: row.beneficiary_classification as ContributionRecord['beneficiaryClassification'],
            beneficiaryBlackOwnershipPercentage: row.beneficiary_black_ownership_percentage == null ? null : Number(row.beneficiary_black_ownership_percentage),
            wasEmeOrQseAtFirstAssistance: row.was_eme_or_qse_at_first_assistance,
            yearsSinceFirstAssistance: row.years_since_first_assistance == null ? null : Number(row.years_since_first_assistance),
            contributionType: row.contribution_type,
            actualValue: row.actual_value == null ? null : Number(row.actual_value),
            suppliedBenefitFactor: row.supplied_benefit_factor == null ? null : Number(row.supplied_benefit_factor),
            contributionDate: row.contribution_date,
            evidenceProvided: Boolean(row.evidence_provided),
            notes: row.notes,
            blackBeneficiaryPercentage: row.black_beneficiary_percentage == null ? null : Number(row.black_beneficiary_percentage),
          })),
        socioEconomicDevelopmentContributions: (contributions ?? [])
          .filter((row) => row.element_key === 'socio_economic_development')
          .map((row) => ({
            id: row.id,
            beneficiaryName: row.beneficiary_name,
            beneficiaryClassification: row.beneficiary_classification as ContributionRecord['beneficiaryClassification'],
            beneficiaryBlackOwnershipPercentage: row.beneficiary_black_ownership_percentage == null ? null : Number(row.beneficiary_black_ownership_percentage),
            wasEmeOrQseAtFirstAssistance: row.was_eme_or_qse_at_first_assistance,
            yearsSinceFirstAssistance: row.years_since_first_assistance == null ? null : Number(row.years_since_first_assistance),
            contributionType: row.contribution_type,
            actualValue: row.actual_value == null ? null : Number(row.actual_value),
            suppliedBenefitFactor: row.supplied_benefit_factor == null ? null : Number(row.supplied_benefit_factor),
            contributionDate: row.contribution_date,
            evidenceProvided: Boolean(row.evidence_provided),
            notes: row.notes,
            blackBeneficiaryPercentage: row.black_beneficiary_percentage == null ? null : Number(row.black_beneficiary_percentage),
          })),
        sedImportSnapshot: (elements ?? []).find((row) => row.element_key === 'socio_economic_development')?.import_snapshot ?? null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import confirmation failed.'
    redirect(`${basePath(assessmentId)}/workbook-review?error=${encodeURIComponent(message)}`)
  }

  const assessmentPatch: Record<string, unknown> = {
    needs_recalculation: true,
    workbook_import_status: applied.warnings.length ? 'imported_with_warnings' : 'imported',
    workbook_import_snapshot: {
      ...analysis,
      confirmedAt: new Date().toISOString(),
      confirmedBy: user.id,
      decisions,
      appliedElements: applied.appliedElements,
      skippedElements: applied.skippedElements,
      applyWarnings: applied.warnings,
    },
    workbook_import_preview: null,
    workbook_filename: analysis.filename,
    workbook_checksum_sha256: analysis.checksumSha256,
    workbook_file_size: analysis.fileSize,
    workbook_imported_at: new Date().toISOString(),
    workbook_imported_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (applied.financial) assessmentPatch.financial_inputs = applied.financial
  if (applied.ownership) {
    assessmentPatch.ownership_inputs = {
      ...applied.ownership,
      evidenceSource: `Full Generic Workbook · ${analysis.filename}`,
    }
  }

  const metadata = {
    ...((assessment.metadata as Record<string, unknown> | null) ?? {}),
    generic_workbook_import: {
      status: assessmentPatch.workbook_import_status,
      pending_analysis: null,
      confirmed_snapshot: assessmentPatch.workbook_import_snapshot,
    },
  }
  assessmentPatch.metadata = metadata

  await supabase.from('scorecard_assessments').update(assessmentPatch).eq('id', assessmentId)

  if (applied.managementControl || applied.managementControlImportSnapshot) {
    await upsertElementRow({
      supabase,
      assessmentId,
      elementKey: 'management_control',
      patch: {
        status: 'needs_review',
        contextual_inputs: applied.managementControl ?? {},
        import_snapshot: applied.managementControlImportSnapshot,
        upload_filename: analysis.filename,
        sheet_name: 'Board + Executive registers',
        calculation_rule_version: analysis.importVersion,
        needs_recalculation: true,
        warnings: ['Imported from full Generic workbook. EAP target set still required before scoring.'],
      },
    })
  }

  if (applied.skillsDevelopment) {
    await upsertElementRow({
      supabase,
      assessmentId,
      elementKey: 'skills_development',
      patch: {
        status: 'needs_review',
        contextual_inputs: applied.skillsDevelopment,
        upload_filename: analysis.filename,
        calculation_rule_version: analysis.importVersion,
        needs_recalculation: true,
        warnings: ['Skills eligibility gates require confirmation before points are awarded.'],
      },
    })
  }

  if (applied.sedImportSnapshot) {
    await upsertElementRow({
      supabase,
      assessmentId,
      elementKey: 'socio_economic_development',
      patch: {
        status: 'needs_review',
        import_snapshot: applied.sedImportSnapshot,
        upload_filename: analysis.filename,
        sheet_name: 'SED',
        calculation_rule_version: analysis.importVersion,
        needs_recalculation: true,
      },
    })
  }

  async function replaceContributions(
    elementKey: 'enterprise_development' | 'supplier_development' | 'socio_economic_development',
    records: ContributionRecord[] | null,
  ) {
    if (!records) return
    await supabase
      .from('scorecard_contribution_records')
      .delete()
      .eq('assessment_id', assessmentId)
      .eq('element_key', elementKey)

    if (records.length === 0) return

    const claimedByIndex =
      elementKey === 'socio_economic_development'
        ? ((analysis.sedImportSnapshot as { rows?: { claimed_raw?: unknown }[] } | null)?.rows ?? [])
        : []

    await supabase.from('scorecard_contribution_records').insert(
      records.map((record, index) => ({
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
        notes: record.notes,
        black_beneficiary_percentage: record.blackBeneficiaryPercentage,
        claimed_raw:
          elementKey === 'socio_economic_development'
            ? claimedByIndex[index]?.claimed_raw == null
              ? null
              : String(claimedByIndex[index]?.claimed_raw)
            : null,
        source_sheet: analysis.filename,
        // Imported contributions carry a defaulted 'grant_contribution' type
        // exactly as manually-entered ones do, so they must be findable by the
        // same phase-2 query.
        warnings: [
          'Imported from full Generic workbook. Confirm benefit factors and evidence.',
          CONTRIBUTION_TYPE_DEFAULTED_MARKER,
        ],
      })),
    )

    await upsertElementRow({
      supabase,
      assessmentId,
      elementKey,
      patch: {
        status: 'needs_review',
        upload_filename: analysis.filename,
        needs_recalculation: true,
        warnings: ['Imported from full Generic workbook.'],
      },
    })
  }

  await replaceContributions('enterprise_development', applied.enterpriseDevelopmentContributions)
  await replaceContributions('supplier_development', applied.supplierDevelopmentContributions)
  await replaceContributions('socio_economic_development', applied.socioEconomicDevelopmentContributions)

  await recordAudit({
    supabase,
    assessmentId,
    action: 'workbook.imported',
    actor: user.id,
    detail: {
      filename: analysis.filename,
      checksumSha256: analysis.checksumSha256,
      decisions,
      appliedElements: applied.appliedElements,
      skippedElements: applied.skippedElements,
    },
  })

  revalidatePath(basePath(assessmentId))
  redirect(`${basePath(assessmentId)}?imported=1`)
}

// ---------------------------------------------------------------------------
// Attach the active EAP target set to an existing assessment
// ---------------------------------------------------------------------------
/**
 * Management Control and Skills Development cannot score without an EAP target
 * set. New assessments pick up the active set at creation; this is how an
 * assessment created before a set existed catches up, without recreating it.
 */
export async function attachEapTargetSetToGenericAssessment(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const { supabase, user, assessment } = await requireOwnedAssessment(assessmentId)

  const targetSetId = await findActiveEapTargetSet(supabase, Number(assessment.measurement_year))
  if (!targetSetId) {
    return finish(
      assessmentId,
      'review',
      `error=${encodeURIComponent(
        `No active EAP target set exists for ${assessment.measurement_year}. An administrator can create one under Settings, EAP targets.`,
      )}`,
    )
  }

  const built = await buildEapSnapshot(supabase, targetSetId)
  if (built.error) {
    return finish(assessmentId, 'review', `error=${encodeURIComponent(built.error)}`)
  }

  await supabase
    .from('scorecard_assessments')
    .update({
      eap_target_set_id: targetSetId,
      // Clear the frozen snapshot so the next calculation captures the set as
      // it stands now.
      eap_target_snapshot: null,
      needs_recalculation: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)

  await recordAudit({
    supabase,
    assessmentId,
    action: 'eap_target_set.attached',
    actor: user.id,
    detail: { targetSetId },
  })

  return finish(assessmentId, 'review', 'saved=1')
}
