/**
 * Deterministic extraction from the `Ownership` workbook tab.
 *
 * Layout assumption (verify against live templates — see TODOs):
 * - Column A: row label
 * - Column B: actual / compliance percentage
 * - Column C: target percentage
 * - Column D: available points for that row
 *
 * Sections are detected by header rows in column A ("Voting rights", "Economic interest", "Net value", …).
 * If headers are missing or ambiguous, we emit warnings and skip unreliable values rather than guessing.
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
import { OWNERSHIP_SHEET_METRIC_DEFINITIONS } from '../metric-definitions'
import { createMetricValue, detectExcelError, findWorkbookSheetByTitle } from './helpers'

const OWNERSHIP_SHEET = 'Ownership'

const COL_LABEL = 0
const COL_PERCENTAGE = 1
const COL_TARGET = 2
const COL_AVAILABLE = 3
const COL_ACHIEVED_POINTS = 4

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
  return new Map(OWNERSHIP_SHEET_METRIC_DEFINITIONS.map((d) => [d.metricKey, d]))
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
  if (!def) throw new Error(`Missing ownership metric definition: ${metricKey}`)
  return createMetricValue(def, args)
}

/** Section titles are often merged into column B/C; scan A–C for header text. */
function rowHeaderScanLabel(sheet: FullWorkbookSheetData, r: number): string {
  const parts: string[] = []
  for (let c = 0; c <= 2; c += 1) {
    const p = normalizeLabel(sheet.rows[r]?.[c])
    if (p) parts.push(p)
  }
  return parts.join(' ')
}

/** Data row labels usually stay in column A; fall back to B when A is blank (merged layouts). */
function dataRowLabel(sheet: FullWorkbookSheetData, r: number): string {
  const a = normalizeLabel(sheet.rows[r]?.[COL_LABEL])
  if (a) return a
  return normalizeLabel(sheet.rows[r]?.[1])
}

function findHeaderIndex(sheet: FullWorkbookSheetData, fromRow: number, test: (label: string) => boolean): number {
  for (let r = fromRow; r < sheet.rows.length; r += 1) {
    const label = rowHeaderScanLabel(sheet, r)
    if (!label) continue
    if (test(label)) return r
  }
  return -1
}

function isVotingRightsHeader(label: string): boolean {
  return (
    (label.includes('voting') && label.includes('right')) ||
    label.includes('exercisable voting') ||
    (label.includes('exercisable') && label.includes('voting')) ||
    (label.includes('voting') && label.includes('rights')) ||
    (label.includes('voting') && label.includes('power')) ||
    (label.includes('shareholding') && label.includes('voting'))
  )
}

function isEconomicInterestHeader(label: string): boolean {
  return (
    (label.includes('economic') && label.includes('interest')) ||
    (label.includes('beneficial') && label.includes('interest'))
  )
}

function isNetValueHeader(label: string): boolean {
  return (
    (label.includes('net') && label.includes('value')) ||
    (label.includes('net') && label.includes('worth'))
  )
}

function classifyVotingRow(label: string): 'black_people' | 'black_women' | null {
  if (!label.includes('black')) return null
  if (label.includes('woman') || label.includes('women')) return 'black_women'
  if (
    label.includes('people') ||
    label.includes('person') ||
    label.includes('south african') ||
    label.includes('africans') ||
    label.includes('citizens')
  ) {
    return 'black_people'
  }
  return null
}

function classifyEconomicRow(label: string): 'black_people' | 'black_women' | 'designated_groups' | null {
  if (
    label.includes('designated') ||
    label.includes('designed') ||
    /\bdg\b/.test(label) ||
    label.includes('new entrant') ||
    label.includes('esop') ||
    label.includes('bbos') ||
    label.includes('scheme')
  ) {
    return 'designated_groups'
  }
  if (!label.includes('black')) return null
  if (label.includes('woman') || label.includes('women')) return 'black_women'
  if (
    label.includes('people') ||
    label.includes('person') ||
    label.includes('south african') ||
    label.includes('africans') ||
    label.includes('citizens')
  ) {
    return 'black_people'
  }
  return null
}

function classifyNetValueRow(label: string): boolean {
  if (label.includes('net') && label.includes('value')) return true
  if (label.includes('new entrant')) return true
  return false
}

function isTotalAvailableRow(label: string): boolean {
  return (
    label.includes('total') &&
    label.includes('available') &&
    (label.includes('ownership') || label.includes('point') || label.includes('maximum'))
  )
}

