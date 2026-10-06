import type { RuleSet } from '../../rules/types'
import { indicatorsForElement, elementWeighting } from '../../rules/types'
import {
  missingInputResult,
  resolvePlusOneVoteTarget,
  scoreProportionalIndicator,
  type IndicatorResult,
} from '../scoring'
import { summariseElement, type ElementResult } from '../types'

export type OwnershipInputs = {
  /** Exact vote counts are preferred; they make "25% plus one vote" exact. */
  totalExercisableVotes: number | null
  blackExercisableVotes: number | null
  blackWomenExercisableVotes: number | null

  /** Percentage fallbacks, used when exact vote counts are unavailable. */
  blackVotingRightsPercentage: number | null
  blackWomenVotingRightsPercentage: number | null

  blackEconomicInterestPercentage: number | null
  blackWomenEconomicInterestPercentage: number | null
  designatedGroupsEconomicInterestPercentage: number | null
  newEntrantsEconomicInterestPercentage: number | null

  /** Verified net value result. This release does not model the transaction. */
  netValuePercentage: number | null

  evidenceSource: string | null
  practitionerNotes: string | null
  measurementDate: string | null
  modifiedFlowThroughApplied: boolean | null
  exclusionPrincipleApplied: boolean | null
}

export const EMPTY_OWNERSHIP_INPUTS: OwnershipInputs = {
  totalExercisableVotes: null,
  blackExercisableVotes: null,
  blackWomenExercisableVotes: null,
  blackVotingRightsPercentage: null,
  blackWomenVotingRightsPercentage: null,
  blackEconomicInterestPercentage: null,
  blackWomenEconomicInterestPercentage: null,
  designatedGroupsEconomicInterestPercentage: null,
  newEntrantsEconomicInterestPercentage: null,
  netValuePercentage: null,
  evidenceSource: null,
  practitionerNotes: null,
  measurementDate: null,
  modifiedFlowThroughApplied: null,
  exclusionPrincipleApplied: null,
}

function hasAnyInput(inputs: OwnershipInputs): boolean {
  return [
    inputs.totalExercisableVotes,
    inputs.blackExercisableVotes,
    inputs.blackWomenExercisableVotes,
    inputs.blackVotingRightsPercentage,
    inputs.blackWomenVotingRightsPercentage,
    inputs.blackEconomicInterestPercentage,
    inputs.blackWomenEconomicInterestPercentage,
    inputs.designatedGroupsEconomicInterestPercentage,
    inputs.newEntrantsEconomicInterestPercentage,
    inputs.netValuePercentage,
  ].some((value) => value != null)
}

