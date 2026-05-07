/**
 * Enterprise Development extraction from **`ED & SD`** (full-scorecard path only).
 *
 * ## Sheet layout (typical B-BBEE templates)
 *
 * - **Columns (scoring rows):** A = row label; B = actual / compliance %; C = target %; D = available points
 *   (same as Ownership / SED / Preferential Procurement).
 * - **Enterprise Development annual value** (`enterprise_development.annual_value.*`):
 *   Rows whose labels refer to **Enterprise Development** and **not** Supplier Development. Duplicate matches for the
 *   same logical block → warning metrics + validation issues; excluded from scoring.
 * - **Annual value amount** (currency, column B): optional row with ED context plus annual/value/contribution/spend
 *   wording; must not be the same classification as the main B–D compliance row (see `isEdAnnualAmountRow`).
 * - **Bonus — graduation** / **job creation**: optional single rows each when labels clearly include `graduation` or
 *   `job creation` (with bonus/enterprise context) and B–D are populated. Ambiguous duplicates → skipped with warnings.
 * - **Sheet total available points** (`enterprise_development.total.available_points`): optional row with `total`,
 *   `available`, enterprise/ED context, and **not** supplier-development wording.
 *
 * ## `NPAT`
 *
 * - **`enterprise_development.npat.amount`:** same discovery as `npat.value` (`findValueByTokens` on `npat`).
 *
 * ## Not in v1
 *
 * - **Supplier Development** is extracted separately in `supplier-development-sheet.ts` (same `ED & SD` tab).
 * - **NPAT-derived target** when the sheet only shows Rand value without an explicit target % row: not inferred;
 *   proportional scoring stays `not_calculated` until B–D are present.
 *
 * ## TODO
 *
 * - Supplier-level ED beneficiaries / grant detail ranges when a stable template contract exists.
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
import { ENTERPRISE_DEVELOPMENT_SHEET_METRIC_DEFINITIONS } from '../metric-definitions'
import {
  createMetricValue,
  detectExcelError,
  findValueByTokens,
  findWorkbookSheetByTitle,
} from './helpers'

const COL_LABEL = 0
const COL_TARGET = 1
const COL_AVAILABLE = 2
const COL_PERCENTAGE = 3

const ED_SD_SHEET = 'ED & SD'

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
  return new Map(ENTERPRISE_DEVELOPMENT_SHEET_METRIC_DEFINITIONS.map((d) => [d.metricKey, d]))
}

function emit(
  defs: Map<string, MetricDefinition>,
  metricKey: string,
  args: {
    value: unknown
    sourceSheet: string
    sourceCell: string | null
    sourceRange?: string | null
    validationState?: 'valid' | 'warning' | 'error'
    validationMessage?: string | null
  },
): ExtractedMetricValue {
  const def = defs.get(metricKey)
  if (!def) throw new Error(`Missing Enterprise Development metric definition: ${metricKey}`)
  return createMetricValue(def, args)
}

function pushAmbiguousPrefix(
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
  defs: Map<string, MetricDefinition>,
  sheetName: string,
  metricPrefix: string,
  suffixes: readonly string[],
  message: string,
) {
  for (const suf of suffixes) {
    const metricKey = `${metricPrefix}.${suf}`
    if (!defs.has(metricKey)) continue
    metrics.push(
      emit(defs, metricKey, {
        value: null,
        sourceSheet: sheetName,
        sourceCell: null,
        validationState: 'warning',
        validationMessage: message,
      }),
    )
  }
  issues.push({
    issueType: 'metric_value_warning',
    severity: 'warning',
    sheetName,
    metricKey: metricPrefix,
    message,
  })
}

function extractRowAt(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metricPrefix: string,
  row: number,
  metrics: ExtractedMetricValue[],
): void {
  const sheetName = sheet.sheetName
  const rawPct = sheet.rows[row]?.[COL_PERCENTAGE]
  const rawTgt = sheet.rows[row]?.[COL_TARGET]
  const rawAvail = sheet.rows[row]?.[COL_AVAILABLE]

  const pushCell = (suffix: string, col: number, raw: unknown) => {
    const metricKey = `${metricPrefix}.${suffix}`
    if (detectExcelError(raw)) {
      metrics.push(
        emit(defs, metricKey, {
          value: null,
          sourceSheet: sheetName,
          sourceCell: cellAddress(row, col),
          validationState: 'warning',
          validationMessage: `Excel error in ${metricKey}.`,
        }),
      )
      return
    }
    metrics.push(
      emit(defs, metricKey, {
        value: raw,
        sourceSheet: sheetName,
        sourceCell: cellAddress(row, col),
      }),
    )
  }

  pushCell('percentage', COL_PERCENTAGE, rawPct)
  pushCell('target', COL_TARGET, rawTgt)
  pushCell('available_points', COL_AVAILABLE, rawAvail)
}

function isSupplierDevelopmentOnlyContext(label: string): boolean {
  const l = normalizeLabel(label)
  if (l.includes('supplier development')) return true
  if (l.includes('supplier') && l.includes('development') && !l.includes('enterprise')) return true
  return false
}

function isEdEnterpriseContext(label: string): boolean {
  const l = normalizeLabel(label)
  if (!l.includes('enterprise') || !l.includes('development')) return false
  if (isSupplierDevelopmentOnlyContext(label)) return false
  return true
}

/** Rand / contribution row — not the B–D compliance % row. */
function isEdExclusiveAmountLabel(label: string): boolean {
  const l = normalizeLabel(label)
  if (!l.includes('enterprise') || !l.includes('development')) return false
  if (isSupplierDevelopmentOnlyContext(l)) return false
  if (l.includes('compliance') || l.includes('npat')) return false
  const money =
    l.includes('amount') ||
    l.includes('rand') ||
    l.includes('payment') ||
    l.includes('spend')
  const annualish = l.includes('annual') || l.includes('total') || l.includes('payment') || l.includes('spend')
  return money && annualish
}