interface RowExtractPlan {
  metricPrefix: string
  row: number
}

function pushAmbiguous(
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

function extractRowMetrics(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  plan: RowExtractPlan,
  metrics: ExtractedMetricValue[],
): void {
  const { metricPrefix, row } = plan
  const sheetName = sheet.sheetName
  const rawPct = sheet.rows[row]?.[COL_PERCENTAGE]
  const rawTgt = sheet.rows[row]?.[COL_TARGET]
  const rawAvail = sheet.rows[row]?.[COL_AVAILABLE]

  const emitCell = (suffix: string, col: number, raw: unknown) => {
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

  emitCell('percentage', COL_PERCENTAGE, rawPct)
  emitCell('target', COL_TARGET, rawTgt)
  emitCell('available_points', COL_AVAILABLE, rawAvail)
}

function isOwnershipAtoEHeader(label: string): boolean {
  return (
    label.includes('indicator') &&
    label.includes('target') &&
    (label.includes('weighting point') || label.includes('weighting')) &&
    (label.includes('verified') || label.includes('level')) &&
    label.includes('entity score')
  )
}

function normalizeOwnershipTargetValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const t = raw.trim()
  const plusPct = t.match(/^(\d+(?:\.\d+)?)\s*%\s*\+\s*(\d+(?:\.\d+)?)$/)
  if (plusPct) {
    const basePct = Number(plusPct[1])
    const bonusPoints = Number(plusPct[2])
    if (Number.isFinite(basePct) && Number.isFinite(bonusPoints)) {
      return (basePct + bonusPoints / 100) / 100
    }
  }
  return raw
}

function extractOwnershipByKnownRowOrder(
  sheet: FullWorkbookSheetData,
  defs: Map<string, MetricDefinition>,
  metrics: ExtractedMetricValue[],
  issues: FullWorkbookValidationIssue[],
): boolean {
  let headerRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const headerLabel = [0, 1, 2, 3, 4]
      .map((c) => normalizeLabel(sheet.rows[r]?.[c]))
      .filter(Boolean)
      .join(' ')
    if (isOwnershipAtoEHeader(headerLabel)) {
      headerRow = r
      break
    }
  }
  if (headerRow < 0) return false

  const rows = []
  for (let r = headerRow + 1; r < sheet.rows.length; r += 1) {
    const label = dataRowLabel(sheet, r)
    if (!label) continue
    if (label.includes('shareholder')) break
    rows.push({ r, label })
  }

  const blackPeopleRows = rows.filter((x) => classifyVotingRow(x.label) === 'black_people')
  const blackWomenRows = rows.filter((x) => classifyVotingRow(x.label) === 'black_women')
  const designatedRows = rows.filter((x) => classifyEconomicRow(x.label) === 'designated_groups')
  const netValueRow =
    rows.find((x) => x.label.includes('net') && x.label.includes('value')) ??
    rows.find((x) => classifyNetValueRow(x.label))
  const totalRow =
    rows.find((x) => x.label === 'total') ??
    (() => {
      for (let r = headerRow + 1; r < sheet.rows.length; r += 1) {
        const b = sheet.rows[r]?.[1]
        const e = sheet.rows[r]?.[COL_ACHIEVED_POINTS]
        if (b == null || b === '') continue
        const bn = Number(String(b).replace(/[,%\s]/g, ''))
        const en = Number(String(e ?? '').replace(/[,%\s]/g, ''))
        if (Number.isFinite(bn) && bn >= 20 && Number.isFinite(en)) {
          return { r, label: 'total' }
        }
      }
      return undefined
    })()

  if (blackPeopleRows.length < 2 || blackWomenRows.length < 2 || !netValueRow) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: sheet.sheetName,
      message: 'Ownership A-E fallback detected but required ordered rows were missing.',
    })
    return true
  }

  const plans: RowExtractPlan[] = [
    { metricPrefix: 'ownership.voting_rights.black_people', row: blackPeopleRows[0].r },
    { metricPrefix: 'ownership.voting_rights.black_women', row: blackWomenRows[0].r },
    { metricPrefix: 'ownership.economic_interest.black_people', row: blackPeopleRows[1].r },
    { metricPrefix: 'ownership.economic_interest.black_women', row: blackWomenRows[1].r },
    // Prefer the first designated/new entrant row as the designated_groups source.
    ...(designatedRows[0]
      ? [{ metricPrefix: 'ownership.economic_interest.designated_groups', row: designatedRows[0].r }]
      : []),
    { metricPrefix: 'ownership.net_value', row: netValueRow.r },
  ]

  const emitAtoE = (metricPrefix: string, row: number) => {
    const entries: Array<[string, number, unknown]> = [
      ['percentage', 3, sheet.rows[row]?.[3]],
      [
        'target',
        2,
        normalizeOwnershipTargetValue(sheet.rows[row]?.[2]),
      ],
      ['available_points', 1, sheet.rows[row]?.[1]],
    ]
    for (const [suffix, col, raw] of entries) {
      const metricKey = `${metricPrefix}.${suffix}`
      metrics.push(
        emit(defs, metricKey, {
          value: raw,
          sourceSheet: sheet.sheetName,
          sourceCell: cellAddress(row, col),
        }),
      )
    }
  }

  for (const p of plans) {
    emitAtoE(p.metricPrefix, p.row)
  }

  if (totalRow) {
    metrics.push(
      emit(defs, 'ownership.total.available_points', {
        value: sheet.rows[totalRow.r]?.[1],
        sourceSheet: sheet.sheetName,
        sourceCell: cellAddress(totalRow.r, 1),
      }),
    )
  }

  // Keep entity score (column E) as audit trace in warnings when present.
  const auditRows = plans
    .map((p) => ({ p, entityScore: sheet.rows[p.row]?.[COL_ACHIEVED_POINTS] }))
    .filter((x) => x.entityScore != null && x.entityScore !== '')
  if (auditRows.length > 0) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName: sheet.sheetName,
      message:
        'Ownership A-E layout detected: entity score column (E) captured for audit only; engine uses proportional inputs.',
    })
  }

  return true
}

