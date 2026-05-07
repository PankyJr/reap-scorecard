import * as XLSX from 'xlsx'
import type {
  CanonicalExtractionResult,
  ExtractedMetricValue,
  FullWorkbookValidationIssue,
  FullWorkbookSheetData,
  MetricDefinition,
  ParsedWorkbookResult,
} from '../types'
import { FULL_SCORECARD_REFERENCE_METRIC_DEFINITIONS } from '../metric-definitions'
import { createMetricValue, detectExcelError, findWorkbookSheetByTitle } from './helpers'

/** Label column and numeric columns for typical Full Scorecard summary layout. */
const LABEL_COL = 0
const COL_AVAILABLE = 1
const COL_ACHIEVED = 2
const COL_POSSIBLE_1 = 3
const COL_POSSIBLE_2 = 4

function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Summary label is usually column A; merged templates may put text in B when A is blank (skip pure numbers). */
function referenceSummaryLabel(sheet: FullWorkbookSheetData, r: number): string {
  const a = normalizeLabel(sheet.rows[r]?.[LABEL_COL])
  if (a) return a
  const raw = sheet.rows[r]?.[1]
  if (raw == null || raw === '') return ''
  const s = String(raw).trim().toLowerCase()
  if (/^[\d%,.\s-]+$/.test(s)) return ''
  return normalizeLabel(raw)
}

function cellAddress(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c })
}

function defMap(): Map<string, MetricDefinition> {
  return new Map(
    FULL_SCORECARD_REFERENCE_METRIC_DEFINITIONS.map((d) => [d.metricKey, d]),
  )
}

type RowMatchMode = 'exact' | 'includes_all'

interface LabelRowRule {
  metricSuffix: string
  modes: Array<{ mode: RowMatchMode; value: string | string[] }>
  /** When multiple rows match, prefer the one with a numeric in this column (if any). */
  preferNumericCol?: number
  /** Single-cell metrics read from this column only (default COL_AVAILABLE for numerics). */
  valueCol?: number
}

const OVERALL_ROW_RULES: LabelRowRule[] = [
  {
    metricSuffix: 'total_available_points',
    modes: [{ mode: 'includes_all', value: ['total', 'available', 'points'] }],
    preferNumericCol: COL_AVAILABLE,
  },
  {
    metricSuffix: 'total_points_achieved',
    modes: [
      { mode: 'includes_all', value: ['total', 'points', 'achieved'] },
      { mode: 'includes_all', value: ['total', 'achieved', 'points'] },
    ],
    preferNumericCol: COL_AVAILABLE,
  },
  {
    metricSuffix: 'total_possible_points_1',
    modes: [
      { mode: 'includes_all', value: ['total', 'possible', 'points', '1'] },
      { mode: 'includes_all', value: ['total', 'possible', 'points', '(1)'] },
    ],
    preferNumericCol: COL_AVAILABLE,
  },
  {
    metricSuffix: 'total_possible_points_2',
    modes: [
      { mode: 'includes_all', value: ['total', 'possible', 'points', '2'] },
      { mode: 'includes_all', value: ['total', 'possible', 'points', '(2)'] },
    ],
    preferNumericCol: COL_AVAILABLE,
  },
  {
    metricSuffix: 'final_score',
    modes: [
      { mode: 'exact', value: 'final score' },
      { mode: 'includes_all', value: ['final', 'score'] },
      { mode: 'includes_all', value: ['total', 'generic', 'score'] },
      { mode: 'includes_all', value: ['total', 'bbb', 'score'] },
      { mode: 'includes_all', value: ['generic', 'score'] },
    ],
    preferNumericCol: COL_AVAILABLE,
  },
  {
    metricSuffix: 'discounting_applicable',
    modes: [{ mode: 'includes_all', value: ['discounting', 'applicable'] }],
    valueCol: COL_AVAILABLE,
  },
  {
    metricSuffix: 'bbbee_level',
    modes: [
      { mode: 'includes_all', value: ['b-bbee', 'level'] },
      { mode: 'includes_all', value: ['bbbee', 'level'] },
    ],
    valueCol: COL_AVAILABLE,
  },
  {
    metricSuffix: 'recognition_percentage',
    modes: [{ mode: 'includes_all', value: ['recognition'] }],
    preferNumericCol: COL_AVAILABLE,
  },
]

