/**
 * Optional end-to-end check against a real workbook on disk.
 *
 * Do not commit client workbooks. Set:
 *   FULL_SCORECARD_SAMPLE_XLSX=/absolute/path/to/Generic\ Scorecard\ sample\(2\).xlsx
 * then run: npx vitest run src/lib/scorecard/full/engine/__tests__/sample-workbook.integration.test.ts
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { parseWorkbookFromBuffer } from '../../parser'
import { validateParsedWorkbook } from '../../validators'
import { extractCanonicalMetrics } from '../../extractors'
import { runFullScorecardEngine } from '../index'

const SAMPLE = process.env.FULL_SCORECARD_SAMPLE_XLSX

describe.skipIf(!SAMPLE || !existsSync(resolve(SAMPLE)))('sample workbook (FULL_SCORECARD_SAMPLE_XLSX)', () => {
  it('parses, extracts, scores, and attaches validation summary', () => {
    const buf = readFileSync(resolve(SAMPLE!))
    const parsed = parseWorkbookFromBuffer({
      filename: 'Generic Scorecard sample(2).xlsx',
      buffer: buf,
      fileSize: buf.length,
    })
    const validation = validateParsedWorkbook(parsed)
    expect(validation.hasBlockingErrors).toBe(false)

    const extraction = extractCanonicalMetrics(parsed)
    expect(extraction.metrics.length).toBeGreaterThan(0)

    const metricRows = extraction.metrics.map((m) => ({
      metric_key: m.metricKey,
      pillar: m.pillar,
      numeric_value: m.numericValue,
      text_value: m.textValue,
      boolean_value: m.booleanValue,
      value_type: m.valueType,
      validation_state: m.validationState,
      validation_message: m.validationMessage,
      source_sheet: m.sourceSheet,
      source_cell: m.sourceCell,
      source_range: m.sourceRange,
    }))

    const result = runFullScorecardEngine(metricRows as Parameters<typeof runFullScorecardEngine>[0])
    expect(result.validationSummary).toBeDefined()
    expect(result.validationSummary?.elements.length).toBeGreaterThan(0)
    expect(['complete', 'partial']).toContain(result.overall.scoreCompleteness)
  })
})