function isEdMainComplianceLabel(label: string): boolean {
  const l = normalizeLabel(label)
  if (!isEdEnterpriseContext(label)) return false
  if (isEdExclusiveAmountLabel(label)) return false
  if (l.includes('graduation')) return false
  if (l.includes('job creation') || (l.includes('job') && l.includes('creation'))) return false
  if (l === 'ed & sd' || l === 'ed and sd' || l === 'ed&sd') return false
  if (l.includes('preferential procurement')) return false
  if (l.includes('skills development')) return false
  return true
}

function isEdAnnualAmountRow(label: string): boolean {
  return isEdExclusiveAmountLabel(label)
}

function rowHasComplianceShape(sheet: FullWorkbookSheetData, row: number): boolean {
  const pct = sheet.rows[row]?.[COL_PERCENTAGE]
  const tgt = sheet.rows[row]?.[COL_TARGET]
  const avail = sheet.rows[row]?.[COL_AVAILABLE]
  if (detectExcelError(pct) || detectExcelError(tgt) || detectExcelError(avail)) return false
  if (tgt == null || tgt === '' || avail == null || avail === '') return false
  return true
}

function extractEdAnnualCompliance(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const hits: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!isEdMainComplianceLabel(label)) continue
    if (!rowHasComplianceShape(sheet, r)) continue
    hits.push(r)
  }
  if (hits.length === 0) return
  if (hits.length > 1) {
    pushAmbiguousPrefix(
      metrics,
      issues,
      defs,
      sheet.sheetName,
      'enterprise_development.annual_value',
      ['percentage', 'target', 'available_points', 'amount'],
      `Ambiguous ED & SD sheet: ${hits.length} rows matched Enterprise Development compliance (B–D).`,
    )
    return
  }
  extractRowAt(sheet, defs, 'enterprise_development.annual_value', hits[0], metrics)
}

function extractEdAnnualAmount(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const hits: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!isEdAnnualAmountRow(label)) continue
    hits.push(r)
  }
  if (hits.length === 0) return
  if (hits.length > 1) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: sheet.sheetName,
      metricKey: 'enterprise_development.annual_value.amount',
      message: 'Multiple Enterprise Development annual value amount rows; amount skipped.',
    })
    return
  }
  const r = hits[0]
  const raw = sheet.rows[r]?.[COL_PERCENTAGE]
  if (detectExcelError(raw)) {
    metrics.push(
      emit(defs, 'enterprise_development.annual_value.amount', {
        value: null,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(r, COL_PERCENTAGE),
        validationState: 'warning',
        validationMessage: 'Excel error in enterprise_development.annual_value.amount.',
      }),
    )
    return
  }
  metrics.push(
    emit(defs, 'enterprise_development.annual_value.amount', {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(r, COL_PERCENTAGE),
    }),
  )
}