interface ElementRowConfig {
  element: string
  exactLabels: string[]
  includesAll: string[][]
  excludes: string[]
}

const ELEMENT_ROW_CONFIGS: ElementRowConfig[] = [
  {
    element: 'ownership',
    exactLabels: ['ownership'],
    includesAll: [['ownership', 'available']],
    excludes: ['supplier', 'enterprise', 'preferential', 'procurement', 'socio'],
  },
  {
    element: 'management_control',
    exactLabels: ['management control'],
    includesAll: [['management', 'control', 'available']],
    excludes: [],
  },
  {
    element: 'skills_development',
    exactLabels: ['skills development'],
    includesAll: [['skills', 'development', 'available']],
    /** Avoid matching ED/SD/procurement summary lines that mention "development" and "available". */
    excludes: ['socio', 'preferential', 'procurement', 'enterprise', 'supplier'],
  },
  {
    element: 'preferential_procurement',
    exactLabels: ['preferential procurement'],
    includesAll: [
      ['preferential', 'procurement', 'available'],
      ['preferential', 'procurement', 'points'],
      ['preferential', 'procurement'],
    ],
    excludes: ['enterprise', 'supplier', 'skills', 'socio'],
  },
  {
    element: 'enterprise_development',
    exactLabels: ['enterprise development'],
    includesAll: [['enterprise', 'development', 'available']],
    excludes: ['supplier'],
  },
  {
    element: 'supplier_development',
    exactLabels: ['supplier development'],
    includesAll: [['supplier', 'development', 'available']],
    excludes: ['enterprise'],
  },
  {
    element: 'socio_economic_development',
    exactLabels: ['socio-economic development', 'socio economic development'],
    includesAll: [['socio', 'economic', 'development']],
    excludes: [],
  },
]

function detectElementSummaryHeader(sheet: FullWorkbookSheetData): {
  row: number
  elementCol: number
  availableCol: number
  possible1Col: number
  possible2Col: number
} | null {
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const row = sheet.rows[r] ?? []
    for (let c = 0; c < row.length; c += 1) {
      const label = normalizeLabel(row[c])
      if (!label.includes('element')) continue
      let avail = -1
      let p1 = -1
      let p2 = -1
      for (let k = c + 1; k < Math.min(row.length, c + 8); k += 1) {
        const h = normalizeLabel(row[k])
        if (avail < 0 && h.includes('available') && h.includes('point')) avail = k
        if (p1 < 0 && h.includes('possible points 1')) p1 = k
        if (p2 < 0 && h.includes('possible points 2')) p2 = k
      }
      if (avail >= 0 && p1 >= 0) {
        return { row: r, elementCol: c, availableCol: avail, possible1Col: p1, possible2Col: p2 }
      }
    }
  }
  return null
}

function elementKeyFromLabel(label: string): string | null {
  const l = normalizeLabel(label)
  if (l === 'ownership') return 'ownership'
  if (l === 'management control') return 'management_control'
  if (l === 'skills development') return 'skills_development'
  if (l.includes('preferential procurement')) return 'preferential_procurement'
  if (l.includes('enterprise development')) return 'enterprise_development'
  if (l.includes('supplier development')) return 'supplier_development'
  if (l.includes('socio economic development') || l.includes('socio-economic development')) return 'socio_economic_development'
  return null
}

