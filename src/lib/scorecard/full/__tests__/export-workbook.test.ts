import { describe, expect, it } from 'vitest'
import {
  buildFullWorkbookSmoke,
  collectReferencedMetricKeys,
  sanitizeExcelSheetName,
} from '../export-workbook'

describe('export-workbook helpers', () => {
  it('collectReferencedMetricKeys gathers unique keys from indicator source metrics', () => {
    const keys = collectReferencedMetricKeys({
      pillars: [
        {
          label: 'Ownership',
          sections: [
            {
              label: 'Total',
              indicators: [
                {
                  label: 'Total',
                  availablePoints: 25,
                  achievedPoints: 10,
                  possiblePoints1: 25,
                  possiblePoints2: null,
                  status: 'calculated',
                  missingMetricKeys: [],
                  warnings: [],
                  sourceMetrics: [{ metricKey: 'a' }, { metricKey: 'b' }],
                },
                {
                  label: 'Sub',
                  availablePoints: null,
                  achievedPoints: null,
                  possiblePoints1: null,
                  possiblePoints2: null,
                  status: 'not_calculated',
                  missingMetricKeys: [],
                  warnings: [],
                  sourceMetrics: [{ metricKey: 'a' }],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(keys.sort()).toEqual(['a', 'b'])
  })

  it('sanitizeExcelSheetName removes invalid characters and truncates', () => {
    expect(sanitizeExcelSheetName('Full Scorecard')).toBe('Full Scorecard')
    expect(sanitizeExcelSheetName('Bad:Name*')).toBe('Bad-Name-')
    expect(sanitizeExcelSheetName('x'.repeat(40))).toHaveLength(31)
  })

  it('buildFullWorkbookSmoke produces a non-empty xlsx buffer', () => {
    const buf = buildFullWorkbookSmoke()
    expect(buf.length).toBeGreaterThan(100)
    expect(buf.subarray(0, 2).toString('hex')).toBe('504b')
  })
})
