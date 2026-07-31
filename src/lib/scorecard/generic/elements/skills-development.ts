import type { IndicatorRule, RuleSet } from '../../rules/types'
import { elementWeighting, indicatorsForElement } from '../../rules/types'
import {
  EAP_DEMOGRAPHIC_KEYS,
  missingInputResult,
  scoreEapDisaggregated,
  scoreProportionalIndicator,
  type EapDistribution,
  type EapHeadcounts,
  type IndicatorResult,
} from '../scoring'
import { summariseElement, type ElementResult } from '../types'

/** Statement 300 §3.1: informal and workplace learning (categories F and G) recognition cap. */
export const CATEGORY_F_G_CAP_FRACTION = 0.15
/** Statement 300: training administration cost cap. */
export const TRAINING_ADMINISTRATION_CAP_FRACTION = 0.15

export type SkillsDevelopmentInputs = {
  leviableAmount: number | null
  totalEmployees: number | null

  /** Mandatory eligibility gates. Points are withheld until each is confirmed. */
  wspAtrSetaApproved: boolean | null
  pivotalReportSubmitted: boolean | null
  prioritySkillsProgrammeImplemented: boolean | null
  trainingRegisterMaintained: boolean | null

  /** Recognised skills development expenditure on black people, by EAP band. */
  generalTrainingSpendByDemographic: EapHeadcounts
  /** Recognised bursary expenditure for black students, by EAP band. */
  bursarySpendByDemographic: EapHeadcounts
  /** Recognised expenditure on black employees with disabilities. */
  disabilityTrainingSpend: number | null
  /** Black learners on learnerships, apprenticeships and internships, by EAP band. */
  learnerHeadcountByDemographic: EapHeadcounts

  /** Cap inputs. */
  totalSkillsDevelopmentSpend: number | null
  informalWorkplaceLearningSpend: number | null
  trainingAdministrationCost: number | null

  /** Absorption bonus. */
  learnersCompleted: number | null
  learnersAbsorbed: number | null

  eapDistribution: EapDistribution | null
  eapTargetSetLabel: string | null
}

export const EMPTY_SKILLS_DEVELOPMENT_INPUTS: SkillsDevelopmentInputs = {
  leviableAmount: null,
  totalEmployees: null,
  wspAtrSetaApproved: null,
  pivotalReportSubmitted: null,
  prioritySkillsProgrammeImplemented: null,
  trainingRegisterMaintained: null,
  generalTrainingSpendByDemographic: {},
  bursarySpendByDemographic: {},
  disabilityTrainingSpend: null,
  learnerHeadcountByDemographic: {},
  totalSkillsDevelopmentSpend: null,
  informalWorkplaceLearningSpend: null,
  trainingAdministrationCost: null,
  learnersCompleted: null,
  learnersAbsorbed: null,
  eapDistribution: null,
  eapTargetSetLabel: null,
}

function sumDemographic(values: EapHeadcounts): number {
  return EAP_DEMOGRAPHIC_KEYS.reduce((sum, key) => sum + (values[key] ?? 0), 0)
}

function hasDemographic(values: EapHeadcounts): boolean {
  return EAP_DEMOGRAPHIC_KEYS.some((key) => values[key] != null)
}

/** Scale every band by the same factor, used when a cap disallows part of the spend. */
function scaleDemographic(values: EapHeadcounts, factor: number): EapHeadcounts {
  const scaled: EapHeadcounts = {}
  for (const key of EAP_DEMOGRAPHIC_KEYS) {
    if (values[key] != null) scaled[key] = values[key]! * factor
  }
  return scaled
}

export type SkillsCapAdjustment = {
  capKey: string
  label: string
  capFraction: number
  capAmount: number
  claimedAmount: number
  disallowedAmount: number
}

