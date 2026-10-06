import { describe, expect, it } from 'vitest'
import { calculateGenericScorecard } from '..'
import { assessmentResultColumns, hydrateRuleSetSnapshot } from '../persistence'
import { GENERIC_CODES_2019_V1 } from '../../rules/generic-2019/scorecard'
import type { RuleSet } from '../../rules/types'
import { completeScorecardInputs } from './fixtures'

/**
 * A stored result must keep reproducing its original score after the live
 * registry's copy of that rule set changes. Corrections ship as new versions;
 * they must not silently rescore history.
 */

/** A registry copy with ownership net value dropped from 8 points to 4. */
function amendedRuleSet(): RuleSet {
  return {
    ...GENERIC_CODES_2019_V1,
    elements: GENERIC_CODES_2019_V1.elements.map((element) =>
      element.elementKey === 'ownership' ? { ...element, basePoints: 21 } : element,
    ),
    indicators: GENERIC_CODES_2019_V1.indicators.map((indicator) =>
      indicator.key === 'ownership.net_value' ? { ...indicator, basePoints: 4 } : indicator,
    ),
  }
}

describe('rule set snapshot', () => {
  it('is written to rule_set_snapshot on every calculation', () => {
    const result = calculateGenericScorecard(completeScorecardInputs())
    const columns = assessmentResultColumns(result)
    expect(columns.rule_set_snapshot).toBeTruthy()
    expect((columns.rule_set_snapshot as { key: string }).key).toBe(GENERIC_CODES_2019_V1.key)
    expect((columns.rule_set_snapshot as { version: string }).version).toBe(GENERIC_CODES_2019_V1.version)
    expect(columns.rule_set_key).toBe(GENERIC_CODES_2019_V1.key)
  })

  it('reproduces the original score after the rule set is amended', () => {
    const inputs = completeScorecardInputs()

    // 1. Original calculation, frozen exactly as persistence would store it.
    const original = calculateGenericScorecard(inputs)
    const stored = JSON.parse(
      JSON.stringify(assessmentResultColumns(original).rule_set_snapshot),
    ) as unknown

    // 2. The rule set is amended in the registry (net value 8 -> 4 points).
    const amended = amendedRuleSet()
    const rescored = calculateGenericScorecard({ ...inputs, ruleSetSnapshot: amended })
    expect(rescored.rawTotalPoints).not.toBe(original.rawTotalPoints)

    // 3. The stored assessment, replayed through its snapshot, is unchanged.
    const replayed = calculateGenericScorecard({
      ...inputs,
      ruleSetSnapshot: hydrateRuleSetSnapshot(stored),
    })
    expect(replayed.rawTotalPoints).toBe(original.rawTotalPoints)
    expect(replayed.finalLevel.level).toBe(original.finalLevel.level)
    const ownershipBefore = original.elements.find((e) => e.elementKey === 'ownership')!
    const ownershipAfter = replayed.elements.find((e) => e.elementKey === 'ownership')!
    expect(ownershipAfter.basePointsAchieved).toBe(ownershipBefore.basePointsAchieved)
    expect(ownershipAfter.basePointsAvailable).toBe(ownershipBefore.basePointsAvailable)
  })

  it('falls back to the live registry when no snapshot is stored', () => {
    // Existing rows predate the column being written.
    const fromRegistry = calculateGenericScorecard({ ...completeScorecardInputs(), ruleSetSnapshot: null })
    const direct = calculateGenericScorecard(completeScorecardInputs())
    expect(fromRegistry.rawTotalPoints).toBe(direct.rawTotalPoints)
    expect(fromRegistry.ruleSetKey).toBe(GENERIC_CODES_2019_V1.key)
  })

  it('rejects a malformed snapshot rather than scoring against nonsense', () => {
    expect(hydrateRuleSetSnapshot(null)).toBeNull()
    expect(hydrateRuleSetSnapshot('not an object')).toBeNull()
    expect(hydrateRuleSetSnapshot({ key: 'x' })).toBeNull()
    expect(hydrateRuleSetSnapshot({ key: 'x', version: '1', elements: [], indicators: [], levelBands: [] })).toBeNull()
    expect(hydrateRuleSetSnapshot(GENERIC_CODES_2019_V1)).not.toBeNull()
  })

  it('keeps the snapshot round-trippable through JSON', () => {
    const result = calculateGenericScorecard(completeScorecardInputs())
    const stored = JSON.parse(JSON.stringify(assessmentResultColumns(result).rule_set_snapshot))
    const rehydrated = hydrateRuleSetSnapshot(stored)
    expect(rehydrated).not.toBeNull()
    expect(rehydrated!.indicators).toHaveLength(GENERIC_CODES_2019_V1.indicators.length)
    expect(rehydrated!.levelBands).toHaveLength(GENERIC_CODES_2019_V1.levelBands.length)
    expect(rehydrated!.prioritySubminimums).toHaveLength(GENERIC_CODES_2019_V1.prioritySubminimums.length)
  })
})
