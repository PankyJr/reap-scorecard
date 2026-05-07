/**
 * Preferential Procurement — **`TMPS`** (Total Measured Procurement Spend) sheet extraction.
 *
 * ## Layout (when present)
 *
 * - **Column A:** row labels; **column B:** primary numeric value (currency or % depending on row).
 * - **Total measured procurement spend** → `preferential_procurement.total_measured_procurement_spend.amount`
 *   when a single row matches `total` + `measured` + (`procurement` | `spend`).
 * - **Recognised procurement spend** → `preferential_procurement.recognised_procurement_spend.amount` when a single
 *   row matches `recognised`/`recognized` + (`procurement` | `spend` | `amount`).
 * - **Procurement recognition %** → `preferential_procurement.procurement_recognition.percentage` when a single row
 *   matches `recognition` + (`%` | `percent` | `compliance` | `rate`).
 *
 * Duplicate label matches for the same metric → warning, metric omitted. Missing sheet → warnings only, no metrics.
 */
import * as XLSX from 'xlsx'
import type {
  CanonicalExtractionResult,
  ExtractedMetricValue,
  FullWorkbookSheetData,
  FullWorkbookValidationIssue,
  MetricDefinition,
  ParsedWorkbookResult,
} from '../types'
import { PREFERENTIAL_PROCUREMENT_SHEET_METRIC_DEFINITIONS } from '../metric-definitions'
import { createMetricValue, detectExcelError, findWorkbookSheetByTitle } from './helpers'

const COL_LABEL = 0
const COL_VALUE = 1

function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function cellAddress(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c })
}

function defByKey(): Map<string, MetricDefinition> {
  return new Map(PREFERENTIAL_PROCUREMENT_SHEET_METRIC_DEFINITIONS.map((d) => [d.metricKey, d]))
}

function emit(
  defs: Map<string, MetricDefinition>,
  metricKey: string,
  args: {
    value: unknown
    sourceSheet: string
    sourceCell: string | null
    validationState?: 'valid' | 'warning' | 'error'
    validationMessage?: string | null
  },
): ExtractedMetricValue {
  const def = defs.get(metricKey)
  if (!def) throw new Error(`Missing Preferential Procurement metric definition: ${metricKey}`)
  return createMetricValue(def, args)
}

function extractSingleRowMetric(args: {
  sheet: FullWorkbookSheetData
  defs: Map<string, MetricDefinition>
  metrics: ExtractedMetricValue[]
  issues: FullWorkbookValidationIssue[]
  metricKey: string
  issueMetricKey: string
  ambiguousMessage: string
  rowPredicate: (label: string) => boolean
}): void {
  const { sheet, defs, metrics, issues, metricKey, issueMetricKey, ambiguousMessage, rowPredicate } = args
  const hits: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!rowPredicate(label)) continue
    hits.push(r)
  }
  if (hits.length === 0) return
  if (hits.length > 1) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: sheet.sheetName,
      metricKey: issueMetricKey,
      message: ambiguousMessage,
    })
    return
  }
  const r = hits[0]
  const raw = sheet.rows[r]?.[COL_VALUE]
  if (detectExcelError(raw)) {
    metrics.push(
      emit(defs, metricKey, {
        value: null,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(r, COL_VALUE),
        validationState: 'warning',
        validationMessage: `Excel error in ${metricKey}.`,
      }),
    )
    return
  }
  metrics.push(
    emit(defs, metricKey, {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(r, COL_VALUE),
    }),
  )
}

export function extractTmpsSheetPreferentialMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const metrics: ExtractedMetricValue[] = []
  const issues: FullWorkbookValidationIssue[] = []
  const defs = defByKey()

  const sheet = findWorkbookSheetByTitle(parsedWorkbook, 'TMPS')
  if (!sheet) {
    issues.push({
      issueType: 'parse_warning',
      severity: 'warning',
      message: 'Optional sheet "TMPS" not found; TMPS summary procurement metrics were not extracted.',
    })
    return { metrics, issues }
  }

  extractSingleRowMetric({
    sheet,
    defs,
    metrics,
    issues,
    metricKey: 'preferential_procurement.total_measured_procurement_spend.amount',
    issueMetricKey: 'preferential_procurement.total_measured_procurement_spend.amount',
    ambiguousMessage: 'Multiple TMPS rows matched total measured procurement spend; metric skipped.',
    rowPredicate: (l) =>
      l.includes('total') && l.includes('measured') && (l.includes('procurement') || l.includes('spend')),
  })

  extractSingleRowMetric({
    sheet,
    defs,
    metrics,
    issues,
    metricKey: 'preferential_procurement.recognised_procurement_spend.amount',
    issueMetricKey: 'preferential_procurement.recognised_procurement_spend.amount',
    ambiguousMessage: 'Multiple TMPS rows matched recognised procurement spend; metric skipped.',
    rowPredicate: (l) =>
      !l.includes('supplier development') &&
      !l.includes('enterprise development') &&
      (l.includes('recognised') || l.includes('recognized')) &&
      (l.includes('procurement') || l.includes('spend') || l.includes('amount')),
  })

  extractSingleRowMetric({
    sheet,
    defs,
    metrics,
    issues,
    metricKey: 'preferential_procurement.procurement_recognition.percentage',
    issueMetricKey: 'preferential_procurement.procurement_recognition.percentage',
    ambiguousMessage: 'Multiple TMPS rows matched procurement recognition %; metric skipped.',
    rowPredicate: (l) =>
      l.includes('recognition') &&
      (l.includes('%') || l.includes('percent') || l.includes('compliance') || l.includes('rate')),
  })

  return { metrics, issues }
}