function extractFromElementSummaryTable(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: CanonicalExtractionResult['metrics'],
): { mappedElements: Set<string>; finalScoreValue: number | null; finalScoreCell: string | null } {
  const mapped = new Set<string>()
  let finalScoreValue: number | null = null
  let finalScoreCell: string | null = null
  const hdr = detectElementSummaryHeader(sheet)
  if (!hdr) return { mappedElements: mapped, finalScoreValue, finalScoreCell }

  for (let r = hdr.row + 1; r < sheet.rows.length; r += 1) {
    const labelRaw = sheet.rows[r]?.[hdr.elementCol]
    const label = normalizeLabel(labelRaw)
    if (!label) continue
    if (label.includes('discounting')) break

    if (label === 'total') {
      finalScoreValue = Number(sheet.rows[r]?.[hdr.possible1Col] ?? null)
      finalScoreCell = cellAddress(r, hdr.possible1Col)
      continue
    }

    const key = elementKeyFromLabel(label)
    if (!key) continue
    mapped.add(key)
    const base = `full_scorecard.reference.${key}`
    const entries: Array<[string, number]> = [
      ['available_points', hdr.availableCol],
      ['points_achieved', hdr.possible1Col],
      ['possible_points_1', hdr.possible1Col],
    ]
    if (hdr.possible2Col >= 0) {
      entries.push(['possible_points_2', hdr.possible2Col])
    }
    for (const [suffix, col] of entries) {
      const metricKey = `${base}.${suffix}`
      if (!defs.has(metricKey)) continue
      metrics.push(
        emitFromDefinition(defs, metricKey, {
          value: sheet.rows[r]?.[col],
          sourceSheet: sheet.sheetName,
          sourceCell: cellAddress(r, col),
        }),
      )
    }
  }

  return { mappedElements: mapped, finalScoreValue, finalScoreCell }
}

function labelMatchesRule(label: string, rule: LabelRowRule): boolean {
  for (const m of rule.modes) {
    if (m.mode === 'exact') {
      const v = typeof m.value === 'string' ? m.value : String(m.value[0] ?? '')
      if (label === normalizeLabel(v)) return true
    } else {
      const tokens = Array.isArray(m.value) ? m.value : [String(m.value)]
      if (tokens.every((t) => label.includes(t))) return true
    }
  }
  return false
}

function rowHasNumeric(sheet: FullWorkbookSheetData, r: number, c: number): boolean {
  const raw = sheet.rows[r]?.[c]
  if (raw == null || raw === '') return false
  if (detectExcelError(raw)) return false
  const n = Number(String(raw).replace(/[,%\s]/g, ''))
  return Number.isFinite(n)
}

function collectMatchingRows(sheet: FullWorkbookSheetData, rule: LabelRowRule): number[] {
  const hits: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = referenceSummaryLabel(sheet, r)
    if (!label) continue
    if (labelMatchesRule(label, rule)) hits.push(r)
  }
  return hits
}

function disambiguateRows(
  sheet: FullWorkbookSheetData,
  rows: number[],
  preferCol?: number,
): { chosen: number | null; ambiguous: boolean } {
  if (rows.length === 0) return { chosen: null, ambiguous: false }
  if (rows.length === 1) return { chosen: rows[0], ambiguous: false }
  if (preferCol == null) return { chosen: null, ambiguous: true }
  const withNum = rows.filter((r) => rowHasNumeric(sheet, r, preferCol))
  if (withNum.length === 1) return { chosen: withNum[0], ambiguous: false }
  return { chosen: null, ambiguous: true }
}

function elementRowMatches(label: string, cfg: ElementRowConfig): boolean {
  if (cfg.exactLabels.some((el) => label === el)) return true
  if (
    cfg.includesAll.some((tokens) => tokens.every((t) => label.includes(t))) &&
    !cfg.excludes.some((ex) => label.includes(ex))
  ) {
    return true
  }
  return false
}

function collectElementRows(sheet: FullWorkbookSheetData, cfg: ElementRowConfig): number[] {
  const hits: number[] = []
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = referenceSummaryLabel(sheet, r)
    if (!label) continue
    if (elementRowMatches(label, cfg)) hits.push(r)
  }
  return hits
}

