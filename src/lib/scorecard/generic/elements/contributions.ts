import type { GenericElementKey, RuleSet } from '../../rules/types'
import { elementWeighting, indicatorsForElement } from '../../rules/types'
import { resolveBenefitFactor, type ContributionScope } from '../benefit-factors'
import { missingInputResult, scoreBooleanBonus, scoreProportionalIndicator, type IndicatorResult } from '../scoring'
import { summariseElement, round2, type ElementResult } from '../types'

export type BeneficiaryClassification = 'eme' | 'qse' | 'generic' | 'individual' | 'unknown'

export type ManualRecognisedValueOverride = {
  value: number
  previousValue: number | null
  reason: string
  overriddenBy: string
  overriddenAt: string
}

export type ContributionRecord = {
  /** Stable identifier within the assessment. */
  id: string
  beneficiaryName: string | null
  beneficiaryClassification: BeneficiaryClassification | null
  /** Fraction, e.g. 0.51. */
  beneficiaryBlackOwnershipPercentage: number | null
  /** Only relevant where a generic beneficiary was an EME/QSE when first assisted. */
  wasEmeOrQseAtFirstAssistance: boolean | null
  yearsSinceFirstAssistance: number | null
  contributionType: string | null
  actualValue: number | null
  /** Only used for rate-based benefit factors. */
  suppliedBenefitFactor: number | null
  contributionDate: string | null
  evidenceProvided: boolean
  notes: string | null
  /** Socio-Economic Development only: fraction of beneficiaries who are black. */
  blackBeneficiaryPercentage: number | null
  /** Raw workbook "Claimed" column. Never scored. */
  claimedRaw?: string | null
  sourceSheet?: string | null
  sourceRowNumber?: number | null
  manualOverride?: ManualRecognisedValueOverride | null
}

export type EvaluatedContribution = {
  record: ContributionRecord
  benefitFactor: number | null
  recognisedValue: number | null
  eligible: boolean
  eligibilityReason: string
  warnings: string[]
}

export type ContributionEligibilityMode = 'esd_beneficiary' | 'sed_beneficiary'

function evaluateEligibility(
  record: ContributionRecord,
  mode: ContributionEligibilityMode,
): { eligible: boolean; reason: string } {
  if (mode === 'sed_beneficiary') {
    if (record.blackBeneficiaryPercentage == null) {
      return {
        eligible: false,
        reason: 'The percentage of black beneficiaries has not been captured, so the contribution cannot be recognised.',
      }
    }
    if (record.blackBeneficiaryPercentage <= 0) {
      return { eligible: false, reason: 'No black beneficiaries, so the contribution is not recognisable.' }
    }
    return {
      eligible: true,
      reason:
        record.blackBeneficiaryPercentage >= 0.75
          ? `${(record.blackBeneficiaryPercentage * 100).toFixed(0)}% black beneficiaries.`
          : `${(record.blackBeneficiaryPercentage * 100).toFixed(0)}% black beneficiaries — recognised pro rata.`,
    }
  }

  const ownership = record.beneficiaryBlackOwnershipPercentage
  if (ownership == null) {
    return {
      eligible: false,
      reason: 'Beneficiary black ownership has not been captured.',
    }
  }
  if (ownership < 0.51) {
    return {
      eligible: false,
      reason: `The beneficiary is ${(ownership * 100).toFixed(0)}% black owned. Enterprise and supplier development beneficiaries must be at least 51% black owned.`,
    }
  }

  const classification = record.beneficiaryClassification
  if (classification === 'eme' || classification === 'qse') {
    return { eligible: true, reason: `At least 51% black-owned ${classification.toUpperCase()} beneficiary.` }
  }

  if (classification === 'generic') {
    if (record.wasEmeOrQseAtFirstAssistance !== true) {
      return {
        eligible: false,
        reason:
          'A generic beneficiary only qualifies if it was an EME or QSE when it first received assistance from the measured entity.',
      }
    }
    if (record.yearsSinceFirstAssistance == null) {
      return {
        eligible: false,
        reason: 'The number of years since first assistance has not been captured, so the five-year window cannot be checked.',
      }
    }
    if (record.yearsSinceFirstAssistance > 5) {
      return {
        eligible: false,
        reason: `First assistance was ${record.yearsSinceFirstAssistance} years ago, outside the five-year window for a beneficiary that has grown beyond QSE size.`,
      }
    }
    return {
      eligible: true,
      reason: 'Generic beneficiary that was an EME or QSE at first assistance, within the five-year window.',
    }
  }

  return {
    eligible: false,
    reason: 'The beneficiary classification (EME, QSE or generic) has not been captured.',
  }
}

export function evaluateContribution(args: {
  record: ContributionRecord
  scope: ContributionScope
  mode: ContributionEligibilityMode
}): EvaluatedContribution {
  const { record, scope, mode } = args
  const warnings: string[] = []

  const { eligible, reason } = evaluateEligibility(record, mode)
  const { factor, warnings: factorWarnings } = resolveBenefitFactor({
    scope,
    contributionType: record.contributionType,
    suppliedFactor: record.suppliedBenefitFactor,
  })
  warnings.push(...factorWarnings)

  if (!record.evidenceProvided) {
    warnings.push('No supporting evidence has been recorded for this contribution.')
  }

  if (record.manualOverride) {
    warnings.push(
      `Recognised value manually set to ${record.manualOverride.value} by ${record.manualOverride.overriddenBy} on ${record.manualOverride.overriddenAt}: ${record.manualOverride.reason}`,
    )
    return {
      record,
      benefitFactor: factor,
      recognisedValue: eligible && record.evidenceProvided ? record.manualOverride.value : null,
      eligible,
      eligibilityReason: reason,
      warnings,
    }
  }

  if (!eligible || !record.evidenceProvided || factor == null || record.actualValue == null) {
    return { record, benefitFactor: factor, recognisedValue: null, eligible, eligibilityReason: reason, warnings }
  }

  const proRata = mode === 'sed_beneficiary' ? Math.min(record.blackBeneficiaryPercentage ?? 1, 1) : 1
  const recognisedValue = round2(record.actualValue * factor * proRata)

  return { record, benefitFactor: factor, recognisedValue, eligible, eligibilityReason: reason, warnings }
}

