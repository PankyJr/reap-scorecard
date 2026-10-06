import { describe, expect, it } from 'vitest'
import { aggregateCategoryTotals, calculateProcurementResults } from '../assessment'
import { calculateSupplierRow, type ProcurementSupplierInput } from '../rows'
import {
  FAR_OFF_SHARE_OF_TARGET,
  biggestProcurementGap,
  biggestProcurementGapSentence,
  formatProcurementPoints,
  procurementLineProgress,
  procurementPointsFromLines,
  procurementPointsFromStoredResults,
  procurementScoreText,
  procurementLineTone,
  summariseProcurementScore,
  suppliersForProcurementLine,
} from '../scoreSummary'
import {
  PROCUREMENT_BASE_CAP,
  PROCUREMENT_BONUS_CAP,
  calculatePreferentialProcurement,
} from '@/lib/scorecard/generic/elements/procurement'
import { getRuleSet, DEFAULT_RULE_SET_KEY } from '@/lib/scorecard/rules/registry'

function supplier(overrides: Partial<ProcurementSupplierInput>): ProcurementSupplierInput {
  return {
    supplier_name: 'Supplier',
    supplier_type: 'Generic',
    level: '4',
    value_ex_vat: 100,
    is_51_black_owned: false,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    ...overrides,
  }
}

function score(suppliers: ProcurementSupplierInput[], tmps: number) {
  const rows = suppliers.map(calculateSupplierRow)
  return { rows, result: calculateProcurementResults({ totals: aggregateCategoryTotals(rows), totalMeasuredSpend: tmps }) }
}

describe('procurementLineTone', () => {
  it('is green at or above the target', () => {
    expect(procurementLineTone(0.5, 0.5)).toBe('ok')
    expect(procurementLineTone(0.9, 0.5)).toBe('ok')
  })
  it('is amber from half the target up to the target', () => {
    expect(FAR_OFF_SHARE_OF_TARGET).toBe(0.5)
    expect(procurementLineTone(0.25, 0.5)).toBe('warn')
    expect(procurementLineTone(0.49, 0.5)).toBe('warn')
  })
  it('is red when far off: below half of the target', () => {
    expect(procurementLineTone(0.2499, 0.5)).toBe('bad')
    expect(procurementLineTone(0, 0.02)).toBe('bad')
  })
  it('bar width is the share of the target reached, never above full', () => {
    expect(procurementLineProgress(0.25, 0.5)).toBe(0.5)
    expect(procurementLineProgress(2, 0.5)).toBe(1)
    expect(procurementLineProgress(-1, 0.5)).toBe(0)
  })
})