function collectVotingPlans(
  sheet: FullWorkbookSheetData,
  startExclusive: number,
  endExclusive: number,
): { plans: RowExtractPlan[]; ambiguousKinds: Set<string> } {
  const plans: RowExtractPlan[] = []
  const seen = new Map<string, number>()
  const ambiguousKinds = new Set<string>()

  for (let r = startExclusive; r < endExclusive; r += 1) {
    const label = dataRowLabel(sheet, r)
    if (!label) continue
    const kind = classifyVotingRow(label)
    if (!kind) continue
    if (seen.has(kind)) {
      ambiguousKinds.add(kind)
      continue
    }
    seen.set(kind, r)
    plans.push({ metricPrefix: `ownership.voting_rights.${kind}`, row: r })
  }
  return { plans, ambiguousKinds }
}

function collectEconomicPlans(
  sheet: FullWorkbookSheetData,
  startExclusive: number,
  endExclusive: number,
): { plans: RowExtractPlan[]; ambiguousKinds: Set<string> } {
  const plans: RowExtractPlan[] = []
  const seen = new Map<string, number>()
  const ambiguousKinds = new Set<string>()

  for (let r = startExclusive; r < endExclusive; r += 1) {
    const label = dataRowLabel(sheet, r)
    if (!label) continue
    const kind = classifyEconomicRow(label)
    if (!kind) continue
    if (seen.has(kind)) {
      ambiguousKinds.add(kind)
      continue
    }
    seen.set(kind, r)
    plans.push({ metricPrefix: `ownership.economic_interest.${kind}`, row: r })
  }
  return { plans, ambiguousKinds }
}

function collectNetValuePlans(
  sheet: FullWorkbookSheetData,
  startExclusive: number,
  endExclusive: number,
): { plans: RowExtractPlan[]; ambiguous: boolean } {
  const candidates: number[] = []
  for (let r = startExclusive; r < endExclusive; r += 1) {
    const label = dataRowLabel(sheet, r)
    if (!label) continue
    if (classifyNetValueRow(label)) candidates.push(r)
  }
  if (candidates.length === 0) return { plans: [], ambiguous: false }
  if (candidates.length > 1) return { plans: [], ambiguous: true }
  return {
    plans: [{ metricPrefix: 'ownership.net_value', row: candidates[0] }],
    ambiguous: false,
  }
}

