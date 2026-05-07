import * as XLSX from 'xlsx'
import type {
  ExtractedMetricValue,
  FullMetricValueType,
  FullWorkbookSheetData,
  FullWorkbookValidationIssue,
  MetricDefinition,
  ParsedCellData,
  ParsedWorkbookResult,
} from '../types'

const EXCEL_ERROR_VALUES = new Set([
  '#REF!',
  '#DIV/0!',
  '#VALUE!',
  '#N/A',
  '#NAME?',
  '#NULL!',
  '#NUM!',
])

function isDateValue(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

export function detectExcelError(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim().toUpperCase()
  return EXCEL_ERROR_VALUES.has(text) ? text : null
}

export function normalizeNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = String(value).replace(/[,%\s]/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizePercentage(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1 ? value / 100 : value
  }
  const text = String(value).trim()
  const hasPercent = text.includes('%')
  const n = normalizeNumber(text)
  if (n == null) return null
  return hasPercent || n > 1 ? n / 100 : n
}

export function normalizeCurrency(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value).replace(/[,\sR$£€]/g, '')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value == null) return null
  const text = String(value).trim().toLowerCase()
  if (['yes', 'true', '1', 'y'].includes(text)) return true
  if (['no', 'false', '0', 'n'].includes(text)) return false
  return null
}

function formatCellValue(value: unknown): string | null {
  if (value == null) return null
  if (isDateValue(value)) return value.toISOString().slice(0, 10)
  return String(value)
}

export function getCellValue(sheet: FullWorkbookSheetData, address: string): ParsedCellData | null {
  return sheet.cells[address] ?? null
}

export function getRangeRows(sheet: FullWorkbookSheetData, range: string): unknown[][] {
  try {
    const decoded = XLSX.utils.decode_range(range)
    const rows: unknown[][] = []
    for (let r = decoded.s.r; r <= decoded.e.r; r += 1) {
      const row: unknown[] = []
      for (let c = decoded.s.c; c <= decoded.e.c; c += 1) {
        row.push(sheet.rows[r]?.[c] ?? null)
      }
      rows.push(row)
    }
    return rows
  } catch {
    return []
  }
}

export function findValueByTokens(
  sheet: FullWorkbookSheetData,
  tokens: string[],
): { value: unknown; sourceCell: string | null; sourceRange: string | null } | null {
  if (tokens.length === 0) return null
  const matchTokens = tokens.map((t) => t.toLowerCase())

  for (let r = 0; r < sheet.rows.length; r += 1) {
    const row = sheet.rows[r] ?? []
    const lowerRow = row.map((cell) => String(cell ?? '').toLowerCase())
    const joined = lowerRow.join(' | ')
    const matchesAll = matchTokens.every((token) => joined.includes(token))
    if (!matchesAll) continue

    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c]
      if (cell == null || cell === '') continue
      const cellText = String(cell).toLowerCase()
      const isLabelCell = matchTokens.some((token) => token.length >= 3 && cellText.includes(token))
      if (isLabelCell) continue
      const address = XLSX.utils.encode_cell({ c, r })
      return { value: cell, sourceCell: address, sourceRange: null }
    }
  }

  return null
}

