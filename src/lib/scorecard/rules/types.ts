/**
 * Versioned B-BBEE rule sets.
 *
 * A rule set is the single source of truth for targets, weighting points,
 * priority sub-minimums and level bands used by a calculation run. Rule sets
 * are immutable once published: corrections ship as a new version so historical
 * calculation runs keep reproducing their original result.
 */

export type GenericElementKey =
  | 'ownership'
  | 'management_control'
  | 'skills_development'
  | 'preferential_procurement'
  | 'supplier_development'
  | 'enterprise_development'
  | 'socio_economic_development'

export const GENERIC_ELEMENT_KEYS: readonly GenericElementKey[] = [
  'ownership',
  'management_control',
  'skills_development',
  'preferential_procurement',
  'supplier_development',
  'enterprise_development',
  'socio_economic_development',
]

/** Where a rule comes from. Gazetted sources outrank the reference workbook. */
export type RuleSource = {
  /** Short citation shown in the application next to a score. */
  citation: string
  /** Gazette / notice identifier where applicable. */
  notice?: string
  url?: string
  /**
   * `gazetted` — taken directly from a primary legal source.
   * `derived` — arithmetic consequence of gazetted values (e.g. a total).
   * `requires_confirmation` — REAP must confirm before the rule may score.
   */
  standing: 'gazetted' | 'derived' | 'requires_confirmation'
}

export type IndicatorScoringMethod =
  /** points = min(actual / target, 1) * availablePoints */
  | 'proportional_capped'
  /** Proportional, but the target is split across EAP race/gender bands. */
  | 'eap_disaggregated'
  /** All-or-nothing bonus driven by a confirmed yes/no with evidence. */
  | 'boolean_bonus'

export type IndicatorRule = {
  key: string
  elementKey: GenericElementKey
  displayName: string
  /** Compliance target as a fraction of the denominator (0.25 = 25%). */
  target: number
  /** Human-readable target, e.g. "25% + 1 vote". */
  targetLabel: string
  basePoints: number
  bonusPoints: number
  scoringMethod: IndicatorScoringMethod
  numeratorLabel: string
  denominatorLabel: string
  source: RuleSource
  /**
   * True where the target is literally "x% plus one vote". The engine resolves
   * the effective target from exact vote counts when they are supplied.
   */
  plusOneVote?: boolean
  notes?: string
}

export type PrioritySubminimumRule = {
  key: string
  label: string
  elementKey: GenericElementKey
  /**
   * Points basis the 40% is measured against. This is deliberately separate
   * from the element's available points: Statement 000 §3.3.1.3.1 fixes the
   * preferential procurement basis at 25 points while Statement 400 §2.1
   * weights the indicators to 27.
   */
  basisPoints: number
  fraction: number
  /** Which achieved measure is compared against the threshold. */
  measure: 'element_base_points' | 'ownership_net_value_points'
  source: RuleSource
}

export type LevelBandRule = {
  level: string
  /** Inclusive lower bound of total points. */
  min: number
  /** Exclusive upper bound; omitted for the top band. */
  maxExclusive?: number
  recognitionPercentage: number
}

export type ElementWeighting = {
  elementKey: GenericElementKey
  displayName: string
  basePoints: number
  bonusPoints: number
}

export type RuleSetStatus = 'active' | 'reserved_draft' | 'retired'

export type RuleSet = {
  key: string
  version: string
  displayName: string
  status: RuleSetStatus
  effectiveFrom: string
  /**
   * A reserved draft may never produce an operative final level. It is only
   * selectable when an authorised REAP administrator explicitly enables it for
   * non-production modelling.
   */
  selectableAsOperative: boolean
  primarySources: RuleSource[]
  elements: ElementWeighting[]
  indicators: IndicatorRule[]
  prioritySubminimums: PrioritySubminimumRule[]
  levelBands: LevelBandRule[]
  /**
   * Conflicts between the reference workbook / commonly cited figures and the
   * gazetted text, resolved in favour of the gazette. Surfaced in the UI.
   */
  ruleConflicts: RuleConflict[]
}

export type RuleConflict = {
  key: string
  topic: string
  workbookOrCommonPosition: string
  gazettedPosition: string
  resolution: string
  source: RuleSource
}

export function indicatorsForElement(ruleSet: RuleSet, elementKey: GenericElementKey): IndicatorRule[] {
  return ruleSet.indicators.filter((indicator) => indicator.elementKey === elementKey)
}

export function elementWeighting(ruleSet: RuleSet, elementKey: GenericElementKey): ElementWeighting {
  const found = ruleSet.elements.find((element) => element.elementKey === elementKey)
  if (!found) throw new Error(`Element ${elementKey} is not defined in rule set ${ruleSet.key}`)
  return found
}