describe('summariseProcurementScore', () => {
  it('caps base points at 25 and shows the 2 bonus points apart', () => {
    // Everything bought from Level 1, black-owned, black-women-owned, designated
    // group QSEs and EMEs: every line is full, 27 base + 2 bonus before caps.
    const { result } = score(
      [
        supplier({ supplier_type: 'QSE', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
        supplier({ supplier_type: 'EME', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
      ],
      1000,
    )
    const summary = summariseProcurementScore(result)
    expect(summary.moduleTotal).toBe(29)
    expect(summary.uncappedBasePoints).toBe(27)
    expect(summary.basePoints).toBe(25)
    expect(summary.baseCap).toBe(25)
    expect(summary.bonusPoints).toBe(2)
    expect(summary.bonusCap).toBe(2)
    expect(summary.baseWasCapped).toBe(true)
    expect(biggestProcurementGap(summary)).toBeNull()
    expect(biggestProcurementGapSentence(summary)).toBe('Every indicator has reached its target, so there is no gap to close.')
  })

  it('gives the same base and bonus points as the full scorecard engine for the same spend', () => {
    const { rows, result } = score(
      [
        supplier({ supplier_type: 'QSE', level: '2', value_ex_vat: 2_000_000, is_51_black_owned: true }),
        supplier({ supplier_type: 'EME', level: '1', value_ex_vat: 700_000, is_30_black_women_owned: true, is_51_bdgs: true }),
        supplier({ level: '6', value_ex_vat: 3_100_000 }),
        supplier({ level: 'Non-Compliant', value_ex_vat: 900_000 }),
      ],
      10_000_000,
    )
    const totals = aggregateCategoryTotals(rows)
    const engine = calculatePreferentialProcurement({
      ruleSet: getRuleSet(DEFAULT_RULE_SET_KEY),
      snapshot: {
        sourceAssessmentId: 'x',
        sourceAssessmentName: 'x',
        measurementPeriodStart: null,
        measurementPeriodEnd: null,
        capturedAt: '2026-01-01',
        capturedBy: null,
        totalMeasuredProcurementSpend: 10_000_000,
        recognisedSpend: {
          'preferential_procurement.all_empowering_suppliers': totals.all_bbbee_suppliers,
          'preferential_procurement.qse': totals.all_qses,
          'preferential_procurement.eme': totals.all_emes,
          'preferential_procurement.black_owned_51': totals.black_owned_51,
          'preferential_procurement.black_women_owned_30': totals.black_women_30,
          'preferential_procurement.bonus.designated_group': totals.bdgs_51,
        },
        flowThroughApplied: false,
        sourceReportedBasePoints: null,
        sourceReportedBonusPoints: null,
      },
    })
    const summary = summariseProcurementScore(result)
    expect(summary.basePoints).toBeCloseTo(engine.basePointsAchieved, 1)
    expect(summary.bonusPoints).toBeCloseTo(engine.bonusPointsAchieved, 1)
    // Below the caps, base + bonus is the module total (to the 2 decimals shown).
    expect(summary.baseWasCapped).toBe(false)
    expect(summary.basePoints + summary.bonusPoints).toBeCloseTo(result.totalScore, 2)
  })

  it('names the base line with the largest points shortfall', () => {
    const { result } = score(
      [
        supplier({ supplier_type: 'QSE', level: '4', value_ex_vat: 150 }),
        supplier({ supplier_type: 'EME', level: '4', value_ex_vat: 150, is_30_black_women_owned: true, is_51_bdgs: true }),
        supplier({ level: '4', value_ex_vat: 500, is_51_black_owned: true }),
      ],
      1000,
    )
    const summary = summariseProcurementScore(result)
    // QSE 15%, EME 15%, black-owned 50%, black women 15%, designated 15%:
    // every line is at or above its target.
    expect(summary.lines.every((l) => l.tone === 'ok')).toBe(true)
    expect(biggestProcurementGap(summary)).toBeNull()

    // Black women-owned (4 points) is the only empty line; the bonus line is
    // empty too but worth only 2.
    const short = summariseProcurementScore(
      score(
        [
          supplier({ level: '4', value_ex_vat: 700, is_51_black_owned: true }),
          supplier({ level: '4', value_ex_vat: 150, supplier_type: 'QSE' }),
          supplier({ level: '4', value_ex_vat: 150, supplier_type: 'EME' }),
        ],
        1000,
      ).result,
    )
    const gap = biggestProcurementGap(short)
    expect(gap?.key).toBe('black_women_30')
    expect(gap?.tone).toBe('bad')
    expect(biggestProcurementGapSentence(short)).toBe(
      'The biggest gap is suppliers at least 30% black women-owned: 0% of total spend against a 12% target, 4.00 points short.',
    )
  })

  it('points at the bonus line once the base points are at the 25 maximum', () => {
    const { result } = score(
      [
        supplier({ supplier_type: 'QSE', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true }),
        supplier({ supplier_type: 'EME', level: '1', value_ex_vat: 500, is_51_black_owned: true }),
      ],
      1000,
    )
    const summary = summariseProcurementScore(result)
    expect(summary.basePoints).toBe(25)
    expect(biggestProcurementGap(summary)?.key).toBe('bdgs_51')
    expect(biggestProcurementGapSentence(summary)).toMatch(/^The base points are at the 25 maximum\. The only gap left is the bonus indicator/)
  })
})

describe('the gap sentence at the 25-point maximum', () => {
  it('does not claim every target is met when a line is short but the base is capped', () => {
    // Uncapped base 26.6: every line full except very small suppliers (EMEs) at 13.5% of a 15% target.
    const { result } = score(
      [
        supplier({ supplier_type: 'QSE', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
        supplier({ supplier_type: 'EME', level: '1', value_ex_vat: 100, is_51_black_owned: true }),
      ],
      1000,
    )
    const summary = summariseProcurementScore(result)
    expect(summary.basePoints).toBe(25)
    expect(summary.bonusPoints).toBe(2)
    const sentence = biggestProcurementGapSentence(summary)
    expect(sentence).not.toMatch(/Every indicator has reached its target/)
    expect(sentence).toMatch(/^The base points are at the 25 maximum, so no points are missing\. Still below target: .*EMEs.*against a 15(\.0+)?% target\.$/)
  })
})

describe('suppliersForProcurementLine', () => {
  it('lists the suppliers that count towards a line, largest first, with a limit', () => {
    const { rows } = score(
      [
        supplier({ supplier_name: 'Small', value_ex_vat: 10, is_51_black_owned: true }),
        supplier({ supplier_name: 'Big', value_ex_vat: 1000, is_51_black_owned: true }),
        supplier({ supplier_name: 'Not black-owned', value_ex_vat: 5000 }),
        supplier({ supplier_name: 'Non-compliant', level: 'Non-Compliant', value_ex_vat: 9000, is_51_black_owned: true }),
      ],
      10_000,
    )
    const list = suppliersForProcurementLine(rows, 'black_owned_51', 1)
    expect(list.count).toBe(2)
    expect(list.total).toBe(1010)
    expect(list.rows.map((r) => r.supplier_name)).toEqual(['Big'])
    expect(suppliersForProcurementLine(rows, 'all_bbbee_suppliers').rows.map((r) => r.supplier_name)).toEqual([
      'Not black-owned',
      'Big',
      'Small',
    ])
  })
})

describe('saved results in any order', () => {
  it('are shown in scorecard order', () => {
    const { result } = score([supplier({ value_ex_vat: 100 })], 1000)
    const shuffled = { ...result, categories: [...result.categories].sort((a, b) => a.name.localeCompare(b.name)) }
    expect(shuffled.categories[0].key).not.toBe('all_bbbee_suppliers')
    expect(summariseProcurementScore(shuffled).lines.map((l) => l.key)).toEqual([
      'all_bbbee_suppliers',
      'all_qses',
      'all_emes',
      'black_owned_51',
      'black_women_30',
      'bdgs_51',
    ])
  })
})

describe('procurement points from per-line results (one helper for every screen)', () => {
  const FULL_MARKS = [
    supplier({ supplier_type: 'QSE', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
    supplier({ supplier_type: 'EME', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
  ]

  it('caps the base at the engine maximum and keeps the bonus apart', () => {
    const { result } = score(FULL_MARKS, 1000)
    const points = procurementPointsFromLines(result.categories)
    expect(points.basePoints).toBe(PROCUREMENT_BASE_CAP)
    expect(points.baseCap).toBe(PROCUREMENT_BASE_CAP)
    expect(points.bonusPoints).toBe(PROCUREMENT_BONUS_CAP)
    expect(points.bonusCap).toBe(PROCUREMENT_BONUS_CAP)
    expect(points.uncappedBasePoints).toBeGreaterThan(PROCUREMENT_BASE_CAP)
    expect(points.baseWasCapped).toBe(true)
  })

  it('gives exactly what the score page shows', () => {
    const { result } = score(
      [
        supplier({ supplier_type: 'QSE', level: '2', value_ex_vat: 400, is_51_black_owned: true }),
        supplier({ supplier_type: 'EME', level: '6', value_ex_vat: 150, is_51_bdgs: true }),
      ],
      1000,
    )
    const summary = summariseProcurementScore(result)
    const points = procurementPointsFromLines(result.categories)
    expect(points.basePoints).toBe(summary.basePoints)
    expect(points.bonusPoints).toBe(summary.bonusPoints)
  })

  it('reads stored result rows in any order, with numbers stored as text, and says null when there are none', () => {
    const { result } = score(FULL_MARKS, 1000)
    const stored = [...result.categories]
      .reverse()
      .map((c) => ({ category_key: c.key, points_achieved: String(c.pointsAchieved) }))
    expect(procurementPointsFromStoredResults(stored)).toEqual(procurementPointsFromLines(result.categories))
    expect(procurementPointsFromStoredResults([])).toBeNull()
    expect(procurementPointsFromStoredResults(null)).toBeNull()
  })

  it('writes the score one way: base of the cap, then the bonus of its cap', () => {
    const points = { basePoints: 22.4, baseCap: PROCUREMENT_BASE_CAP, bonusPoints: 1, bonusCap: PROCUREMENT_BONUS_CAP }
    expect(formatProcurementPoints(points)).toBe(`22.40 of ${PROCUREMENT_BASE_CAP} points, bonus 1.00 of ${PROCUREMENT_BONUS_CAP}`)
    expect(formatProcurementPoints(points, { bonus: false })).toBe(`22.40 of ${PROCUREMENT_BASE_CAP} points`)
  })

  it('falls back to the stored total as plain points, with no maximum, when no line results are stored', () => {
    const { result } = score(FULL_MARKS, 1000)
    const stored = result.categories.map((c) => ({ category_key: c.key, points_achieved: c.pointsAchieved }))
    expect(procurementScoreText({ results: stored, storedTotal: result.totalScore })).toBe(
      `${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points, bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`,
    )
    expect(procurementScoreText({ results: [], storedTotal: '26.4' })).toBe('26.40 points')
    expect(procurementScoreText({ results: null, storedTotal: null })).toBe('—')
  })
})