function disambiguateElementRows(
  sheet: FullWorkbookSheetData,
  rows: number[],
  cfg: ElementRowConfig,
): {
  chosen: number | null
  ambiguous: boolean
} {
  if (rows.length === 0) return { chosen: null, ambiguous: false }
  if (rows.length === 1) return { chosen: rows[0], ambiguous: false }

  const exactHits = rows.filter((r) => {
    const label = referenceSummaryLabel(sheet, r)
    return cfg.exactLabels.some((el) => label === el)
  })
  if (exactHits.length === 1) return { chosen: exactHits[0], ambiguous: false }
  if (exactHits.length > 1) return { chosen: null, ambiguous: true }

  const withAvail = rows.filter((r) => rowHasNumeric(sheet, r, COL_AVAILABLE))
  if (withAvail.length === 1) return { chosen: withAvail[0], ambiguous: false }
  const withAny = rows.filter(
    (r) =>
      rowHasNumeric(sheet, r, COL_AVAILABLE) ||
      rowHasNumeric(sheet, r, COL_ACHIEVED) ||
      rowHasNumeric(sheet, r, COL_POSSIBLE_1),
  )
  if (withAny.length === 1) return { chosen: withAny[0], ambiguous: false }
  return { chosen: null, ambiguous: true }
}

function candidateRowLabelsSummary(sheet: FullWorkbookSheetData, rows: number[], max = 12): string {
  const parts = rows.slice(0, max).map((r) => {
    const label = referenceSummaryLabel(sheet, r) || '(blank label)'
    return `row ${r + 1}: "${label}"`
  })
  const extra = rows.length > max ? ` … +${rows.length - max} more` : ''
  return parts.join('; ') + extra
}

function emitFromDefinition(
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
  const definition = defs.get(metricKey)
  if (!definition) {
    throw new Error(`Missing reference metric definition for ${metricKey}`)
  }
  return createMetricValue(definition, args)
}

