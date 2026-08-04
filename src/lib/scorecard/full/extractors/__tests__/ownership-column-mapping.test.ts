import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ParsedWorkbookResult } from '../../types'
import { parseWorkbookFromBuffer } from '../../parser'
import { extractOwnershipSheetMetrics } from '../ownership-sheet'
import { calculateGenericScorecard } from '@/lib/scorecard/generic'
import { completeScorecardInputs } from '@/lib/scorecard/generic/__tests__/fixtures'

/**
 * The Ownership tab's canonical column order, confirmed against BOTH reference
 * workbooks (Generic-Scorecard Calculator.xlsx and Generic-Scorecard-Test-Data.xlsx):
 *
 *   col 0 = Indicator | col 1 = Weighting points | col 2 = Target
 *   col 3 = Verified level (achieved) | col 4 = Entity score
 *
 * Weighting and achieved must never be swapped: a weighting of 4 read as an
 * achieved percentage becomes 400% ownership and scores full points.
 */

function ownershipWorkbook(rows: unknown[][], sheetName = 'Ownership'): ParsedWorkbookResult {
  return {
    filename: 'fixture.xlsx',
    fileSize: 1,
    detectedSheetNames: [sheetName],
    sheets: [
      {
        sheetKey: 'ownership',
        sheetName,
        rowCount: rows.length,
        columnCount: 6,
        rows,
        cells: {},
        parseWarnings: [],
      },
    ],
  }
}

function num(metrics: ReturnType<typeof extractOwnershipSheetMetrics>['metrics'], key: string) {
  return metrics.find((m) => m.metricKey === key)?.numericValue ?? null
}
function state(metrics: ReturnType<typeof extractOwnershipSheetMetrics>['metrics'], key: string) {
  return metrics.find((m) => m.metricKey === key)?.validationState ?? null
}

const REFERENCE = resolve(process.cwd(), 'tmp/full-scorecard-reference/Generic-Scorecard Calculator.xlsx')
const hasReference = existsSync(REFERENCE)

// ---------------------------------------------------------------------------
// (a) Real workbook — exact values, from the cells themselves
// ---------------------------------------------------------------------------
describe.skipIf(!hasReference)('reference workbook Ownership tab — exact values', () => {
  const parsed = parseWorkbookFromBuffer({
    filename: 'Generic-Scorecard Calculator.xlsx',
    buffer: readFileSync(REFERENCE),
  })
  const { metrics } = extractOwnershipSheetMetrics(parsed)

  it('extracts weighting points from column B', () => {
    expect(num(metrics, 'ownership.voting_rights.black_people.available_points')).toBe(4)
    expect(num(metrics, 'ownership.voting_rights.black_women.available_points')).toBe(2)
    expect(num(metrics, 'ownership.economic_interest.black_people.available_points')).toBe(4)
    expect(num(metrics, 'ownership.economic_interest.black_women.available_points')).toBe(2)
    expect(num(metrics, 'ownership.economic_interest.designated_groups.available_points')).toBe(3)
    expect(num(metrics, 'ownership.net_value.available_points')).toBe(8)
    expect(num(metrics, 'ownership.total.available_points')).toBe(25)
  })

  it('extracts targets from column C', () => {
    expect(num(metrics, 'ownership.voting_rights.black_women.target')).toBe(0.1)
    expect(num(metrics, 'ownership.economic_interest.black_people.target')).toBe(0.25)
    expect(num(metrics, 'ownership.economic_interest.black_women.target')).toBe(0.1)
    expect(num(metrics, 'ownership.economic_interest.designated_groups.target')).toBe(0.03)
    expect(num(metrics, 'ownership.net_value.target')).toBe(0.25)
  })

  it('extracts achieved (verified level) from column D', () => {
    expect(num(metrics, 'ownership.voting_rights.black_people.percentage')).toBe(0.25)
    expect(num(metrics, 'ownership.voting_rights.black_women.percentage')).toBe(0)
    expect(num(metrics, 'ownership.economic_interest.black_people.percentage')).toBe(0.25)
    expect(num(metrics, 'ownership.economic_interest.black_women.percentage')).toBe(0)
    expect(num(metrics, 'ownership.economic_interest.designated_groups.percentage')).toBe(0)
    expect(num(metrics, 'ownership.net_value.percentage')).toBe(0.25)
  })

  it('reports true worksheet cell addresses, not blank-collapsed indices', () => {
    // Ownership!B4/C4/D4 is the first scoring row in the actual sheet.
    const bp = metrics.find((m) => m.metricKey === 'ownership.voting_rights.black_people.available_points')
    expect(bp?.sourceCell).toBe('B4')
    const nv = metrics.find((m) => m.metricKey === 'ownership.net_value.percentage')
    expect(nv?.sourceCell).toBe('D11')
  })
})