export function applySkillsCaps(inputs: SkillsDevelopmentInputs): {
  adjustedGeneralSpend: EapHeadcounts
  adjustments: SkillsCapAdjustment[]
  warnings: string[]
} {
  const generalTotal = sumDemographic(inputs.generalTrainingSpendByDemographic)
  const capBase =
    inputs.totalSkillsDevelopmentSpend ??
    generalTotal + sumDemographic(inputs.bursarySpendByDemographic) + (inputs.disabilityTrainingSpend ?? 0)

  const adjustments: SkillsCapAdjustment[] = []
  const warnings: string[] = []
  let disallowed = 0

  if (capBase > 0 && inputs.informalWorkplaceLearningSpend != null) {
    const capAmount = capBase * CATEGORY_F_G_CAP_FRACTION
    if (inputs.informalWorkplaceLearningSpend > capAmount) {
      const excess = inputs.informalWorkplaceLearningSpend - capAmount
      disallowed += excess
      adjustments.push({
        capKey: 'category_f_g',
        label: 'Informal and workplace learning programmes (categories F and G)',
        capFraction: CATEGORY_F_G_CAP_FRACTION,
        capAmount,
        claimedAmount: inputs.informalWorkplaceLearningSpend,
        disallowedAmount: excess,
      })
      warnings.push(
        `Informal and workplace learning expenditure is capped at ${CATEGORY_F_G_CAP_FRACTION * 100}% of total skills development expenditure. ${formatRand(excess)} was disallowed.`,
      )
    }
  }

  if (capBase > 0 && inputs.trainingAdministrationCost != null) {
    const capAmount = capBase * TRAINING_ADMINISTRATION_CAP_FRACTION
    if (inputs.trainingAdministrationCost > capAmount) {
      const excess = inputs.trainingAdministrationCost - capAmount
      disallowed += excess
      adjustments.push({
        capKey: 'training_administration',
        label: 'Training administration costs',
        capFraction: TRAINING_ADMINISTRATION_CAP_FRACTION,
        capAmount,
        claimedAmount: inputs.trainingAdministrationCost,
        disallowedAmount: excess,
      })
      warnings.push(
        `Training administration costs are capped at ${TRAINING_ADMINISTRATION_CAP_FRACTION * 100}% of total skills development expenditure. ${formatRand(excess)} was disallowed.`,
      )
    }
  }

  if (disallowed <= 0 || generalTotal <= 0) {
    return { adjustedGeneralSpend: inputs.generalTrainingSpendByDemographic, adjustments, warnings }
  }

  const factor = Math.max(0, (generalTotal - disallowed) / generalTotal)
  return {
    adjustedGeneralSpend: scaleDemographic(inputs.generalTrainingSpendByDemographic, factor),
    adjustments,
    warnings,
  }
}

function formatRand(value: number): string {
  return `R${Math.round(value).toLocaleString('en-ZA')}`
}

function eligibilityGate(inputs: SkillsDevelopmentInputs): string | null {
  const unmet: string[] = []
  if (inputs.wspAtrSetaApproved !== true) unmet.push('a SETA-approved Workplace Skills Plan and Annual Training Report')
  if (inputs.pivotalReportSubmitted !== true) unmet.push('a submitted Pivotal report')
  if (inputs.prioritySkillsProgrammeImplemented !== true) unmet.push('an implemented priority skills programme')
  if (inputs.trainingRegisterMaintained !== true) unmet.push('a maintained trainee tracking register')
  if (unmet.length === 0) return null
  return `Skills Development points are withheld until the following mandatory requirements are confirmed: ${unmet.join('; ')}.`
}

