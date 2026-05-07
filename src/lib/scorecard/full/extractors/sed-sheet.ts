/**
 * Deterministic Socio-Economic Development (SED) extraction — full-scorecard path only.
 *
 * ## `SED` sheet (typical generic B-BBEE templates)
 *
 * - **Column layout (where used):** A = row label; B = actual / compliance %; C = target %; D = available points
 *   (same as Ownership / Management Control / Skills Development).
 * - **Main compliance row** (`socio_economic_development.annual_spend.{percentage,target,available_points}`):
 *   A single row whose label clearly refers to **socio-economic development** (e.g. contains both `socio` and
 *   `economic`, or `socio-economic`) and is **not** ED/SD/supplier wording. If multiple rows match, all three
 *   metrics are emitted as warnings and excluded from scoring.
 * - **Annual spend amount** (`socio_economic_development.annual_spend.amount`, currency): optional row whose label
 *   combines SED/socio-economic context with annual/total/year and spend/amount/contribution/rand. Value read from
 *   column B. Ambiguous duplicates → warning, metric omitted.
 * - **Pillar total available points** (`socio_economic_development.total.available_points`): optional row on `SED`
 *   with `total`, `available`, and (`sed` | `socio` | `point` | `development`).
 *
 * ## `NPAT` sheet
 *
 * - **`socio_economic_development.npat.amount`:** same discovery as `npat.value` (first numeric cell on a row
 *   matching token `npat`) for audit linkage; canonical NPAT for other pillars remains `npat.value` / `npat.target_base_value`.
 *
 * ## Not scored from NPAT alone in v1
 *
 * If the workbook does **not** expose an unambiguous SED compliance row with B–D (% / target / points), the engine
 * keeps **annual spend** as `not_calculated` even when amount and NPAT are present — we do not infer a target % from
 * generic templates.
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
import { SOCIO_ECONOMIC_DEVELOPMENT_SHEET_METRIC_DEFINITIONS } from '../metric-definitions'
import { createMetricValue, detectExcelError, findValueByTokens, findWorkbookSheetByTitle } from './helpers'

const COL_TARGET = 1
const COL_AVAILABLE = 2
const COL_PERCENTAGE = 3
const COL_AUDIT_LABEL = 5
const COL_AUDIT_VALUE = 6

function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Row semantics may span A–C when titles are merged; skip pure-numeric cells. */
function sedRowScanLabel(sheet: FullWorkbookSheetData, r: number): string {
  const parts: string[] = []
  for (let c = 0; c <= 2; c += 1) {
    const raw = sheet.rows[r]?.[c]
    if (raw == null || raw === '') continue
    const s = String(raw).trim().toLowerCase()
    if (/^[\d%,.\s-]+$/.test(s)) continue
    parts.push(normalizeLabel(raw))
  }
  return parts.join(' ')
}

function cellAddress(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c })
}

function defByKey(): Map<string, MetricDefinition> {
  return new Map(SOCIO_ECONOMIC_DEVELOPMENT_SHEET_METRIC_DEFINITIONS.map((d) => [d.metricKey, d]))
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
  if (!def) throw new Error(`Missing SED metric definition: ${metricKey}`)
  return createMetricValue(def, args)
}

function pushAmbiguousAnnualSpendTriple(
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
  defs: Map<string, MetricDefinition>,
  sheetName: string,
  message: string,
) {
  const prefix = 'socio_economic_development.annual_spend'
  for (const suf of ['percentage', 'target', 'available_points'] as const) {
    const metricKey = `${prefix}.${suf}`
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
    metricKey: prefix,
    message,
  })
}

function cellNumericUsable(raw: unknown): boolean {
  if (raw == null || raw === '') return false
  if (detectExcelError(raw)) return false
  const n = Number(String(raw).replace(/[,%\s]/g, ''))
  return Number.isFinite(n)
}