// ---------------------------------------------------------------------------
// (b) Transposition guard — the test that makes the bug unreintroducible
// ---------------------------------------------------------------------------
describe('transposition guard', () => {
  // Section-header layout with NO "Indicator/Weighting/Target/Verified" row.
  // Real column order, but every row has a DIFFERENT weighting vs achieved so a
  // swap cannot pass by coincidence.
  const rows: unknown[][] = [
    ['Exercisable Voting Rights', '', '', '', ''],
    ['Black people', 4, 0.25, 0.6, 0],
    ['Black women', 2, 0.1, 0.35, 0],
    ['Economic Interest', '', '', '', ''],
    ['Black people', 4, 0.25, 0.55, 0],
    ['Black women', 2, 0.1, 0.3, 0],
    ['Designated groups', 3, 0.03, 0.1, 0],
    ['Net Value', '', '', '', ''],
    ['Net value', 8, 0.25, 0.45, 0],
  ]

  it('puts weighting points in available_points, never in percentage', () => {
    const { metrics } = extractOwnershipSheetMetrics(ownershipWorkbook(rows))
    expect(num(metrics, 'ownership.voting_rights.black_people.available_points')).toBe(4)
    expect(num(metrics, 'ownership.voting_rights.black_women.available_points')).toBe(2)
    expect(num(metrics, 'ownership.economic_interest.designated_groups.available_points')).toBe(3)
    expect(num(metrics, 'ownership.net_value.available_points')).toBe(8)
  })

  it('puts verified level in percentage, never the weighting', () => {
    const { metrics } = extractOwnershipSheetMetrics(ownershipWorkbook(rows))
    expect(num(metrics, 'ownership.voting_rights.black_people.percentage')).toBe(0.6)
    expect(num(metrics, 'ownership.voting_rights.black_women.percentage')).toBe(0.35)
    expect(num(metrics, 'ownership.economic_interest.black_people.percentage')).toBe(0.55)
    expect(num(metrics, 'ownership.net_value.percentage')).toBe(0.45)
  })

  it('never reads a weighting as an ownership percentage', () => {
    const { metrics } = extractOwnershipSheetMetrics(ownershipWorkbook(rows))
    for (const key of [
      'ownership.voting_rights.black_people.percentage',
      'ownership.economic_interest.black_people.percentage',
      'ownership.net_value.percentage',
    ]) {
      const v = num(metrics, key)
      expect(v).not.toBeNull()
      expect(v!).toBeLessThanOrEqual(1)
    }
  })
})

// ---------------------------------------------------------------------------
// (c) Order robustness — labels drive identification, not row ordinal
// ---------------------------------------------------------------------------
describe('order robustness', () => {
  it('maps descriptive labels correctly when economic interest precedes voting rights', () => {
    const rows: unknown[][] = [
      ['Indicator', 'Weighting Points', 'Target', 'Verified Result', 'Entity Score'],
      ['Black people economic interest', 4, 0.25, 0.55, 4],
      ['Black women economic interest', 2, 0.1, 0.3, 2],
      ['Black people voting rights', 4, 0.251, 0.6, 4],
      ['Black women voting rights', 2, 0.1, 0.35, 2],
      ['Black designated groups', 3, 0.03, 0.1, 3],
      ['Net Value — Black people', 8, 0.25, 0.3, 8],
      ['Total', 25, '', '', 25],
    ]
    const { metrics } = extractOwnershipSheetMetrics(ownershipWorkbook(rows))
    expect(num(metrics, 'ownership.voting_rights.black_people.percentage')).toBe(0.6)
    expect(num(metrics, 'ownership.economic_interest.black_people.percentage')).toBe(0.55)
    expect(num(metrics, 'ownership.voting_rights.black_women.percentage')).toBe(0.35)
    expect(num(metrics, 'ownership.economic_interest.black_women.percentage')).toBe(0.3)
  })
})

// ---------------------------------------------------------------------------
// (d) Missing required row — named error, and the sub-minimum stays untested
// ---------------------------------------------------------------------------
describe('missing net value', () => {
  const rows: unknown[][] = [
    ['Indicator', 'Weighting points', 'Targets', 'Verified level', 'Entity score'],
    ['Black people', 4, '25% + 1', 0.25, 0],
    ['Black women', 2, 0.1, 0, 0],
    ['Black people', 4, 0.25, 0.25, 0],
    ['Black women', 2, 0.1, 0, 0],
    ['ESOP,Black designed groups,B-BEE Schemes', 3, 0.03, 0, 0],
    ['New entrants', 2, 0.02, 0, 0],
    // net value row deliberately absent
    ['', 17, '', '', 0],
  ]

  it('raises a validation error naming net value', () => {
    const { metrics, issues } = extractOwnershipSheetMetrics(ownershipWorkbook(rows))
    const named = issues.some(
      (i) => i.severity === 'error' && /net value/i.test(i.message),
    )
    expect(named).toBe(true)
    expect(state(metrics, 'ownership.net_value.percentage')).toBe('error')
  })

  it('leaves the ownership priority sub-minimum untested rather than passed or failed', () => {
    const result = calculateGenericScorecard({
      ...completeScorecardInputs(),
      ownership: { ...completeScorecardInputs().ownership, netValuePercentage: null },
    })
    const sub = result.prioritySubminimums.find((s) => s.key === 'priority.ownership.net_value')
    expect(sub).toBeDefined()
    expect(sub!.evaluated).toBe(false)
    expect(sub!.passed).toBeNull()
    expect(sub!.thresholdPoints).toBe(3.2)
  })
})
