import { describe, expect, it } from 'vitest'
import {
  buildAberdareTmpsBridge,
  displayedPointsImpact,
  formatAberdarePoints,
  formatAberdarePointsImpact,
  roundPointsForDisplay,
} from '../displayMath'
import { ABERDARE_EXPECTED_RECONCILIATION } from '../types'

describe('Aberdare display math and TMPS bridge', () => {
  it('derives displayed impact from rounded scores so arithmetic reconciles', () => {
    // Real-workbook style precision that previously showed -1.63 vs 27.05−25.43=1.62
    const current = 27.052201065403295
    const projected = 25.42622728974524

    const displayedCurrent = Number(formatAberdarePoints(current))
    const displayedProjected = Number(formatAberdarePoints(projected))
    const displayedImpact = displayedPointsImpact(current, projected)

    expect(displayedCurrent).toBe(27.05)
    expect(displayedProjected).toBe(25.43)
    expect(displayedImpact).toBe(-1.62)
    expect(
      roundPointsForDisplay(displayedProjected - displayedCurrent),
    ).toBe(displayedImpact)
    expect(formatAberdarePointsImpact(current, projected)).toBe('-1.62')
    expect(
      Number(formatAberdarePoints(projected)) -
        Number(formatAberdarePoints(current)),
    ).toBeCloseTo(displayedImpact, 2)
  })

  it('explains eligible TMPS as source minus import with negatives excluded', () => {
    const source = ABERDARE_EXPECTED_RECONCILIATION.totalAmountExVat
    const imported = ABERDARE_EXPECTED_RECONCILIATION.explicitImportSpend
    const negatives = ABERDARE_EXPECTED_RECONCILIATION.combinedNegativeSpend
    const provisionalEligible = 4_847_568_962.96

    const bridge = buildAberdareTmpsBridge({
      sourceSpendTotal: source,
      explicitImportSpend: imported,
      combinedNegativeSpend: negatives,
      provisionalEligibleTmps: provisionalEligible,
    })

    expect(bridge.sourceMinusImport).toBeCloseTo(4_780_350_716.94, 2)
    expect(bridge.absoluteNegativeSpend).toBeCloseTo(67_218_246.02, 2)
    expect(bridge.differenceFromSourceMinusImport).toBeCloseTo(
      bridge.absoluteNegativeSpend,
      2,
    )
    expect(bridge.negativesExcludedFromTmps).toBe(true)
    expect(bridge.provisionalEligibleTmps).toBe(provisionalEligible)
  })
})