export function calculateOwnership(args: { ruleSet: RuleSet; inputs: OwnershipInputs }): ElementResult {
  const { ruleSet, inputs } = args
  const rules = indicatorsForElement(ruleSet, 'ownership')
  const weighting = elementWeighting(ruleSet, 'ownership')
  const ruleFor = (key: string) => {
    const rule = rules.find((candidate) => candidate.key === key)
    if (!rule) throw new Error(`Ownership rule ${key} missing from rule set ${ruleSet.key}`)
    return rule
  }

  const warnings: string[] = []
  const missingInputs: string[] = []
  const results: IndicatorResult[] = []

  if (!inputs.evidenceSource?.trim()) missingInputs.push('Ownership evidence source')
  if (!inputs.measurementDate?.trim()) missingInputs.push('Ownership measurement date')

  // --- Voting rights: black people (25% plus one vote) ---------------------
  {
    const rule = ruleFor('ownership.voting_rights.black_people')
    const useCounts =
      inputs.totalExercisableVotes != null &&
      inputs.totalExercisableVotes > 0 &&
      inputs.blackExercisableVotes != null

    const { target, approximation, note } = resolvePlusOneVoteTarget({
      baseTarget: rule.target,
      totalVotes: useCounts ? inputs.totalExercisableVotes : null,
    })

    const numerator = useCounts ? inputs.blackExercisableVotes : inputs.blackVotingRightsPercentage
    const denominator = useCounts ? inputs.totalExercisableVotes : numerator == null ? null : 1

    results.push(
      scoreProportionalIndicator({
        rule,
        numerator,
        denominator,
        effectiveTarget: target,
        extraWarnings: approximation && numerator != null ? [note] : [],
        missingInputReason:
          'Neither exact exercisable vote counts nor a black voting-rights percentage have been captured.',
      }),
    )
    if (numerator != null) {
      if (approximation) {
        warnings.push(
          'Exact exercisable vote counts were not supplied, so the "25% plus one vote" voting-rights target is approximated at 25.1%.',
        )
      } else {
        results[results.length - 1].explanation += ` ${note}`
      }
    }
  }

  // --- Voting rights: black women -----------------------------------------
  {
    const rule = ruleFor('ownership.voting_rights.black_women')
    const useCounts =
      inputs.totalExercisableVotes != null &&
      inputs.totalExercisableVotes > 0 &&
      inputs.blackWomenExercisableVotes != null
    const numerator = useCounts ? inputs.blackWomenExercisableVotes : inputs.blackWomenVotingRightsPercentage
    const denominator = useCounts ? inputs.totalExercisableVotes : numerator == null ? null : 1
    results.push(
      scoreProportionalIndicator({
        rule,
        numerator,
        denominator,
        missingInputReason:
          'Neither exact black women exercisable vote counts nor a black women voting-rights percentage have been captured.',
      }),
    )
  }

  // --- Economic interest ---------------------------------------------------
  const economicInterestRows: Array<[string, number | null]> = [
    ['ownership.economic_interest.black_people', inputs.blackEconomicInterestPercentage],
    ['ownership.economic_interest.black_women', inputs.blackWomenEconomicInterestPercentage],
    ['ownership.economic_interest.designated_groups', inputs.designatedGroupsEconomicInterestPercentage],
    ['ownership.new_entrants', inputs.newEntrantsEconomicInterestPercentage],
  ]
  for (const [key, percentage] of economicInterestRows) {
    const rule = ruleFor(key)
    results.push(
      scoreProportionalIndicator({
        rule,
        numerator: percentage,
        denominator: percentage == null ? null : 1,
        missingInputReason: `${rule.numeratorLabel} has not been captured.`,
      }),
    )
  }

  // --- Net value -----------------------------------------------------------
  {
    const rule = ruleFor('ownership.net_value')
    if (inputs.netValuePercentage == null) {
      results.push(
        missingInputResult({
          rule,
          reason:
            'A verified net value percentage has not been captured. This release does not model the ownership transaction, acquisition debt or the Annexe 100(E) time-based graduation factor, so net value must be supplied as a verified result.',
        }),
      )
    } else {
      results.push(
        scoreProportionalIndicator({
          rule,
          numerator: inputs.netValuePercentage,
          denominator: 1,
        }),
      )
    }
  }

  if (inputs.modifiedFlowThroughApplied === true) {
    warnings.push(
      'The modified flow-through principle has been applied. It may be used only once in a chain of ownership and only where the flow-through principle does not already deliver the result.',
    )
  }
  if (inputs.exclusionPrincipleApplied === true) {
    warnings.push('An exclusion principle has been applied to the ownership structure. Retain the supporting analysis for verification.')
  }

  return summariseElement({
    elementKey: 'ownership',
    displayName: weighting.displayName,
    indicators: results,
    basePointsAvailable: weighting.basePoints,
    bonusPointsAvailable: weighting.bonusPoints,
    missingInputs,
    warnings,
    notStarted: !hasAnyInput(inputs),
  })
}

/** Net value points, used by the ownership priority sub-minimum. */
export function netValuePointsFrom(element: ElementResult): number | null {
  const indicator = element.indicators.find((candidate) => candidate.indicatorKey === 'ownership.net_value')
  if (!indicator || indicator.status !== 'scored') return null
  return indicator.basePointsAchieved ?? 0
}