function rowHasComplianceTriple(sheet: FullWorkbookSheetData, row: number, startCol: number): boolean {
  const a = sheet.rows[row]?.[startCol]
  const b = sheet.rows[row]?.[startCol + 1]
  const c = sheet.rows[row]?.[startCol + 2]
  return cellNumericUsable(a) && cellNumericUsable(b) && cellNumericUsable(c)
}

function isSedTabularHeader(label: string): boolean {
  return (
    label.includes('measurement category') &&
    label.includes('criteria')
  )
}

function extractRowAt(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metricPrefix: string,
  row: number,
  metrics: ExtractedMetricValue[],
  /** Column index for percentage (B=1). Use 2 when label occupies B and %/target/points are in C–E. */
  percentStartCol: number = COL_PERCENTAGE,
): void {
  const sheetName = sheet.sheetName
  const rawPct = sheet.rows[row]?.[percentStartCol]
  const rawTgt = sheet.rows[row]?.[percentStartCol + 1]
  const rawAvail = sheet.rows[row]?.[percentStartCol + 2]

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

  pushCell('percentage', percentStartCol, rawPct)
  pushCell('target', percentStartCol + 1, rawTgt)
  pushCell('available_points', percentStartCol + 2, rawAvail)
}

function isSedMainComplianceLabel(label: string): boolean {
  const l = normalizeLabel(label)
  if (!l) return false
  if (l.includes('supplier development') || l.includes('enterprise development')) return false
  if (l.includes('preferential procurement')) return false
  if (l.includes('skills development')) return false
  if ((l.includes('socio') && l.includes('economic')) || l.includes('socio-economic')) return true
  if (l.includes('socio economic') && l.includes('development')) return true
  if (l.includes('sed') && l.includes('npat')) {
    if (l.includes('enterprise') || l.includes('supplier') || l.includes('skill')) return false
    return true
  }
  if (l.includes('npat') && (l.includes('socio') || l.includes('sed') || l.includes('contribution'))) return true
  if (l.includes('%') && l.includes('npat') && l.includes('socio')) return true
  if (
    l.includes('sed') &&
    (l.includes('%') || l.includes('percent') || l.includes('percentage')) &&
    !l.includes('enterprise') &&
    !l.includes('supplier') &&
    !l.includes('skill')
  ) {
    return true
  }
  return false
}

function isSedAnnualAmountRow(label: string): boolean {
  const l = normalizeLabel(label)
  if (!l) return false
  if (isSedMainComplianceLabel(label)) return false
  if (l.includes('supplier development') || l.includes('enterprise development')) return false
  const socio =
    (l.includes('socio') && l.includes('economic')) ||
    l.includes('socio-economic') ||
    (l.includes('sed') && !l.includes('learnership'))
  if (!socio) return false
  const spendish =
    l.includes('spend') || l.includes('amount') || l.includes('contribution') || l.includes('payment')
  const annualish = l.includes('annual') || l.includes('total') || l.includes('year') || l.includes('rand')
  return spendish && annualish
}

function rowHasComplianceShape(sheet: FullWorkbookSheetData, row: number): boolean {
  return rowHasComplianceTriple(sheet, row, 1) || rowHasComplianceTriple(sheet, row, 2)
}

