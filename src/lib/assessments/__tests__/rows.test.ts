import { describe, expect, it } from 'vitest'
import { PROCUREMENT_LIST_COLUMNS, procurementToRow, type StoredProcurement } from '../rows'
import { PROCUREMENT_CATEGORIES } from '@/lib/procurement/config'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'

/** Every line at its full points: the six lines add up past the cap. */
const FULL_MARKS = PROCUREMENT_CATEGORIES.map((c) => ({ category_key: c.key, points_achieved: c.availablePoints }))
const ALL_SIX = PROCUREMENT_CATEGORIES.reduce((sum, c) => sum + c.availablePoints, 0)

const stored = (over: Partial<StoredProcurement>): StoredProcurement => ({
  id: 'p1',
  company_id: 'c1',
  assessment_year: 2025,
  total_score: ALL_SIX,
  created_at: '2026-10-01T00:00:00Z',
  ...over,
})

describe('a procurement scorecard in a list', () => {
  it('reads the saved line results with the list, so no second read is needed', () => {
    expect(PROCUREMENT_LIST_COLUMNS).toContain('procurement_results(category_key, points_achieved)')
  })

  it('shows base points out of the cap with the bonus apart, as the score page does', () => {
    const row = procurementToRow(stored({ procurement_results: FULL_MARKS }), 'Acme')
    expect(row.score).toBe(
      `${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points, bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`,
    )
    expect(row.score).not.toContain(String(ALL_SIX))
  })

  it('falls back to the stored total as plain points, with no maximum, when no line results are saved', () => {
    expect(procurementToRow(stored({ procurement_results: [], total_score: '26.4' })).score).toBe('26.40 points')
    expect(procurementToRow(stored({ total_score: null })).score).toBe('—')
  })
})
