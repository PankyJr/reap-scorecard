/**
 * Mapping between stored assessment rows and the pure calculation engine.
 *
 * Everything here is deliberately free of Supabase types so it can be unit
 * tested. The server actions supply plain rows.
 */

import type { GenericElementKey } from '../rules/types'
import type { GenericScorecardInputs } from '.'
import { EMPTY_APPLICABILITY_INPUTS, type ApplicabilityInputs } from './applicability'
import { EMPTY_FINANCIAL_INPUTS, type FinancialInputs } from './financial'
import { EMPTY_OWNERSHIP_INPUTS, type OwnershipInputs } from './elements/ownership'
import {
  EMPTY_MANAGEMENT_CONTROL_INPUTS,
  type ManagementControlInputs,
} from './elements/management-control'
import {
  EMPTY_SKILLS_DEVELOPMENT_INPUTS,
  type SkillsDevelopmentInputs,
} from './elements/skills-development'
import type { ProcurementSnapshot } from './elements/procurement'
import type { ContributionRecord } from './elements/contributions'
import type { GenericScorecardCalculation } from '.'

export type StoredAssessmentRow = {
  id: string
  rule_set_key: string | null
  eap_target_set_id: string | null
  eap_target_snapshot: unknown
  applicability_snapshot: unknown
  financial_inputs: unknown
  ownership_inputs: unknown
  procurement_snapshot: unknown
  scope_mode: string
  selected_elements: string[] | null
}

export type StoredElementRow = {
  element_key: string
  status: string
  contextual_inputs: unknown
  import_snapshot: unknown
}

export type StoredContributionRow = {
  id: string
  element_key: string
  beneficiary_name: string | null
  beneficiary_classification: string | null
  beneficiary_black_ownership_percentage: number | string | null
  was_eme_or_qse_at_first_assistance: boolean | null
  years_since_first_assistance: number | string | null
  contribution_type: string | null
  actual_value: number | string | null
  supplied_benefit_factor: number | string | null
  contribution_date: string | null
  evidence_provided: boolean | null
  black_beneficiary_percentage: number | string | null
  notes: string | null
  /** Raw workbook "Claimed" column. Never scored. */
  claimed_raw?: string | null
}

const ELEMENT_KEYS: GenericElementKey[] = [
  'ownership',
  'management_control',
  'skills_development',
  'preferential_procurement',
  'supplier_development',
  'enterprise_development',
  'socio_economic_development',
]

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Merge stored JSON over a typed default so new fields always have a value. */
function hydrate<T extends object>(defaults: T, stored: unknown): T {
  const record = asRecord(stored)
  const result = { ...defaults } as Record<string, unknown>
  for (const key of Object.keys(defaults)) {
    if (key in record) result[key] = record[key]
  }
  // Fields not present on the default (e.g. optional override objects).
  for (const key of ['npatOverride', 'fullScorecardElection']) {
    if (key in record) result[key] = record[key]
  }
  return result as T
}

export function hydrateApplicability(stored: unknown): ApplicabilityInputs {
  return hydrate(EMPTY_APPLICABILITY_INPUTS, stored)
}

export function hydrateFinancialInputs(stored: unknown): FinancialInputs {
  return hydrate(EMPTY_FINANCIAL_INPUTS, stored)
}

export function hydrateOwnership(stored: unknown): OwnershipInputs {
  return hydrate(EMPTY_OWNERSHIP_INPUTS, stored)
}

export function hydrateManagementControl(stored: unknown): ManagementControlInputs {
  return hydrate(EMPTY_MANAGEMENT_CONTROL_INPUTS, stored)
}

export function hydrateSkillsDevelopment(stored: unknown): SkillsDevelopmentInputs {
  return hydrate(EMPTY_SKILLS_DEVELOPMENT_INPUTS, stored)
}

export function hydrateProcurementSnapshot(stored: unknown): ProcurementSnapshot | null {
  const record = asRecord(stored)
  if (!record.sourceAssessmentId) return null
  return record as unknown as ProcurementSnapshot
}