function normalizeByType(expectedType: MetricDefinition['expectedType'], value: unknown): {
  valueType: FullMetricValueType
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  dateValue: string | null
} {
  if (value == null || value === '') {
    return {
      valueType: 'empty',
      numericValue: null,
      textValue: null,
      booleanValue: null,
      dateValue: null,
    }
  }

  const excelError = detectExcelError(value)
  if (excelError) {
    return {
      valueType: 'error',
      numericValue: null,
      textValue: excelError,
      booleanValue: null,
      dateValue: null,
    }
  }

  if (expectedType === 'number') {
    const n = normalizeNumber(value)
    return {
      valueType: n == null ? 'empty' : 'number',
      numericValue: n,
      textValue: n == null ? formatCellValue(value) : null,
      booleanValue: null,
      dateValue: null,
    }
  }

  if (expectedType === 'percentage') {
    const n = normalizePercentage(value)
    return {
      valueType: n == null ? 'empty' : 'percentage',
      numericValue: n,
      textValue: n == null ? formatCellValue(value) : null,
      booleanValue: null,
      dateValue: null,
    }
  }

  if (expectedType === 'currency') {
    const n = normalizeCurrency(value)
    return {
      valueType: n == null ? 'empty' : 'currency',
      numericValue: n,
      textValue: n == null ? formatCellValue(value) : null,
      booleanValue: null,
      dateValue: null,
    }
  }

  if (expectedType === 'boolean') {
    const b = normalizeBoolean(value)
    return {
      valueType: b == null ? 'empty' : 'boolean',
      numericValue: null,
      textValue: b == null ? formatCellValue(value) : null,
      booleanValue: b,
      dateValue: null,
    }
  }

  if (expectedType === 'date') {
    if (isDateValue(value)) {
      return {
        valueType: 'date',
        numericValue: null,
        textValue: null,
        booleanValue: null,
        dateValue: value.toISOString().slice(0, 10),
      }
    }
    return {
      valueType: 'empty',
      numericValue: null,
      textValue: formatCellValue(value),
      booleanValue: null,
      dateValue: null,
    }
  }

  return {
    valueType: 'text',
    numericValue: null,
    textValue: formatCellValue(value),
    booleanValue: null,
    dateValue: null,
  }
}

export function createMetricValue(
  definition: MetricDefinition,
  args: {
    value: unknown
    sourceSheet: string
    sourceCell?: string | null
    sourceRange?: string | null
    validationState?: 'valid' | 'warning' | 'error'
    validationMessage?: string | null
  },
): ExtractedMetricValue {
  const normalized = normalizeByType(definition.expectedType, args.value)
  return {
    metricKey: definition.metricKey,
    pillar: definition.pillar,
    section: definition.section,
    label: definition.label,
    valueType: normalized.valueType,
    numericValue: normalized.numericValue,
    textValue: normalized.textValue,
    booleanValue: normalized.booleanValue,
    dateValue: normalized.dateValue,
    unit: definition.unit ?? null,
    sourceSheet: args.sourceSheet,
    sourceCell: args.sourceCell ?? null,
    sourceRange: args.sourceRange ?? null,
    rawValue: formatCellValue(args.value),
    validationState: args.validationState ?? 'valid',
    validationMessage: args.validationMessage ?? null,
  }
}

export function buildMetricValidationIssue(
  definition: MetricDefinition,
  metric: ExtractedMetricValue,
  message: string,
): FullWorkbookValidationIssue {
  const severity = metric.validationState === 'error' ? 'error' : 'warning'
  return {
    issueType: severity === 'error' ? 'metric_value_error' : 'metric_value_warning',
    severity,
    sheetName: metric.sourceSheet,
    metricKey: definition.metricKey,
    cellRef: metric.sourceCell ?? undefined,
    message,
    metadata: {
      pillar: definition.pillar,
      label: definition.label,
      value_type: metric.valueType,
    },
  }
}

/** Collapses whitespace and NBSP; lowercases (for matching Excel tab titles). */
export function normalizeWorkbookSheetTitle(raw: string): string {
  return String(raw ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/&/g, ' and ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Strips leading workbook section numbers from tab titles (e.g. "1. Ownership", "03 - SED", "5) Skills Development").
 */
export function canonicalWorkbookSheetTitle(raw: string): string {
  const n = normalizeWorkbookSheetTitle(raw)
  return n.replace(/^\d+\s*[\s).:-]*\s*/, '')
}

/**
 * Finds a sheet when tab titles include numeric prefixes, NBSP, or inconsistent spacing.
 * Pass the canonical template name(s), e.g. `findWorkbookSheetByTitle(parsed, 'SED', 'Ownership')`.
 */
export function findWorkbookSheetByTitle(
  parsedWorkbook: ParsedWorkbookResult,
  ...titles: string[]
): FullWorkbookSheetData | undefined {
  const targets = new Set<string>()
  for (const t of titles) {
    targets.add(normalizeWorkbookSheetTitle(t))
    targets.add(canonicalWorkbookSheetTitle(t))
  }

  for (const sheet of parsedWorkbook.sheets) {
    const n = normalizeWorkbookSheetTitle(sheet.sheetName)
    const c = canonicalWorkbookSheetTitle(sheet.sheetName)
    if (targets.has(n) || targets.has(c)) return sheet
  }
  return undefined
}
