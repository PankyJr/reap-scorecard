/**
 * Deterministic Management Control extraction from workbook tabs.
 *
 * ## Sheet roles (typical B-BBEE generic templates — verify against live files)
 *
 * **`3 Board Members`**
 * - Expected: column A row labels; columns B–D (or B–D after label) hold actual %, target %, available points
 *   for Black people / Black women rows under the board composition table.
 * - Metrics: `management_control.board.*`
 *
 * **`4 Executive Committe`**
 * - Same column pattern as board sheet for executive director composition rows.
 * - Metrics: `management_control.executive_directors.*`
 *
 * **`Employment Equity`**
 * - Section headers in column A (rows without “black” in the label) for:
 *   Other executive management, Senior / Middle / Junior management, Employees with disabilities.
 * - Data rows below a header inherit that section until the next header row.
 * - Metrics: `management_control.other_executive_management.*`, `senior_management.*`, `middle_management.*`,
 *   `junior_management.*`, `management_control.employees_with_disabilities.black_people.*` only (no Black women
 *   keys in schema — Black women rows in this section are skipped with a warning).
 *
 * **`5 Staff List`**
 * - TODO: Some templates place management band counts here instead of Employment Equity. No automatic fallback
 *   yet; if Employment Equity sections are missing, extraction emits warnings rather than guessing from Staff List.
 *
 * **`Management Control` (summary tab)**
 * - Optional row for pillar total available points → `management_control.total.available_points`.
 *
 * ## Column layout (same as Ownership extractor where applicable)
 * - Column A (0): label
 * - Column B (1): actual / compliance %
 * - Column C (2): target %
 * - Column D (3): available points
 *
 * Ambiguous duplicate demographic rows → warning metrics + validation issues; those metrics are excluded from scoring.
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
import { MANAGEMENT_CONTROL_SHEET_METRIC_DEFINITIONS } from '../metric-definitions'
import { createMetricValue, detectExcelError, findWorkbookSheetByTitle } from './helpers'

const COL_LABEL = 0
const COL_TARGET = 1
const COL_AVAILABLE = 2
const COL_PERCENTAGE = 3

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
  return new Map(MANAGEMENT_CONTROL_SHEET_METRIC_DEFINITIONS.map((d) => [d.metricKey, d]))
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
  if (!def) throw new Error(`Missing Management Control metric definition: ${metricKey}`)
  return createMetricValue(def, args)
}

function pushAmbiguousPrefix(
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
  defs: Map<string, MetricDefinition>,
  sheetName: string,
  metricPrefix: string,
  message: string,
) {
  const suffixes = ['percentage', 'target', 'available_points'] as const
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

function toNumber(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(String(raw).replace(/[,%\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

function rowHasDeterministicTriple(sheet: FullWorkbookSheetData, row: number): boolean {
  const target = sheet.rows[row]?.[COL_TARGET]
  const available = sheet.rows[row]?.[COL_AVAILABLE]
  if (detectExcelError(target) || detectExcelError(available)) return false
  return toNumber(target) != null && toNumber(available) != null
}

function classifyBlackRow(label: string): 'black_people' | 'black_women' | null {
  if (!label.includes('black')) return null
  if (label.includes('woman') || label.includes('women') || label.includes('female')) return 'black_women'
  if (label.includes('people') || label.includes('person') || label.includes('employee')) return 'black_people'
  return null
}

function extractBlackPeopleWomenOnSheet(args: {
  sheet: FullWorkbookSheetData
  defs: Map<string, MetricDefinition>
  metricStem: string
  metrics: ExtractedMetricValue[]
  issues: FullWorkbookValidationIssue[]
  startRow?: number
  endRow?: number
}): void {
  const { sheet, defs, metricStem, metrics, issues } = args
  const start = args.startRow ?? 0
  const end = args.endRow ?? sheet.rows.length
  const plans: { kind: 'black_people' | 'black_women'; row: number }[] = []
  const ambiguous = new Set<string>()
  const seen = new Map<string, number>()

  for (let r = start; r < end; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!label) continue
    const kind = classifyBlackRow(label)
    if (!kind) continue
    if (!rowHasDeterministicTriple(sheet, r)) continue
    if (seen.has(kind)) {
      ambiguous.add(kind)
      continue
    }
    seen.set(kind, r)
    plans.push({ kind, row: r })
  }

  for (const k of ambiguous) {
    pushAmbiguousPrefix(
      metrics,
      issues,
      defs,
      sheet.sheetName,
      `${metricStem}.${k}`,
      `Ambiguous Management Control sheet "${sheet.sheetName}": multiple rows matched ${k.replace('_', ' ')}.`,
    )
  }

  for (const p of plans) {
    if (ambiguous.has(p.kind)) continue
    extractRowAt(sheet, defs, `${metricStem}.${p.kind}`, p.row, metrics)
  }
}

type EeSectionKey =
  | 'other_executive_management'
  | 'senior_management'
  | 'middle_management'
  | 'junior_management'
  | 'employees_with_disabilities'

function eeSectionFromHeader(label: string): EeSectionKey | null {
  if (label.includes('black')) return null
  if (label.includes('disabilit') || label.includes('employees with disabilities')) {
    return 'employees_with_disabilities'
  }
  if (label.includes('other') && label.includes('executive') && label.includes('management')) {
    return 'other_executive_management'
  }
  if (label.includes('senior') && label.includes('management')) return 'senior_management'
  if (label.includes('middle') && label.includes('management')) return 'middle_management'
  if (label.includes('junior') && label.includes('management')) return 'junior_management'
  return null
}

function extractEmploymentEquity(args: {
  sheet: FullWorkbookSheetData
  defs: Map<string, MetricDefinition>
  metrics: ExtractedMetricValue[]
  issues: FullWorkbookValidationIssue[]
}): void {
  const { sheet, defs, metrics, issues } = args
  let currentSection: EeSectionKey | null = null

  type Hit = { section: EeSectionKey; kind: 'black_people' | 'black_women'; row: number }
  const hits: Hit[] = []

  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!label) continue

    const header = eeSectionFromHeader(label)
    if (header) {
      currentSection = header
      continue
    }

    if (!currentSection) continue

    const kind = classifyBlackRow(label)
    if (!kind) continue
    if (!rowHasDeterministicTriple(sheet, r)) continue

    if (currentSection === 'employees_with_disabilities' && kind === 'black_women') {
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        message:
          'Employees with disabilities row matched Black women; schema only includes black_people — row skipped.',
        cellRef: cellAddress(r, COL_LABEL),
      })
      continue
    }

    hits.push({ section: currentSection, kind, row: r })
  }

  const byKey = new Map<string, number[]>()
  for (const h of hits) {
    const k = `${h.section}:${h.kind}`
    const arr = byKey.get(k) ?? []
    arr.push(h.row)
    byKey.set(k, arr)
  }

  for (const [key, rows] of byKey.entries()) {
    const [section, kind] = key.split(':') as [EeSectionKey, 'black_people' | 'black_women']
    const metricStem = `management_control.${section}.${kind}`
    if (rows.length > 1) {
      pushAmbiguousPrefix(
        metrics,
        issues,
        defs,
        sheet.sheetName,
        metricStem,
        `Ambiguous Employment Equity: ${rows.length} rows matched ${section} / ${kind.replace('_', ' ')}.`,
      )
      continue
    }
    extractRowAt(sheet, defs, metricStem, rows[0], metrics)
  }
}

function extractDisabilityFallback(args: {
  sheet: FullWorkbookSheetData
  defs: Map<string, MetricDefinition>
  metrics: ExtractedMetricValue[]
}): void {
  const { sheet, defs, metrics } = args
  const prefix = 'management_control.employees_with_disabilities.black_people'
  if (metrics.some((m) => m.metricKey.startsWith(`${prefix}.`) && m.validationState === 'valid')) return

  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!label) continue
    if (!(label.includes('disabilit') && label.includes('black') && !label.includes('women'))) continue
    if (!label.includes('people') && !label.includes('person')) continue
    extractRowAt(sheet, defs, prefix, r, metrics)
    return
  }
}

function extractMainSheetTotal(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const isTotalRow = (label: string, row: unknown[]) =>
    label.includes('total') &&
    (label.includes('available') ||
      label.includes('management') ||
      label.includes('control') ||
      label.includes('point') ||
      toNumber(row[COL_AVAILABLE]) != null)

  let totalRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
    if (!isTotalRow(label, sheet.rows[r] ?? [])) continue
    if (totalRow >= 0) {
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        metricKey: 'management_control.total.available_points',
        message: 'Multiple total-available rows on Management Control sheet; total skipped.',
      })
      return
    }
    totalRow = r
  }
  if (totalRow < 0) return

  const raw = sheet.rows[totalRow]?.[COL_AVAILABLE]
  metrics.push(
    emit(defs, 'management_control.total.available_points', {
      value: raw,
      sourceSheet: sheet.sheetName,
      sourceCell: cellAddress(totalRow, COL_AVAILABLE),
    }),
  )
}

function extractManagementControlSummaryRows(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): void {
  const map: Array<{ contains: string[]; metricStem: string }> = [
    { contains: ['black female', 'board member'], metricStem: 'management_control.board.black_women' },
    { contains: ['black', 'board member'], metricStem: 'management_control.board.black_people' },
    { contains: ['black executive directors'], metricStem: 'management_control.executive_directors.black_people' },
    { contains: ['black female executive directors'], metricStem: 'management_control.executive_directors.black_women' },
    { contains: ['black other executive manager'], metricStem: 'management_control.other_executive_management.black_people' },
    {
      contains: ['black female', 'other executive manager'],
      metricStem: 'management_control.other_executive_management.black_women',
    },
  ]

  for (const item of map) {
    const hits: number[] = []
    for (let r = 0; r < sheet.rows.length; r += 1) {
      const label = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
      if (!label) continue
      if (!item.contains.every((t) => label.includes(t))) continue
      if (item.metricStem.endsWith('.black_people') && label.includes('black female')) continue
      if (!rowHasDeterministicTriple(sheet, r)) continue
      hits.push(r)
    }
    if (hits.length === 0) continue
    if (hits.length > 1) {
      pushAmbiguousPrefix(
        metrics,
        issues,
        defs,
        sheet.sheetName,
        item.metricStem,
        `Ambiguous Management Control summary: ${hits.length} rows matched ${item.metricStem}.`,
      )
      continue
    }
    extractRowAt(sheet, defs, item.metricStem, hits[0], metrics)
  }
}

export function extractManagementControlSheetMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const metrics: ExtractedMetricValue[] = []
  const issues: FullWorkbookValidationIssue[] = []
  const defs = defByKey()

  const board = findWorkbookSheetByTitle(parsedWorkbook, '3 Board Members')
  if (board) {
    extractBlackPeopleWomenOnSheet({ sheet: board, defs, metricStem: 'management_control.board', metrics, issues })
  } else {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: '3 Board Members',
      message: 'Sheet "3 Board Members" not found; board Management Control metrics were not extracted.',
    })
  }

  const exec = findWorkbookSheetByTitle(parsedWorkbook, '4 Executive Committe')
  if (exec) {
    extractBlackPeopleWomenOnSheet({
      sheet: exec,
      defs,
      metricStem: 'management_control.executive_directors',
      metrics,
      issues,
    })
  } else {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: '4 Executive Committe',
      message: 'Sheet "4 Executive Committe" not found; executive director metrics were not extracted.',
    })
  }

  const ee = findWorkbookSheetByTitle(parsedWorkbook, 'Employment Equity')
  if (ee) {
    extractEmploymentEquity({ sheet: ee, defs, metrics, issues })
    extractDisabilityFallback({ sheet: ee, defs, metrics })
  } else {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: 'Employment Equity',
      message:
        'Employment Equity sheet not found; management band and disability metrics were not extracted.',
    })
  }

  const mc = findWorkbookSheetByTitle(parsedWorkbook, 'Management Control')
  if (mc) {
    extractManagementControlSummaryRows(mc, defs, metrics, issues)
    extractMainSheetTotal(mc, defs, metrics, issues)
  }

  if (!findWorkbookSheetByTitle(parsedWorkbook, '5 Staff List')) {
    issues.push({
      issueType: 'parse_warning',
      severity: 'warning',
      message:
        'Optional sheet "5 Staff List" not present — if your template stores management levels only there, extraction may be incomplete (see management-control-sheets.ts TODO).',
    })
  }

  return { metrics, issues }
}