function extractBonusRow(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
  args: {
    metricPrefix: 'enterprise_development.bonus.graduation' | 'enterprise_development.bonus.job_creation'
    issueMetricKey: string
    ambiguousMessage: string
    rowPredicate: (label: string) => boolean
  },
): void {
  const hits: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!args.rowPredicate(label)) continue
    if (isSupplierDevelopmentOnlyContext(label)) continue
    if (!rowHasComplianceShape(sheet, r)) continue
    hits.push(r)
  }
  if (hits.length === 0) return
  if (hits.length > 1) {
    pushAmbiguousPrefix(
      metrics,
      issues,
      defs,
      sheet.sheetName,
      args.metricPrefix,
      ['percentage', 'target', 'available_points'],
      args.ambiguousMessage,
    )
    return
  }
  extractRowAt(sheet, defs, args.metricPrefix, hits[0], metrics)
}

function extractEdSheetTotalAvailable(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const isTotalRow = (label: string) => {
    const l = normalizeLabel(label)
    return (
      l.includes('total') &&
      l.includes('available') &&
      (l.includes('enterprise') || l.includes(' ed ') || l.startsWith('ed ') || l.includes('point')) &&
      !l.includes('supplier')
    )
  }

  let totalRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!isTotalRow(label)) continue
    if (totalRow >= 0) {
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        metricKey: 'enterprise_development.total.available_points',
        message: 'Multiple ED total-available rows; total skipped.',
      })
      return
    }
    totalRow = r
  }
  if (totalRow < 0) return

  const raw = sheet.rows[totalRow]?.[COL_AVAILABLE]
  metrics.push(
    emit(defs, 'enterprise_development.total.available_points', {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(totalRow, COL_AVAILABLE),
    }),
  )
}

function extractNpatMirror(
  parsedWorkbook: ParsedWorkbookResult,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const npat = findWorkbookSheetByTitle(parsedWorkbook, 'NPAT')
  if (!npat) {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: 'NPAT',
      message: 'NPAT sheet not found; enterprise_development.npat.amount not extracted.',
    })
    return
  }
  const found = findValueByTokens(npat, ['npat'])
  if (!found || found.sourceCell == null) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: npat.sheetName,
      metricKey: 'enterprise_development.npat.amount',
      message: 'Could not locate NPAT value for enterprise_development.npat.amount.',
    })
    return
  }
  if (detectExcelError(found.value)) {
    metrics.push(
      emit(defs, 'enterprise_development.npat.amount', {
        value: null,
        sourceSheet: npat.sheetName,
        sourceCell: found.sourceCell,
        validationState: 'warning',
        validationMessage: 'Excel error in enterprise_development.npat.amount.',
      }),
    )
    return
  }
  metrics.push(
    emit(defs, 'enterprise_development.npat.amount', {
      value: found.value,
      sourceSheet: npat.sheetName,
      sourceCell: found.sourceCell,
    }),
  )
}

export function extractEnterpriseDevelopmentSheetMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const metrics: ExtractedMetricValue[] = []
  const issues: FullWorkbookValidationIssue[] = []
  const defs = defByKey()

  const sheet = findWorkbookSheetByTitle(parsedWorkbook, ED_SD_SHEET)
  if (sheet) {
    extractEdAnnualCompliance(sheet, defs, metrics, issues)
    extractEdAnnualAmount(sheet, defs, metrics, issues)
    extractBonusRow(sheet, defs, metrics, issues, {
      metricPrefix: 'enterprise_development.bonus.graduation',
      issueMetricKey: 'enterprise_development.bonus.graduation',
      ambiguousMessage: 'Multiple graduation bonus rows on ED & SD; graduation bonus skipped.',
      rowPredicate: (l) =>
        l.includes('graduation') && (l.includes('bonus') || l.includes('enterprise') || l.includes('development')),
    })
    extractBonusRow(sheet, defs, metrics, issues, {
      metricPrefix: 'enterprise_development.bonus.job_creation',
      issueMetricKey: 'enterprise_development.bonus.job_creation',
      ambiguousMessage: 'Multiple job creation bonus rows on ED & SD; job creation bonus skipped.',
      rowPredicate: (l) =>
        (l.includes('job') && l.includes('creation')) ||
        l.includes('job creation') ||
        (l.includes('jobs') && l.includes('created')),
    })
    extractEdSheetTotalAvailable(sheet, defs, metrics, issues)
  } else {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: ED_SD_SHEET,
      message: `Sheet "${ED_SD_SHEET}" not found; Enterprise Development metrics were not extracted.`,
    })
  }

  extractNpatMirror(parsedWorkbook, defs, metrics, issues)

  return { metrics, issues }
}