export function extractOwnershipSheetMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const metrics: ExtractedMetricValue[] = []
  const issues: FullWorkbookValidationIssue[] = []
  const defs = defByKey()
  const sheet = findWorkbookSheetByTitle(parsedWorkbook, OWNERSHIP_SHEET)

  if (!sheet) {
    issues.push({
      issueType: 'required_metric_missing',
      severity: 'warning',
      sheetName: OWNERSHIP_SHEET,
      message: 'Ownership sheet not found; ownership engine metrics were not extracted.',
    })
    return { metrics, issues }
  }

  const sheetName = sheet.sheetName

  const usedFallback = extractOwnershipByKnownRowOrder(sheet, defs, metrics, issues)
  if (usedFallback) {
    return { metrics, issues }
  }

  const vrHeader = findHeaderIndex(sheet, 0, isVotingRightsHeader)
  const eiHeader = findHeaderIndex(sheet, vrHeader >= 0 ? vrHeader + 1 : 0, isEconomicInterestHeader)
  const nvHeader = findHeaderIndex(sheet, eiHeader >= 0 ? eiHeader + 1 : 0, isNetValueHeader)

  if (vrHeader < 0) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName,
      message:
        'Could not locate a Voting Rights section header on the Ownership sheet; voting rights metrics were skipped. TODO: extend header matching if your template uses different wording.',
    })
  }
  if (eiHeader < 0) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName,
      message:
        'Could not locate an Economic Interest section header on the Ownership sheet; economic interest metrics were skipped.',
    })
  }
  if (nvHeader < 0) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName,
      message:
        'Could not locate a Net Value section header on the Ownership sheet; net value metrics were skipped.',
    })
  }

  const vrEnd = eiHeader >= 0 ? eiHeader : sheet.rows.length
  const eiEnd = nvHeader >= 0 ? nvHeader : sheet.rows.length
  const nvEnd = sheet.rows.length

  if (vrHeader >= 0 && eiHeader >= 0 && eiHeader <= vrHeader) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName,
      message: 'Ownership sheet: Economic Interest header appears before/at Voting Rights; section order unclear.',
    })
  }

  if (vrHeader >= 0) {
    const { plans, ambiguousKinds } = collectVotingPlans(sheet, vrHeader + 1, vrEnd)
    for (const k of ambiguousKinds) {
      pushAmbiguous(
        metrics,
        issues,
        defs,
        sheetName,
        `ownership.voting_rights.${k}`,
        `Ambiguous Ownership sheet: multiple rows matched voting rights / ${k.replace('_', ' ')}.`,
      )
    }
    for (const p of plans) {
      const rowKind = p.metricPrefix.replace(/^ownership\.voting_rights\./, '')
      if (ambiguousKinds.has(rowKind)) continue
      extractRowMetrics(sheet, defs, p, metrics)
    }
  }

  if (eiHeader >= 0) {
    const { plans, ambiguousKinds } = collectEconomicPlans(sheet, eiHeader + 1, eiEnd)
    for (const k of ambiguousKinds) {
      pushAmbiguous(
        metrics,
        issues,
        defs,
        sheetName,
        `ownership.economic_interest.${k}`,
        `Ambiguous Ownership sheet: multiple rows matched economic interest / ${k.replace('_', ' ')}.`,
      )
    }
    for (const p of plans) {
      const rowKind = p.metricPrefix.replace(/^ownership\.economic_interest\./, '')
      if (ambiguousKinds.has(rowKind)) continue
      extractRowMetrics(sheet, defs, p, metrics)
    }
  }

  if (nvHeader >= 0) {
    const { plans, ambiguous } = collectNetValuePlans(sheet, nvHeader + 1, nvEnd)
    if (ambiguous) {
      pushAmbiguous(
        metrics,
        issues,
        defs,
        sheetName,
        'ownership.net_value',
        'Ambiguous Ownership sheet: multiple Net Value data rows matched.',
      )
    } else {
      for (const p of plans) {
        extractRowMetrics(sheet, defs, p, metrics)
      }
    }
  }

  let totalRow = -1
  for (let r = 0; r < sheet.rows.length; r += 1) {
    const label = dataRowLabel(sheet, r)
    if (isTotalAvailableRow(label)) {
      if (totalRow >= 0) {
        issues.push({
          issueType: 'metric_value_warning',
          severity: 'warning',
          sheetName,
          metricKey: 'ownership.total.available_points',
          message: 'Multiple total-available rows on Ownership sheet; ownership.total.available_points skipped.',
        })
        totalRow = -2
        break
      }
      totalRow = r
    }
  }
  if (totalRow >= 0) {
    const raw = sheet.rows[totalRow]?.[COL_AVAILABLE]
    metrics.push(
      emit(defs, 'ownership.total.available_points', {
        value: raw,
        sourceSheet: sheetName,
        sourceCell: cellAddress(totalRow, COL_AVAILABLE),
      }),
    )
  }

  return { metrics, issues }
}
