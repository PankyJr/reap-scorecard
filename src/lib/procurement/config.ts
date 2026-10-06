import { DEFAULT_RULE_SET_KEY, getRuleSet } from '@/lib/scorecard/rules/registry'
import { indicatorsForElement } from '@/lib/scorecard/rules/types'

export const RECOGNITION_BY_LEVEL: Record<string, number> = {
  '1': 1.35,
  '2': 1.25,
  '3': 1.1,
  '4': 1.0,
  '5': 0.8,
  '6': 0.6,
  '7': 0.5,
  '8': 0.1,
  'Non-Compliant': 0,
}

export type ProcurementCategoryKey =
  | 'all_bbbee_suppliers'
  | 'all_qses'
  | 'all_emes'
  | 'black_owned_51'
  | 'black_women_30'
  | 'bdgs_51'

export interface ProcurementCategoryDefinition {
  key: ProcurementCategoryKey
  name: string
  targetPercent: number
  availablePoints: number
}

/**
 * Which full-scorecard engine indicator each procurement-only line is.
 * The order of this object is the order lines are shown and scored in.
 */
export const PROCUREMENT_CATEGORY_ENGINE_KEYS = {
  all_bbbee_suppliers: 'preferential_procurement.all_empowering_suppliers',
  all_qses: 'preferential_procurement.qse',
  all_emes: 'preferential_procurement.eme',
  black_owned_51: 'preferential_procurement.black_owned_51',
  black_women_30: 'preferential_procurement.black_women_owned_30',
  bdgs_51: 'preferential_procurement.bonus.designated_group',
} as const satisfies Record<ProcurementCategoryKey, string>

/** Short names used on procurement-only screens and stored with each result row. */
const PROCUREMENT_CATEGORY_NAMES: Record<ProcurementCategoryKey, string> = {
  all_bbbee_suppliers: 'All B-BBEE Suppliers',
  all_qses: 'All QSEs',
  all_emes: 'All EMEs',
  black_owned_51: '51% Black Owned',
  black_women_30: '30% Black Women Owned',
  bdgs_51: '51% Black Designated Groups',
}

const CATEGORY_ORDER = Object.keys(PROCUREMENT_CATEGORY_ENGINE_KEYS) as ProcurementCategoryKey[]

const PROCUREMENT_ENGINE_RULES = indicatorsForElement(getRuleSet(DEFAULT_RULE_SET_KEY), 'preferential_procurement')

function engineRuleFor(key: ProcurementCategoryKey) {
  const rule = PROCUREMENT_ENGINE_RULES.find((candidate) => candidate.key === PROCUREMENT_CATEGORY_ENGINE_KEYS[key])
  if (!rule) {
    throw new Error(`The scorecard rule set has no procurement indicator ${PROCUREMENT_CATEGORY_ENGINE_KEYS[key]}`)
  }
  return rule
}

/**
 * The six procurement lines with their targets and points. Targets and points
 * are read from the full scorecard engine's rule set, the one source of truth,
 * so the procurement-only scorecard can never disagree with the full scorecard
 * about a target.
 */
export const PROCUREMENT_CATEGORIES: ProcurementCategoryDefinition[] = CATEGORY_ORDER.map((key) => {
  const rule = engineRuleFor(key)
  return {
    key,
    name: PROCUREMENT_CATEGORY_NAMES[key],
    targetPercent: rule.target,
    availablePoints: rule.basePoints + rule.bonusPoints,
  }
})

/** Lines that only give bonus points (the engine's bonus indicators). */
export const PROCUREMENT_BONUS_CATEGORY_KEYS: ProcurementCategoryKey[] = CATEGORY_ORDER.filter((key) => {
  const rule = engineRuleFor(key)
  return rule.basePoints === 0 && rule.bonusPoints > 0
})

export function isProcurementBonusCategory(key: ProcurementCategoryKey): boolean {
  return PROCUREMENT_BONUS_CATEGORY_KEYS.includes(key)
}