export function calculateSkillsDevelopment(args: {
  ruleSet: RuleSet
  inputs: SkillsDevelopmentInputs
}): ElementResult {
  const { ruleSet, inputs } = args
  const rules = indicatorsForElement(ruleSet, 'skills_development')
  const weighting = elementWeighting(ruleSet, 'skills_development')
  const ruleFor = (key: string): IndicatorRule => {
    const rule = rules.find((candidate) => candidate.key === key)
    if (!rule) throw new Error(`Skills Development rule ${key} missing from rule set ${ruleSet.key}`)
    return rule
  }

  const missingInputs: string[] = []
  const warnings: string[] = []
  const results: IndicatorResult[] = []

  const gate = eligibilityGate(inputs)
  const eap = inputs.eapDistribution
  const { adjustedGeneralSpend, adjustments, warnings: capWarnings } = applySkillsCaps(inputs)
  warnings.push(...capWarnings)

  if (inputs.leviableAmount == null) missingInputs.push('Leviable amount')
  if (inputs.totalEmployees == null) missingInputs.push('Total employees')
  if (!eap) missingInputs.push('EAP target set')
  if (gate) missingInputs.push(gate)

  const blockAll = (rule: IndicatorRule, reason: string) =>
    missingInputResult({ rule, reason, status: 'blocked' })

  // --- General skills development expenditure ------------------------------
  {
    const rule = ruleFor('skills_development.expenditure.black_people')
    if (gate) results.push(blockAll(rule, gate))
    else if (!eap) results.push(blockAll(rule, 'No EAP target set has been selected.'))
    else
      results.push(
        scoreEapDisaggregated({
          rule,
          headcounts: adjustedGeneralSpend,
          denominator: inputs.leviableAmount,
          eap,
          femaleOnly: false,
        }),
      )
  }

  // --- Bursaries -----------------------------------------------------------
  {
    const rule = ruleFor('skills_development.bursaries.black_students')
    if (gate) results.push(blockAll(rule, gate))
    else if (!eap) results.push(blockAll(rule, 'No EAP target set has been selected.'))
    else
      results.push(
        scoreEapDisaggregated({
          rule,
          headcounts: inputs.bursarySpendByDemographic,
          denominator: inputs.leviableAmount,
          eap,
          femaleOnly: false,
        }),
      )
  }

  // --- Black employees with disabilities -----------------------------------
  {
    const rule = ruleFor('skills_development.expenditure.disabled_black_people')
    if (gate) results.push(blockAll(rule, gate))
    else
      results.push(
        scoreProportionalIndicator({
          rule,
          numerator: inputs.disabilityTrainingSpend,
          denominator: inputs.leviableAmount,
        }),
      )
  }

  // --- Learnerships, apprenticeships and internships -----------------------
  {
    const rule = ruleFor('skills_development.learnerships')
    if (gate) results.push(blockAll(rule, gate))
    else if (!eap) results.push(blockAll(rule, 'No EAP target set has been selected.'))
    else
      results.push(
        scoreEapDisaggregated({
          rule,
          headcounts: inputs.learnerHeadcountByDemographic,
          denominator: inputs.totalEmployees,
          eap,
          femaleOnly: false,
        }),
      )
  }

  // --- Absorption bonus ----------------------------------------------------
  {
    const rule = ruleFor('skills_development.bonus.absorption')
    if (gate) {
      results.push(blockAll(rule, gate))
    } else if (inputs.learnersCompleted == null) {
      results.push(
        missingInputResult({
          rule,
          reason:
            'The number of black learners who completed a learnership, apprenticeship or internship has not been captured, so the absorption bonus cannot be scored.',
        }),
      )
    } else if (inputs.learnersCompleted === 0) {
      results.push(
        missingInputResult({
          rule,
          numerator: inputs.learnersAbsorbed ?? 0,
          denominator: 0,
          reason: 'No learners completed a programme in the measurement period, so no absorption bonus is available.',
        }),
      )
    } else {
      results.push(
        scoreProportionalIndicator({
          rule,
          numerator: inputs.learnersAbsorbed ?? 0,
          denominator: inputs.learnersCompleted,
          extraWarnings: [
            'Absorption is measured as black learners absorbed into permanent employment divided by black learners who completed a programme.',
          ],
        }),
      )
    }
  }

  if (adjustments.length > 0) {
    warnings.push(
      `Recognised general skills development expenditure was reduced pro rata across EAP bands to apply ${adjustments.length} expenditure cap${adjustments.length === 1 ? '' : 's'}.`,
    )
  }
  if (inputs.eapTargetSetLabel) {
    warnings.push(`Scored against EAP target set "${inputs.eapTargetSetLabel}".`)
  }

  const notStarted =
    !hasDemographic(inputs.generalTrainingSpendByDemographic) &&
    !hasDemographic(inputs.bursarySpendByDemographic) &&
    !hasDemographic(inputs.learnerHeadcountByDemographic) &&
    inputs.disabilityTrainingSpend == null &&
    inputs.learnersCompleted == null

  return summariseElement({
    elementKey: 'skills_development',
    displayName: weighting.displayName,
    indicators: results,
    basePointsAvailable: weighting.basePoints,
    bonusPointsAvailable: weighting.bonusPoints,
    missingInputs,
    warnings,
    notStarted,
  })
}
