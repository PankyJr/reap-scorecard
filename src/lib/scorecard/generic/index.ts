import { resolveRuleSet } from '../rules/registry'
import type { GenericElementKey } from '../rules/types'
import { aggregateGenericScorecard, PARTIAL_RESULT_MESSAGE } from './aggregate'
import { evaluateApplicability, type ApplicabilityInputs, type ApplicabilityResult } from './applicability'
import { calculateContributionElement, type ContributionRecord } from './elements/contributions'
import { calculateManagementControl, type ManagementControlInputs } from './elements/management-control'
import { calculateOwnership, type OwnershipInputs } from './elements/ownership'
import { calculatePreferentialProcurement, type ProcurementSnapshot } from './elements/procurement'
import { calculateSkillsDevelopment, type SkillsDevelopmentInputs } from './elements/skills-development'
import { contributionTargets, resolveNpatDenominator, type FinancialInputs, type NpatResolution } from './financial'
import type { ContributionTargets } from './financial'
import type { ElementResult, GenericScorecardResult } from './types'

export type ContributionElementInput = {
  records: ContributionRecord[]
  bonusConfirmed?: boolean | null
  bonusEvidenceProvided?: boolean
}

export type GenericScorecardInputs = {
  ruleSetKey?: string | null
  allowNonProductionDraft?: boolean
  /** Limit calculation to a subset of elements. Omit for all elements. */
  elementKeys?: GenericElementKey[]
  applicability: ApplicabilityInputs
  financial: FinancialInputs
  ownership: OwnershipInputs
  managementControl: ManagementControlInputs
  skillsDevelopment: SkillsDevelopmentInputs
  procurementSnapshot: ProcurementSnapshot | null
  enterpriseDevelopment: ContributionElementInput
  supplierDevelopment: ContributionElementInput
  socioEconomicDevelopment: ContributionElementInput
  additionalReadinessBlockers?: string[]
}

export type GenericScorecardCalculation = GenericScorecardResult & {
  applicability: ApplicabilityResult
  npat: NpatResolution
  contributionTargets: ContributionTargets
  ruleSetOperative: boolean
  ruleSetBlockedReason: string | null
  /** Honest headline shown whenever a final level may not be published. */
  headlineMessage: string
  calculatedAt: string
}

export function calculateGenericScorecard(inputs: GenericScorecardInputs): GenericScorecardCalculation {
  const selection = resolveRuleSet({
    requestedKey: inputs.ruleSetKey,
    allowNonProductionDraft: inputs.allowNonProductionDraft,
  })
  const ruleSet = selection.ruleSet

  const applicability = evaluateApplicability(inputs.applicability)
  const npat = resolveNpatDenominator(inputs.financial)
  const targets = contributionTargets(npat.applicableNpat)

  const requested = inputs.elementKeys
  const wanted = (key: GenericElementKey) => requested == null || requested.includes(key)

  const elements: ElementResult[] = []

  if (wanted('ownership')) {
    elements.push(calculateOwnership({ ruleSet, inputs: inputs.ownership }))
  }
  if (wanted('management_control')) {
    elements.push(calculateManagementControl({ ruleSet, inputs: inputs.managementControl }))
  }
  if (wanted('skills_development')) {
    elements.push(calculateSkillsDevelopment({ ruleSet, inputs: inputs.skillsDevelopment }))
  }
  if (wanted('preferential_procurement')) {
    elements.push(calculatePreferentialProcurement({ ruleSet, snapshot: inputs.procurementSnapshot }))
  }
  if (wanted('supplier_development')) {
    elements.push(
      calculateContributionElement({
        ruleSet,
        elementKey: 'supplier_development',
        inputs: {
          records: inputs.supplierDevelopment.records,
          applicableNpat: npat.applicableNpat,
          npatReason: npat.reason,
          bonusConfirmed: inputs.supplierDevelopment.bonusConfirmed,
          bonusEvidenceProvided: inputs.supplierDevelopment.bonusEvidenceProvided,
        },
      }),
    )
  }
  if (wanted('enterprise_development')) {
    elements.push(
      calculateContributionElement({
        ruleSet,
        elementKey: 'enterprise_development',
        inputs: {
          records: inputs.enterpriseDevelopment.records,
          applicableNpat: npat.applicableNpat,
          npatReason: npat.reason,
          bonusConfirmed: inputs.enterpriseDevelopment.bonusConfirmed,
          bonusEvidenceProvided: inputs.enterpriseDevelopment.bonusEvidenceProvided,
        },
      }),
    )
  }
  if (wanted('socio_economic_development')) {
    elements.push(
      calculateContributionElement({
        ruleSet,
        elementKey: 'socio_economic_development',
        inputs: {
          records: inputs.socioEconomicDevelopment.records,
          applicableNpat: npat.applicableNpat,
          npatReason: npat.reason,
        },
      }),
    )
  }

  const additionalReadinessBlockers = [...(inputs.additionalReadinessBlockers ?? [])]
  if (requested != null) {
    const omitted = ruleSet.elements
      .map((element) => element.elementKey)
      .filter((key) => !requested.includes(key))
    if (omitted.length > 0) {
      additionalReadinessBlockers.push(
        `This calculation covers ${requested.length} of ${ruleSet.elements.length} elements. ${omitted.length} element${omitted.length === 1 ? ' was' : 's were'} not in scope.`,
      )
    }
  }
  if (selection.blockedReason) additionalReadinessBlockers.push(selection.blockedReason)

  const aggregate = aggregateGenericScorecard({
    ruleSet,
    elements,
    applicability,
    npat,
    ruleSetOperative: selection.operative,
    additionalReadinessBlockers,
  })

  return {
    ...aggregate,
    applicability,
    npat,
    contributionTargets: targets,
    ruleSetOperative: selection.operative,
    ruleSetBlockedReason: selection.blockedReason,
    headlineMessage: aggregate.readiness.complete
      ? `${aggregate.finalLevel.level} — ${aggregate.finalLevel.recognitionPercentage}% B-BBEE recognition.`
      : PARTIAL_RESULT_MESSAGE,
    calculatedAt: new Date().toISOString(),
  }
}

export { PARTIAL_RESULT_MESSAGE }
export * from './types'
export * from './scoring'
export * from './financial'
export * from './applicability'
export * from './benefit-factors'
export * from './aggregate'
export { calculateOwnership, EMPTY_OWNERSHIP_INPUTS, netValuePointsFrom } from './elements/ownership'
export type { OwnershipInputs } from './elements/ownership'
export { calculateManagementControl, EMPTY_MANAGEMENT_CONTROL_INPUTS } from './elements/management-control'
export type {
  ManagementControlInputs,
  DirectRepresentationCounts,
  OccupationalBandCounts,
} from './elements/management-control'
export {
  calculateSkillsDevelopment,
  EMPTY_SKILLS_DEVELOPMENT_INPUTS,
  applySkillsCaps,
  CATEGORY_F_G_CAP_FRACTION,
  TRAINING_ADMINISTRATION_CAP_FRACTION,
} from './elements/skills-development'
export type { SkillsDevelopmentInputs } from './elements/skills-development'
export { calculatePreferentialProcurement, PROCUREMENT_CRITERION_KEYS } from './elements/procurement'
export type { ProcurementSnapshot, ProcurementCriterionKey } from './elements/procurement'
export {
  calculateContributionElement,
  evaluateContribution,
} from './elements/contributions'
export type {
  ContributionRecord,
  EvaluatedContribution,
  BeneficiaryClassification,
  ManualRecognisedValueOverride,
} from './elements/contributions'