function extractSedComplianceRow(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const hits: number[] = []
  let headerRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = sedRowScanLabel(sheet, r)
    if (headerRow < 0 && isSedTabularHeader(label)) headerRow = r
    if (!isSedMainComplianceLabel(label)) continue
    const hasTabularValues = cellNumericUsable(sheet.rows[r]?.[COL_TARGET]) || cellNumericUsable(sheet.rows[r]?.[COL_AVAILABLE])
    const hasLegacyShape = rowHasComplianceShape(sheet, r)
    if (!hasTabularValues && !hasLegacyShape) continue
    hits.push(r)
  }

  if (hits.length === 0) return
  if (hits.length > 1) {
    pushAmbiguousAnnualSpendTriple(
      metrics,
      issues,
      defs,
      sheet.sheetName,
      `Ambiguous SED sheet: ${hits.length} rows matched socio-economic compliance (B–D scoring row).`,
    )
    return
  }
  const r = hits[0]
  const hasSedAtoELayout = headerRow >= 0 && r > headerRow
  if (hasSedAtoELayout) {
    const targetRaw = sheet.rows[r]?.[COL_TARGET]
    const availableRaw = sheet.rows[r]?.[COL_AVAILABLE]
    const percentageRaw = sheet.rows[r]?.[COL_PERCENTAGE]

    metrics.push(
      emit(defs, 'socio_economic_development.annual_spend.target', {
        value: targetRaw,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(r, COL_TARGET),
      }),
    )
    metrics.push(
      emit(defs, 'socio_economic_development.annual_spend.available_points', {
        value: availableRaw,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(r, COL_AVAILABLE),
      }),
    )
    if (percentageRaw == null || percentageRaw === '') {
      metrics.push(
        emit(defs, 'socio_economic_development.annual_spend.percentage', {
          value: null,
          sourceSheet: sheet.sheetName,
          sourceCell: cellAddress(r, COL_PERCENTAGE),
          validationState: 'warning',
          validationMessage: `Achieved percentage missing from SED ${cellAddress(r, COL_PERCENTAGE)}.`,
        }),
      )
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        metricKey: 'socio_economic_development.annual_spend.percentage',
        message: `Achieved percentage missing from SED ${cellAddress(r, COL_PERCENTAGE)}.`,
      })
    } else {
      metrics.push(
        emit(defs, 'socio_economic_development.annual_spend.percentage', {
          value: percentageRaw,
          sourceSheet: sheet.sheetName,
          sourceCell: cellAddress(r, COL_PERCENTAGE),
        }),
      )
    }
    return
  }

  const startCol = rowHasComplianceTriple(sheet, r, 1) ? 1 : 2
  extractRowAt(sheet, defs, 'socio_economic_development.annual_spend', r, metrics, startCol)
}

function extractAnnualSpendAmount(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const hits: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = sedRowScanLabel(sheet, r)
    if (!isSedAnnualAmountRow(label)) continue
    hits.push(r)
  }
  if (hits.length === 0) {
    // Layout fallback: audit subtotal often appears in F/G as "Total" + amount.
    for (let r = 0; r < sheet.rows.length; r += 1) {
      const f = normalizeLabel(sheet.rows[r]?.[COL_AUDIT_LABEL])
      const g = sheet.rows[r]?.[COL_AUDIT_VALUE]
      if (f === 'total' && cellNumericUsable(g)) {
        metrics.push(
          emit(defs, 'socio_economic_development.annual_spend.amount', {
            value: g,
            sourceSheet: sheet.sheetName,
            sourceCell: cellAddress(r, COL_AUDIT_VALUE),
            validationState: 'valid',
            validationMessage: 'Extracted from SED recognised donation total (audit metric).',
          }),
        )
        return
      }
    }
    return
  }
  if (hits.length > 1) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: sheet.sheetName,
      metricKey: 'socio_economic_development.annual_spend.amount',
      message: 'Multiple annual SED spend amount rows; amount metric skipped.',
    })
    return
  }
  const r = hits[0]
  let amountCol = COL_PERCENTAGE
  let raw: unknown = sheet.rows[r]?.[amountCol]
  if (!cellNumericUsable(raw) || detectExcelError(raw)) {
    for (const c of [2, 3, 1]) {
      const v = sheet.rows[r]?.[c]
      if (cellNumericUsable(v) && !detectExcelError(v)) {
        amountCol = c
        raw = v
        break
      }
    }
  }
  if (detectExcelError(raw)) {
    metrics.push(
      emit(defs, 'socio_economic_development.annual_spend.amount', {
        value: null,
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(r, amountCol),
        validationState: 'warning',
        validationMessage: 'Excel error in socio_economic_development.annual_spend.amount.',
      }),
    )
    return
  }
  metrics.push(
    emit(defs, 'socio_economic_development.annual_spend.amount', {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(r, amountCol),
    }),
  )
}

