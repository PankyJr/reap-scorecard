import { describe, expect, it } from 'vitest'
import { PROCUREMENT_CATEGORIES, type ProcurementCategoryKey } from '../config'
import { DEFAULT_RULE_SET_KEY, getRuleSet } from '@/lib/scorecard/rules/registry'
import { indicatorsForElement } from '@/lib/scorecard/rules/types'

/**
 * The procurement-only scorecard and the full scorecard engine both carry the
 * six preferential procurement targets. They must be the same numbers: a
 * procurement scorecard attached to a full scorecard is re-scored by the
 * engine, and the two pages must never disagree about a target.
 */
const ENGINE_KEY: Record<ProcurementCategoryKey, string> = {
  all_bbbee_suppliers: 'preferential_procurement.all_empowering_suppliers',
  all_qses: 'preferential_procurement.qse',
  all_emes: 'preferential_procurement.eme',
  black_owned_51: 'preferential_procurement.black_owned_51',
  black_women_30: 'preferential_procurement.black_women_owned_30',
  bdgs_51: 'preferential_procurement.bonus.designated_group',
}

describe('procurement-only targets', () => {
  const engineRules = indicatorsForElement(getRuleSet(DEFAULT_RULE_SET_KEY), 'preferential_procurement')

  it('cover exactly the engine’s six procurement indicators', () => {
    expect(PROCUREMENT_CATEGORIES.map((c) => ENGINE_KEY[c.key]).sort()).toEqual(engineRules.map((r) => r.key).sort())
  })

  it.each(PROCUREMENT_CATEGORIES.map((c) => [c.key, c] as const))(
    '%s has the engine’s target and points',
    (key, category) => {
      const rule = engineRules.find((r) => r.key === ENGINE_KEY[key])
      expect(rule).toBeDefined()
      expect(category.targetPercent).toBe(rule!.target)
      expect(category.availablePoints).toBe(rule!.basePoints + rule!.bonusPoints)
    },
  )

  it('keep the values every saved procurement scorecard was scored with', () => {
    // Pinned literally: if the engine's procurement targets ever change, saved
    // procurement scorecards and this test must be reviewed together.
    expect(
      PROCUREMENT_CATEGORIES.map((c) => [c.key, c.name, c.targetPercent, c.availablePoints]),
    ).toEqual([
      ['all_bbbee_suppliers', 'All B-BBEE Suppliers', 0.8, 5],
      ['all_qses', 'All QSEs', 0.15, 3],
      ['all_emes', 'All EMEs', 0.15, 4],
      ['black_owned_51', '51% Black Owned', 0.5, 11],
      ['black_women_30', '30% Black Women Owned', 0.12, 4],
      ['bdgs_51', '51% Black Designated Groups', 0.02, 2],
    ])
  })
})
