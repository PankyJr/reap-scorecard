import type { RuleSet } from '../../rules/types'
import { elementWeighting, indicatorsForElement } from '../../rules/types'
import {
  missingInputResult,
  scoreEapDisaggregated,
  scoreProportionalIndicator,
  type EapDistribution,
  type EapHeadcounts,
  type IndicatorResult,
} from '../scoring'
import { summariseElement, type ElementResult } from '../types'

export type DirectRepresentationCounts = {
  total: number | null
  black: number | null
  blackWomen: number | null
}

export type OccupationalBandCounts = {
  total: number | null
  /** Black headcount split across the six EAP race/gender bands. */
  byDemographic: EapHeadcounts
}

export type ManagementControlInputs = {
  board: DirectRepresentationCounts
  executiveDirectors: DirectRepresentationCounts
  otherExecutiveManagement: DirectRepresentationCounts
  seniorManagement: OccupationalBandCounts
  middleManagement: OccupationalBandCounts
  juniorManagement: OccupationalBandCounts
  blackEmployeesWithDisabilities: number | null
  totalEmployees: number | null
  /** Versioned EAP distribution. Management Control cannot score without it. */
  eapDistribution: EapDistribution | null
  eapTargetSetLabel: string | null
}

const EMPTY_DIRECT: DirectRepresentationCounts = { total: null, black: null, blackWomen: null }
const EMPTY_BAND: OccupationalBandCounts = { total: null, byDemographic: {} }

export const EMPTY_MANAGEMENT_CONTROL_INPUTS: ManagementControlInputs = {
  board: EMPTY_DIRECT,
  executiveDirectors: EMPTY_DIRECT,
  otherExecutiveManagement: EMPTY_DIRECT,
  seniorManagement: EMPTY_BAND,
  middleManagement: EMPTY_BAND,
  juniorManagement: EMPTY_BAND,
  blackEmployeesWithDisabilities: null,
  totalEmployees: null,
  eapDistribution: null,
  eapTargetSetLabel: null,
}

function bandHasData(band: OccupationalBandCounts): boolean {
  return band.total != null || Object.values(band.byDemographic).some((value) => value != null)
}

function directHasData(counts: DirectRepresentationCounts): boolean {
  return counts.total != null || counts.black != null || counts.blackWomen != null
}

export function calculateManagementControl(args: {
  ruleSet: RuleSet
  inputs: ManagementControlInputs
}): ElementResult {
  const { ruleSet, inputs } = args
  const rules = indicatorsForElement(ruleSet, 'management_control')
  const weighting = elementWeighting(ruleSet, 'management_control')
  const ruleFor = (key: string) => {
    const rule = rules.find((candidate) => candidate.key === key)
    if (!rule) throw new Error(`Management Control rule ${key} missing from rule set ${ruleSet.key}`)
    return rule
  }

  const missingInputs: string[] = []
  const warnings: string[] = []
  const results: IndicatorResult[] = []

  const directGroups: Array<[string, string, DirectRepresentationCounts, string]> = [
    ['management_control.board.black_people', 'management_control.board.black_women', inputs.board, 'Board register'],
    [
      'management_control.executive_directors.black_people',
      'management_control.executive_directors.black_women',
      inputs.executiveDirectors,
      'Executive director register',
    ],
    [
      'management_control.other_executive_management.black_people',
      'management_control.other_executive_management.black_women',
      inputs.otherExecutiveManagement,
      'Other executive management register',
    ],
  ]

  for (const [blackKey, blackWomenKey, counts, label] of directGroups) {
    if (counts.total == null) missingInputs.push(`${label}: total headcount`)
    results.push(
      scoreProportionalIndicator({
        rule: ruleFor(blackKey),
        numerator: counts.black,
        denominator: counts.total,
      }),
    )
    results.push(
      scoreProportionalIndicator({
        rule: ruleFor(blackWomenKey),
        numerator: counts.blackWomen,
        denominator: counts.total,
      }),
    )
  }

  const eap = inputs.eapDistribution
  if (!eap) {
    missingInputs.push('EAP target set (required for senior, middle and junior management)')
  }

  const eapGroups: Array<[string, string, OccupationalBandCounts, string]> = [
    [
      'management_control.senior_management.black_people',
      'management_control.senior_management.black_women',
      inputs.seniorManagement,
      'Senior management',
    ],
    [
      'management_control.middle_management.black_people',
      'management_control.middle_management.black_women',
      inputs.middleManagement,
      'Middle management',
    ],
    [
      'management_control.junior_management.black_people',
      'management_control.junior_management.black_women',
      inputs.juniorManagement,
      'Junior management',
    ],
  ]

  for (const [blackKey, blackWomenKey, band, label] of eapGroups) {
    if (band.total == null) missingInputs.push(`${label}: total headcount`)
    if (!eap) {
      results.push(
        missingInputResult({
          rule: ruleFor(blackKey),
          denominator: band.total,
          reason: `No EAP target set has been selected, so ${label.toLowerCase()} cannot be scored.`,
          status: 'blocked',
        }),
      )
      results.push(
        missingInputResult({
          rule: ruleFor(blackWomenKey),
          denominator: band.total,
          reason: `No EAP target set has been selected, so ${label.toLowerCase()} cannot be scored.`,
          status: 'blocked',
        }),
      )
      continue
    }
    results.push(
      scoreEapDisaggregated({
        rule: ruleFor(blackKey),
        headcounts: band.byDemographic,
        denominator: band.total,
        eap,
        femaleOnly: false,
      }),
    )
    results.push(
      scoreEapDisaggregated({
        rule: ruleFor(blackWomenKey),
        headcounts: band.byDemographic,
        denominator: band.total,
        eap,
        femaleOnly: true,
      }),
    )
  }

  if (inputs.totalEmployees == null) missingInputs.push('Total employees (required for the disability indicator)')
  results.push(
    scoreProportionalIndicator({
      rule: ruleFor('management_control.employees_with_disabilities.black_people'),
      numerator: inputs.blackEmployeesWithDisabilities,
      denominator: inputs.totalEmployees,
    }),
  )

  if (inputs.eapTargetSetLabel) {
    warnings.push(`Scored against EAP target set "${inputs.eapTargetSetLabel}".`)
  }

  const notStarted =
    !directHasData(inputs.board) &&
    !directHasData(inputs.executiveDirectors) &&
    !directHasData(inputs.otherExecutiveManagement) &&
    !bandHasData(inputs.seniorManagement) &&
    !bandHasData(inputs.middleManagement) &&
    !bandHasData(inputs.juniorManagement) &&
    inputs.blackEmployeesWithDisabilities == null

  return summariseElement({
    elementKey: 'management_control',
    displayName: weighting.displayName,
    indicators: results,
    basePointsAvailable: weighting.basePoints,
    bonusPointsAvailable: weighting.bonusPoints,
    missingInputs,
    warnings,
    notStarted,
  })
}