export function hydrateContribution(row: StoredContributionRow): ContributionRecord {
  return {
    id: row.id,
    beneficiaryName: row.beneficiary_name,
    beneficiaryClassification:
      (row.beneficiary_classification as ContributionRecord['beneficiaryClassification']) ?? null,
    beneficiaryBlackOwnershipPercentage: num(row.beneficiary_black_ownership_percentage),
    wasEmeOrQseAtFirstAssistance: row.was_eme_or_qse_at_first_assistance,
    yearsSinceFirstAssistance: num(row.years_since_first_assistance),
    contributionType: row.contribution_type,
    actualValue: num(row.actual_value),
    suppliedBenefitFactor: num(row.supplied_benefit_factor),
    contributionDate: row.contribution_date,
    evidenceProvided: row.evidence_provided === true,
    notes: row.notes,
    blackBeneficiaryPercentage: num(row.black_beneficiary_percentage),
    manualOverride: null,
  }
}

/** EAP distribution stored on the assessment snapshot, if one has been attached. */
export function eapDistributionFromSnapshot(snapshot: unknown): {
  distribution: SkillsDevelopmentInputs['eapDistribution']
  label: string | null
} {
  const record = asRecord(snapshot)
  const values = Array.isArray(record.values) ? record.values : []
  if (values.length === 0) return { distribution: null, label: null }

  const distribution: Record<string, number> = {}
  for (const entry of values) {
    const item = asRecord(entry)
    const demographic = typeof item.demographic_key === 'string' ? item.demographic_key : null
    const value = num(item.target_value)
    if (!demographic || value == null) continue
    // Values are stored as percentages in the admin UI.
    distribution[demographic] = value > 1 ? value / 100 : value
  }

  const required = [
    'african_male',
    'coloured_male',
    'indian_male',
    'african_female',
    'coloured_female',
    'indian_female',
  ]
  if (!required.every((key) => typeof distribution[key] === 'number')) {
    return { distribution: null, label: null }
  }

  const name = typeof record.name === 'string' ? record.name : 'EAP target set'
  const version = record.version == null ? '' : ` v${String(record.version)}`
  return {
    distribution: distribution as SkillsDevelopmentInputs['eapDistribution'],
    label: `${name}${version}`,
  }
}

export function elementKeysInScope(assessment: StoredAssessmentRow): GenericElementKey[] | undefined {
  if (assessment.scope_mode === 'full') return undefined
  const selected = (assessment.selected_elements ?? []).filter((key): key is GenericElementKey =>
    ELEMENT_KEYS.includes(key as GenericElementKey),
  )
  return selected.length > 0 ? selected : undefined
}

export function buildGenericInputs(args: {
  assessment: StoredAssessmentRow
  elements: StoredElementRow[]
  contributions: StoredContributionRow[]
  allowNonProductionDraft?: boolean
  additionalReadinessBlockers?: string[]
}): GenericScorecardInputs {
  const { assessment, elements, contributions } = args
  const byKey = new Map(elements.map((element) => [element.element_key, element]))
  const { distribution, label } = eapDistributionFromSnapshot(assessment.eap_target_snapshot)

  const managementControl = hydrateManagementControl(byKey.get('management_control')?.contextual_inputs)
  const skillsDevelopment = hydrateSkillsDevelopment(byKey.get('skills_development')?.contextual_inputs)

  const contributionsFor = (elementKey: string) =>
    contributions.filter((row) => row.element_key === elementKey).map(hydrateContribution)

  const bonusFlags = (elementKey: string) => {
    const record = asRecord(byKey.get(elementKey)?.contextual_inputs)
    return {
      bonusConfirmed: typeof record.bonusConfirmed === 'boolean' ? record.bonusConfirmed : null,
      bonusEvidenceProvided: record.bonusEvidenceProvided === true,
    }
  }

  const blockers = [...(args.additionalReadinessBlockers ?? [])]
  for (const element of elements) {
    if (element.status === 'needs_review') {
      blockers.push(`${element.element_key} has an import awaiting review.`)
    }
  }

  return {
    ruleSetKey: assessment.rule_set_key,
    allowNonProductionDraft: args.allowNonProductionDraft,
    elementKeys: elementKeysInScope(assessment),
    applicability: hydrateApplicability(assessment.applicability_snapshot),
    financial: hydrateFinancialInputs(assessment.financial_inputs),
    ownership: hydrateOwnership(assessment.ownership_inputs),
    managementControl: { ...managementControl, eapDistribution: distribution, eapTargetSetLabel: label },
    skillsDevelopment: { ...skillsDevelopment, eapDistribution: distribution, eapTargetSetLabel: label },
    procurementSnapshot: hydrateProcurementSnapshot(assessment.procurement_snapshot),
    enterpriseDevelopment: {
      records: contributionsFor('enterprise_development'),
      ...bonusFlags('enterprise_development'),
    },
    supplierDevelopment: {
      records: contributionsFor('supplier_development'),
      ...bonusFlags('supplier_development'),
    },
    socioEconomicDevelopment: { records: contributionsFor('socio_economic_development') },
    additionalReadinessBlockers: blockers,
  }
}

