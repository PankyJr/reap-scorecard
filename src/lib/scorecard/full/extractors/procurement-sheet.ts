/**
 * Preferential Procurement — `Procurement` sheet extraction (full-scorecard path only).
 *
 * ## Layout (typical B-BBEE templates)
 *
 * - **Columns:** A = row label; B = actual / compliance %; C = target %; D = available points (same as MC / SD).
 * - **Scoring rows:** One row per sub-indicator stem when the label matches a known Preferential Procurement category
 *   (B-BBEE spend, QSE/EME, Black-owned, Black women-owned, Designated group). Duplicate matches for the same stem →
 *   warning metrics + validation issues; that stem is excluded from scoring.
 * - **Pillar total:** Optional row with `total` + `available` + (`procurement` | `preferential` | `point`) on this sheet
 *   → `preferential_procurement.total.available_points`.
 *
 * ## Not in v1
 *
 * - **Supplier detail ranges:** Line-level supplier tables vary by template; no stable contract. TODO: map supplier
 *   blocks when a locked template is available.
 * - **Summary spend on this sheet:** `total measured` / `recognised spend` rows are handled on **`TMPS`** when
 *   present (`tmps-sheet.ts`).
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
const COL_TARGET = 1
const COL_AVAILABLE = 2
const COL_PERCENTAGE = 3
const COL_POINTS_ACHIEVED = 4

export type PreferentialProcurementStem =
  | 'preferential_procurement.b_bbee_procurement_spend'
  | 'preferential_procurement.qse_eme_procurement'
  | 'preferential_procurement.black_owned_procurement'
  | 'preferential_procurement.black_women_owned_procurement'
  | 'preferential_procurement.designated_group_procurement'

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
    sourceRange?: string | null
    validationState?: 'valid' | 'warning' | 'error'
    validationMessage?: string | null
  },
): ExtractedMetricValue {
  const def = defs.get(metricKey)
  if (!def) throw new Error(`Missing Preferential Procurement metric definition: ${metricKey}`)
  return createMetricValue(def, args)
}

function pushAmbiguousStem(
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
  defs: Map<string, MetricDefinition>,
  sheetName: string,
  metricStem: PreferentialProcurementStem,
  message: string,
) {
  for (const suf of ['percentage', 'target', 'available_points'] as const) {
    const metricKey = `${metricStem}.${suf}`
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
    metricKey: metricStem,
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
  const rawPoints = sheet.rows[row]?.[COL_POINTS_ACHIEVED]

  const numeric = (v: unknown): number | null => {
    if (v == null || v === '') return null
    const n = Number(String(v).replace(/[,%\s]/g, ''))
    return Number.isFinite(n) ? n : null
  }

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

  const targetNumeric = numeric(rawTgt)
  const availNumeric = numeric(rawAvail)
  const pointsNumeric = numeric(rawPoints)
  if (
    (rawPct == null || rawPct === '') &&
    targetNumeric != null &&
    availNumeric != null &&
    availNumeric > 0 &&
    pointsNumeric != null
  ) {
    const derivedPct = (pointsNumeric / availNumeric) * targetNumeric
    metrics.push(
      emit(defs, `${metricPrefix}.percentage`, {
        value: derivedPct,
        sourceSheet: sheetName,
        sourceCell: cellAddress(row, COL_POINTS_ACHIEVED),
        validationState: 'valid',
        validationMessage: 'Derived achieved percentage from points achieved (Procurement column E).',
      }),
    )
  } else {
    pushCell('percentage', COL_PERCENTAGE, rawPct)
  }
  pushCell('target', COL_TARGET, rawTgt)
  pushCell('available_points', COL_AVAILABLE, rawAvail)
}

function isProcurementSummaryOrNonPreferentialRow(label: string): boolean {
  const l = normalizeLabel(label)
  if (!l) return true
  if (l.includes('enterprise development') || l.includes('supplier development')) return true
  if (l.includes('skills development') || l.includes('management control')) return true
  if (l.includes('socio-economic') || (l.includes('socio') && l.includes('economic'))) return true
  if (l.includes('total measured') && (l.includes('procurement') || l.includes('spend'))) return true
  if ((l.includes('recognised') || l.includes('recognized')) && (l.includes('spend') || l.includes('procurement')))
    return true
  if (l.includes('supplier list') || l.includes('supplier name')) return true
  return false
}

function classifyPreferentialProcurementStem(label: string): PreferentialProcurementStem | null {
  const l = normalizeLabel(label)
  if (!l || isProcurementSummaryOrNonPreferentialRow(label)) return null

  if (
    l.includes('black') &&
    (l.includes('women') || l.includes('woman')) &&
    (l.includes('owned') || l.includes('ownership'))
  ) {
    return 'preferential_procurement.black_women_owned_procurement'
  }
  if (l.includes('black') && (l.includes('owned') || l.includes('ownership'))) {
    return 'preferential_procurement.black_owned_procurement'
  }
  if (l.includes('designated') && l.includes('group')) {
    return 'preferential_procurement.designated_group_procurement'
  }
  if (
    (l.includes('qse') || l.includes('eme')) &&
    (l.includes('procurement') || l.includes('spend') || l.includes('supplier') || l === 'from all qses' || l === 'from all emes')
  ) {
    return 'preferential_procurement.qse_eme_procurement'
  }
  if (
    (l.includes('b-bbee') || l.includes('b bbee') || l.includes('bbbee')) &&
    (l.includes('procurement') || l.includes('spend') || l.includes('supplier'))
  ) {
    return 'preferential_procurement.b_bbee_procurement_spend'
  }
  return null
}

function rowHasComplianceShape(sheet: FullWorkbookSheetData, row: number): boolean {
  const pct = sheet.rows[row]?.[COL_PERCENTAGE]
  const tgt = sheet.rows[row]?.[COL_TARGET]
  const avail = sheet.rows[row]?.[COL_AVAILABLE]
  const points = sheet.rows[row]?.[COL_POINTS_ACHIEVED]
  if (detectExcelError(pct) || detectExcelError(tgt) || detectExcelError(avail) || detectExcelError(points))
    return false
  if (tgt == null || tgt === '' || avail == null || avail === '') return false
  if (pct == null || pct === '') {
    return !(points == null || points === '')
  }
  return true
}

function extractPreferentialTotals(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const isTotalRow = (label: string, row: unknown[]) =>
    label.includes('total') &&
    (label.includes('procurement') ||
      label.includes('preferential') ||
      label.includes('point') ||
      label.includes('pp') ||
      Number.isFinite(Number(String(row[COL_AVAILABLE] ?? '').replace(/[,%\s]/g, ''))))

  let totalRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!isTotalRow(label, sheet.rows[r] ?? [])) continue
    if (totalRow >= 0) {
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        metricKey: 'preferential_procurement.total.available_points',
        message: 'Multiple total-available rows on Procurement sheet; total skipped.',
      })
      return
    }
    totalRow = r
  }
  if (totalRow < 0) return

  const raw = sheet.rows[totalRow]?.[COL_AVAILABLE]
  metrics.push(
    emit(defs, 'preferential_procurement.total.available_points', {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(totalRow, COL_AVAILABLE),
    }),
  )
}

export function extractProcurementSheetPreferentialMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const metrics: ExtractedMetricValue[] = []
  const issues: FullWorkbookValidationIssue[] = []
  const defs = defByKey()

  const sheet = findWorkbookSheetByTitle(parsedWorkbook, 'Procurement')
  if (!sheet) {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: 'Procurement',
      message: 'Sheet "Procurement" not found; preferential procurement row metrics were not extracted.',
    })
    return { metrics, issues }
  }

  const byStem = new Map<PreferentialProcurementStem, number[]>()
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    const stem = classifyPreferentialProcurementStem(label)
    if (!stem) continue
    if (!rowHasComplianceShape(sheet, r)) continue
    const arr = byStem.get(stem) ?? []
    arr.push(r)
    byStem.set(stem, arr)
  }

  const stems: PreferentialProcurementStem[] = [
    'preferential_procurement.b_bbee_procurement_spend',
    'preferential_procurement.qse_eme_procurement',
    'preferential_procurement.black_owned_procurement',
    'preferential_procurement.black_women_owned_procurement',
    'preferential_procurement.designated_group_procurement',
  ]

  for (const stem of stems) {
    const rows = byStem.get(stem) ?? []
    if (rows.length === 0) continue
    if (stem === 'preferential_procurement.qse_eme_procurement' && rows.length >= 2) {
      const n = (v: unknown): number | null => {
        if (v == null || v === '') return null
        const x = Number(String(v).replace(/[,%\s]/g, ''))
        return Number.isFinite(x) ? x : null
      }
      const target = n(sheet.rows[rows[0]]?.[COL_TARGET])
      const available = rows.reduce((sum, r) => sum + (n(sheet.rows[r]?.[COL_AVAILABLE]) ?? 0), 0)
      const achievedPoints = rows.reduce((sum, r) => sum + (n(sheet.rows[r]?.[COL_POINTS_ACHIEVED]) ?? 0), 0)
      if (target != null && available > 0) {
        metrics.push(
          emit(defs, 'preferential_procurement.qse_eme_procurement.target', {
            value: target,
            sourceSheet: sheet.sheetName,
            sourceCell: cellAddress(rows[0], COL_TARGET),
            validationState: 'valid',
            validationMessage: 'Combined QSE/EME target from Procurement rows.',
          }),
        )
        metrics.push(
          emit(defs, 'preferential_procurement.qse_eme_procurement.available_points', {
            value: available,
            sourceSheet: sheet.sheetName,
            sourceCell: cellAddress(rows[0], COL_AVAILABLE),
            validationState: 'valid',
            validationMessage: 'Combined QSE/EME available points from Procurement rows.',
          }),
        )
        metrics.push(
          emit(defs, 'preferential_procurement.qse_eme_procurement.percentage', {
            value: (achievedPoints / available) * target,
            sourceSheet: sheet.sheetName,
            sourceCell: cellAddress(rows[0], COL_POINTS_ACHIEVED),
            validationState: 'valid',
            validationMessage: 'Derived QSE/EME achieved percentage from combined points achieved.',
          }),
        )
        continue
      }
    }
    if (rows.length > 1) {
      pushAmbiguousStem(
        metrics,
        issues,
        defs,
        sheet.sheetName,
        stem,
        `Ambiguous Procurement sheet: ${rows.length} rows matched ${stem.replace('preferential_procurement.', '')}.`,
      )
      continue
    }
    extractRowAt(sheet, defs, stem, rows[0], metrics)
  }

  extractPreferentialTotals(sheet, defs, metrics, issues)

  return { metrics, issues }
}