function extractSedSheetTotalAvailable(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const isTotalRow = (label: string) =>
    label.includes('total') &&
    label.includes('available') &&
    (label.includes('sed') || label.includes('socio') || label.includes('point') || label.includes('development'))

  let totalRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = sedRowScanLabel(sheet, r)
    if (!isTotalRow(label)) continue
    if (totalRow >= 0) {
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        metricKey: 'socio_economic_development.total.available_points',
        message: 'Multiple total-available rows on SED sheet; total skipped.',
      })
      return
    }
    totalRow = r
  }
  if (totalRow < 0) return

  const raw = sheet.rows[totalRow]?.[COL_AVAILABLE]
  metrics.push(
    emit(defs, 'socio_economic_development.total.available_points', {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(totalRow, COL_AVAILABLE),
    }),
  )
}

function extractSedNpatFromSedSheet(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
): boolean {
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const l = normalizeLabel(sheet.rows[r]?.[0])
    if (!l) continue
    if (l.includes('net profit tax') || l === 'npat' || l.includes('npat')) {
      metrics.push(
        emit(defs, 'socio_economic_development.npat.amount', {
          value: sheet.rows[r]?.[1],
          sourceSheet: sheet.sheetName,
          sourceCell: cellAddress(r, 1),
        }),
      )
      return true
    }
  }
  return false
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
      message: 'NPAT sheet not found; socio_economic_development.npat.amount not extracted.',
    })
    return
  }
  // Prefer explicit "Net Profit Tax"/NPAT row in column A with value in column B for this template family.
  for (let r = 0; r < npat.rows.length; r += 1) {
    const l = normalizeLabel(npat.rows[r]?.[0])
    if (!l) continue
    if (l.includes('net profit tax') || l === 'npat' || l.includes('npat')) {
      const raw = npat.rows[r]?.[1]
      metrics.push(
        emit(defs, 'socio_economic_development.npat.amount', {
          value: raw,
          sourceSheet: npat.sheetName,
          sourceCell: cellAddress(r, 1),
        }),
      )
      return
    }
  }

  const found = findValueByTokens(npat, ['npat'])
  if (!found || found.sourceCell == null) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: npat.sheetName,
      metricKey: 'socio_economic_development.npat.amount',
      message: 'Could not locate NPAT value row for socio_economic_development.npat.amount.',
    })
    return
  }
  if (detectExcelError(found.value)) {
    metrics.push(
      emit(defs, 'socio_economic_development.npat.amount', {
        value: null,
        sourceSheet: npat.sheetName,
        sourceCell: found.sourceCell,
        validationState: 'warning',
        validationMessage: 'Excel error in socio_economic_development.npat.amount.',
      }),
    )
    return
  }
  metrics.push(
    emit(defs, 'socio_economic_development.npat.amount', {
      value: found.value,
      sourceSheet: npat.sheetName,
      sourceCell: found.sourceCell,
    }),
  )
}

export function extractSedSheetMetrics(parsedWorkbook: ParsedWorkbookResult): CanonicalExtractionResult {
  const metrics: ExtractedMetricValue[] = []
  const issues: FullWorkbookValidationIssue[] = []
  const defs = defByKey()

  const sed = findWorkbookSheetByTitle(parsedWorkbook, 'SED')
  let hasSedNpat = false
  if (sed) {
    extractSedComplianceRow(sed, defs, metrics, issues)
    extractAnnualSpendAmount(sed, defs, metrics, issues)
    extractSedSheetTotalAvailable(sed, defs, metrics, issues)
    hasSedNpat = extractSedNpatFromSedSheet(sed, defs, metrics)
  } else {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: 'SED',
      message: 'Sheet "SED" not found; socio-economic development metrics were not extracted.',
    })
  }

  if (!hasSedNpat) {
    extractNpatMirror(parsedWorkbook, defs, metrics, issues)
  }

  return { metrics, issues }
}