export function extractFullScorecardReference(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const metrics: CanonicalExtractionResult['metrics'] = []
  const issues: FullWorkbookValidationIssue[] = []
  const defs = defMap()
  const sheet = findWorkbookSheetByTitle(parsedWorkbook, 'Full Scorecard')

  if (!sheet) {
    for (const definition of FULL_SCORECARD_REFERENCE_METRIC_DEFINITIONS) {
      metrics.push(
        createMetricValue(definition, {
          value: null,
          sourceSheet: 'Full Scorecard',
          sourceCell: null,
          validationState: 'warning',
          validationMessage: 'Full Scorecard sheet not found; reference metrics skipped.',
        }),
      )
    }
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: 'Full Scorecard',
      message: 'Full Scorecard sheet not found; reference reconciliation metrics were not extracted.',
    })
    return { metrics, issues }
  }

  const sheetName = sheet.sheetName
  const summaryExtract = extractFromElementSummaryTable(sheet, defs, metrics)

  for (const rule of OVERALL_ROW_RULES) {
    const metricKey = `full_scorecard.reference.${rule.metricSuffix}`
    if (rule.metricSuffix === 'final_score' && summaryExtract.finalScoreCell) {
      metrics.push(
        emitFromDefinition(defs, metricKey, {
          value: summaryExtract.finalScoreValue,
          sourceSheet: sheetName,
          sourceCell: summaryExtract.finalScoreCell,
        }),
      )
      continue
    }
    const hits = collectMatchingRows(sheet, rule)
    const { chosen, ambiguous } = disambiguateRows(
      sheet,
      hits,
      rule.preferNumericCol ?? rule.valueCol,
    )

    if (ambiguous) {
      const detail = candidateRowLabelsSummary(sheet, hits)
      const metric = emitFromDefinition(defs, metricKey, {
        value: null,
        sourceSheet: sheetName,
        sourceCell: null,
        validationState: 'warning',
        validationMessage: `Ambiguous row match for "${rule.metricSuffix}" (${hits.length} candidates on "${sheetName}"). ${detail}. Reconciliation for this metric is skipped until the template has a single unambiguous row.`,
      })
      metrics.push(metric)
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName,
        metricKey,
        message: metric.validationMessage ?? 'Ambiguous reference row.',
        metadata: { candidate_rows: hits, candidate_labels: detail },
      })
      continue
    }

    if (chosen == null) {
      metrics.push(
        emitFromDefinition(defs, metricKey, {
          value: null,
          sourceSheet: sheetName,
          sourceCell: null,
          validationState: 'warning',
          validationMessage: `No matching row found for "${rule.metricSuffix}".`,
        }),
      )
      continue
    }

    const vCol = rule.valueCol ?? COL_AVAILABLE
    let raw = sheet.rows[chosen]?.[vCol]
    let outCol = vCol
    if (rule.metricSuffix === 'final_score' && !rowHasNumeric(sheet, chosen, outCol)) {
      const fallbacks = [COL_AVAILABLE, COL_ACHIEVED, COL_POSSIBLE_1, COL_POSSIBLE_2, 5, 6]
      for (const col of fallbacks) {
        if (rowHasNumeric(sheet, chosen, col)) {
          raw = sheet.rows[chosen]?.[col]
          outCol = col
          break
        }
      }
    }
    const addr = cellAddress(chosen, outCol)
    metrics.push(
      emitFromDefinition(defs, metricKey, {
        value: raw,
        sourceSheet: sheetName,
        sourceCell: addr,
      }),
    )
  }

  for (const cfg of ELEMENT_ROW_CONFIGS) {
    if (summaryExtract.mappedElements.has(cfg.element)) continue
    const base = `full_scorecard.reference.${cfg.element}`
    const hits = collectElementRows(sheet, cfg)
    const { chosen, ambiguous } = disambiguateElementRows(sheet, hits, cfg)

    const suffixes: Array<[string, number]> = [
      ['available_points', COL_AVAILABLE],
      ['points_achieved', COL_ACHIEVED],
      ['possible_points_1', COL_POSSIBLE_1],
      ['possible_points_2', COL_POSSIBLE_2],
    ]

    if (ambiguous) {
      const detail = candidateRowLabelsSummary(sheet, hits)
      const msg = `Ambiguous Full Scorecard reference rows for "${cfg.element}" (${hits.length} matches on "${sheetName}"). ${detail}. Engine scoring still uses source sheets; reconciliation for this element is unreliable until labels are unique.`
      for (const [suffix] of suffixes) {
        const metricKey = `${base}.${suffix}`
        const metric = emitFromDefinition(defs, metricKey, {
          value: null,
          sourceSheet: sheetName,
          sourceCell: null,
          validationState: 'warning',
          validationMessage: msg,
        })
        metrics.push(metric)
      }
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName,
        metricKey: base,
        message: msg,
        metadata: { candidate_rows: hits, candidate_labels: detail },
      })
      continue
    }

    if (chosen == null) {
      const missMsg = `No Full Scorecard summary row matched "${cfg.element}" on "${sheetName}" (expected label similar to "${cfg.exactLabels[0] ?? cfg.element}" in column A). Reconciliation only; engine uses source sheets.`
      for (const [suffix] of suffixes) {
        const metricKey = `${base}.${suffix}`
        metrics.push(
          emitFromDefinition(defs, metricKey, {
            value: null,
            sourceSheet: sheetName,
            sourceCell: null,
            validationState: 'warning',
            validationMessage: missMsg,
          }),
        )
      }
      issues.push({
        issueType: 'metric_value_warning',
        severity: 'warning',
        sheetName,
        metricKey: base,
        message: missMsg,
      })
      continue
    }

    for (const [suffix, col] of suffixes) {
      const metricKey = `${base}.${suffix}`
      const raw = sheet.rows[chosen]?.[col]
      const addr = cellAddress(chosen, col)
      metrics.push(
        emitFromDefinition(defs, metricKey, {
          value: raw,
          sourceSheet: sheetName,
          sourceCell: addr,
        }),
      )
    }
  }

  return { metrics, issues }
}