/** Columns written back to `scorecard_assessments` after a calculation. */
export function assessmentResultColumns(result: GenericScorecardCalculation) {
  return {
    rule_set_key: result.ruleSetKey,
    rule_set_version: result.ruleSetVersion,
    overall_result_snapshot: result as unknown as Record<string, unknown>,
    preliminary_level: result.preliminaryLevel.level,
    final_level: result.readiness.complete ? result.finalLevel.level : null,
    recognition_percentage: result.readiness.complete ? result.finalLevel.recognitionPercentage : null,
    discount_applied: result.discountApplied,
    readiness_complete: result.readiness.complete,
    readiness_reasons: result.readiness.reasons,
    needs_recalculation: false,
    updated_at: new Date().toISOString(),
  }
}

/** Rows written to `scorecard_priority_results` for one calculation run. */
export function priorityResultRows(args: {
  assessmentId: string
  calculationRunId: string | null
  result: GenericScorecardCalculation
}) {
  return args.result.prioritySubminimums.map((outcome) => ({
    assessment_id: args.assessmentId,
    calculation_run_id: args.calculationRunId,
    priority_key: outcome.key,
    element_key: outcome.elementKey,
    label: outcome.label,
    basis_points: outcome.basisPoints,
    threshold_points: outcome.thresholdPoints,
    achieved_points: outcome.achievedPoints,
    passed: outcome.passed,
    evaluated: outcome.evaluated,
    explanation: outcome.explanation,
  }))
}

/** Row written to `scorecard_calculation_runs` for a whole-scorecard calculation. */
export function calculationRunRow(args: {
  assessmentId: string
  userId: string | null
  result: GenericScorecardCalculation
  inputs: GenericScorecardInputs
  eapTargetSetVersion: string | null
}) {
  return {
    assessment_id: args.assessmentId,
    element_key: null,
    created_by: args.userId,
    rule_version: args.result.ruleSetKey,
    rule_set_key: args.result.ruleSetKey,
    rule_set_version: args.result.ruleSetVersion,
    rule_source: { displayName: args.result.ruleSetDisplayName },
    eap_target_set_version: args.eapTargetSetVersion,
    status: 'completed' as const,
    input_snapshot: args.inputs as unknown as Record<string, unknown>,
    result_snapshot: args.result as unknown as Record<string, unknown>,
    base_points: args.result.totalBasePointsAchieved,
    bonus_points: args.result.totalBonusPointsAchieved,
    raw_total_points: args.result.rawTotalPoints,
    preliminary_level: args.result.preliminaryLevel.level,
    final_level: args.result.readiness.complete ? args.result.finalLevel.level : null,
    recognition_percentage: args.result.readiness.complete
      ? args.result.finalLevel.recognitionPercentage
      : null,
    discount_applied: args.result.discountApplied,
    subminimum_snapshot: args.result.prioritySubminimums,
    formula_breakdown: args.result.elements.map((element) => ({
      elementKey: element.elementKey,
      basePointsAchieved: element.basePointsAchieved,
      bonusPointsAchieved: element.bonusPointsAchieved,
      indicators: element.indicators.map((indicator) => ({
        indicatorKey: indicator.indicatorKey,
        numerator: indicator.numerator,
        denominator: indicator.denominator,
        actual: indicator.actual,
        target: indicator.target,
        basePointsAchieved: indicator.basePointsAchieved,
        bonusPointsAchieved: indicator.bonusPointsAchieved,
        explanation: indicator.explanation,
        ruleSource: indicator.ruleSource,
      })),
    })),
    warnings: args.result.warnings,
  }
}
