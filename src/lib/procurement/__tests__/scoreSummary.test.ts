import { describe, expect, it } from 'vitest'
import { aggregateCategoryTotals, calculateProcurementResults } from '../assessment'
import { calculateSupplierRow, type ProcurementSupplierInput } from '../rows'
import {
  FAR_OFF_SHARE_OF_TARGET,
  biggestProcurementGap,
  biggestProcurementGapSentence,
  procurementLineProgress,
  procurementLineTone,
  summariseProcurementScore,
  suppliersForProcurementLine,
} from '../scoreSummary'
import { calculatePreferentialProcurement } from '@/lib/scorecard/generic/elements/procurement'
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
    expect(biggestProcurementGapSentence(summary)).toBe('Every line has reached its target, so there is no gap to close.')
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
    expect(biggestProcurementGapSentence(summary)).toMatch(/^The base points are at the 25 maximum\. The only gap left is the bonus line/)
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