export type ContributionElementInputs = {
  records: ContributionRecord[]
  /** Applicable NPAT denominator resolved from shared financial inputs. */
  applicableNpat: number | null
  npatReason: string
  /** ESD bonus confirmations. */
  bonusConfirmed?: boolean | null
  bonusEvidenceProvided?: boolean
}

const ELEMENT_CONFIG: Record<
  Extract<GenericElementKey, 'enterprise_development' | 'supplier_development' | 'socio_economic_development'>,
  { scope: ContributionScope; mode: ContributionEligibilityMode; contributionKey: string; bonusKey: string | null }
> = {
  enterprise_development: {
    scope: 'esd',
    mode: 'esd_beneficiary',
    contributionKey: 'enterprise_development.contributions',
    bonusKey: 'enterprise_development.bonus.job_creation',
  },
  supplier_development: {
    scope: 'esd',
    mode: 'esd_beneficiary',
    contributionKey: 'supplier_development.contributions',
    bonusKey: 'supplier_development.bonus.graduation',
  },
  socio_economic_development: {
    scope: 'sed',
    mode: 'sed_beneficiary',
    contributionKey: 'socio_economic_development.contributions',
    bonusKey: null,
  },
}

export type ContributionElementResult = ElementResult & {
  evaluatedContributions: EvaluatedContribution[]
  totalRecognisedValue: number | null
}

export function calculateContributionElement(args: {
  ruleSet: RuleSet
  elementKey: keyof typeof ELEMENT_CONFIG
  inputs: ContributionElementInputs
}): ContributionElementResult {
  const { ruleSet, elementKey, inputs } = args
  const config = ELEMENT_CONFIG[elementKey]
  const rules = indicatorsForElement(ruleSet, elementKey)
  const weighting = elementWeighting(ruleSet, elementKey)

  const contributionRule = rules.find((rule) => rule.key === config.contributionKey)
  if (!contributionRule) {
    throw new Error(`Contribution rule ${config.contributionKey} missing from rule set ${ruleSet.key}`)
  }

  const warnings: string[] = []
  const missingInputs: string[] = []
  const results: IndicatorResult[] = []

  const evaluated = inputs.records.map((record) =>
    evaluateContribution({ record, scope: config.scope, mode: config.mode }),
  )
  const recognisedValues = evaluated.map((item) => item.recognisedValue).filter((value): value is number => value != null)
  const totalRecognisedValue = evaluated.length === 0 ? null : round2(recognisedValues.reduce((sum, value) => sum + value, 0))

  const ineligible = evaluated.filter((item) => !item.eligible)
  if (ineligible.length > 0) {
    warnings.push(
      `${ineligible.length} of ${evaluated.length} contribution${evaluated.length === 1 ? '' : 's'} were excluded as ineligible or unevidenced.`,
    )
  }

  if (inputs.applicableNpat == null) {
    missingInputs.push('Applicable NPAT denominator')
    results.push(
      missingInputResult({
        rule: contributionRule,
        numerator: totalRecognisedValue,
        reason: `The applicable NPAT denominator has not been resolved, so ${weighting.displayName.toLowerCase()} cannot be scored. ${inputs.npatReason}`,
      }),
    )
  } else if (inputs.applicableNpat <= 0) {
    missingInputs.push('A positive applicable NPAT denominator')
    results.push(
      missingInputResult({
        rule: contributionRule,
        numerator: totalRecognisedValue,
        denominator: inputs.applicableNpat,
        reason: `The applicable NPAT denominator is zero or negative, so a percentage-of-NPAT target cannot be computed. ${inputs.npatReason}`,
      }),
    )
  } else if (evaluated.length === 0) {
    results.push(
      missingInputResult({
        rule: contributionRule,
        denominator: inputs.applicableNpat,
        reason: 'No contributions have been captured for this element.',
      }),
    )
  } else {
    results.push(
      scoreProportionalIndicator({
        rule: contributionRule,
        numerator: totalRecognisedValue,
        denominator: inputs.applicableNpat,
        extraWarnings: [inputs.npatReason],
      }),
    )
  }

  if (config.bonusKey) {
    const bonusRule = rules.find((rule) => rule.key === config.bonusKey)
    if (bonusRule) {
      results.push(
        scoreBooleanBonus({
          rule: bonusRule,
          confirmed: inputs.bonusConfirmed ?? null,
          evidenceProvided: inputs.bonusEvidenceProvided ?? false,
        }),
      )
    }
  }

  const element = summariseElement({
    elementKey,
    displayName: weighting.displayName,
    indicators: results,
    basePointsAvailable: weighting.basePoints,
    bonusPointsAvailable: weighting.bonusPoints,
    missingInputs,
    warnings: [...warnings, ...evaluated.flatMap((item) => item.warnings)],
    notStarted: evaluated.length === 0 && inputs.bonusConfirmed == null,
  })

  return { ...element, evaluatedContributions: evaluated, totalRecognisedValue }
}
