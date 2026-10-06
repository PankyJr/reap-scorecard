/**
 * Deterministic extraction from the `Ownership` workbook tab.
 *
 * ## Canonical column layout
 *
 * Confirmed against both reference workbooks — `Generic-Scorecard Calculator.xlsx`
 * (headers at row 3: Indicator | Weighting points | Targets | Verified level |
 * Entity score) and `Generic-Scorecard-Test-Data.xlsx` (Indicator | Weighting
 * Points | Target | Verified Result | Entity Score):
 *
 *   col 0 = indicator label
 *   col 1 = weighting points   -> `.available_points`
 *   col 2 = target             -> `.target`
 *   col 3 = verified level     -> `.percentage`  (the achieved value)
 *   col 4 = entity score       -> audit only; the engine re-scores from inputs
 *
 * Column indices are resolved from the header row where one is recognisable and
 * only fall back to the canonical order above when it is not, because client
 * workbooks drift. Weighting and verified level must never be swapped: a
 * weighting of 4 read as an achieved percentage normalises to 4% — small enough
 * to look plausible and wrong enough to change the final B-BBEE level.
 *
 * ## Indicator identification
 *
 * Rows are identified by their labels and by the section headers above them,
 * never by ordinal position. Where a sheet uses bare duplicate labels ("Black
 * people" for both voting rights and economic interest, as the reference
 * workbook does), the "25% + 1 vote" target marker anchors the voting-rights
 * row and the remaining rows are paired structurally — and the sheet is
 * reported as ambiguous. Where even that fails, an error is raised rather than
 * a guess.
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

/** Canonical fallback, used only when no header row is recognisable. */
const CANONICAL_COLUMNS = {
  label: 0,
  available: 1,
  target: 2,
  percentage: 3,
  entityScore: 4,
} as const

type ColumnMap = {
  label: number
  available: number
  target: number
  percentage: number
  entityScore: number | null
  /** Row index of the recognised header, or -1 when the fallback was used. */
  headerRow: number
  source: 'header' | 'canonical_default'
}

/** Indicator prefixes that have metric definitions. */
const INDICATOR_KEYS = [
  'ownership.voting_rights.black_people',
  'ownership.voting_rights.black_women',
  'ownership.economic_interest.black_people',
  'ownership.economic_interest.black_women',
  'ownership.economic_interest.designated_groups',
  'ownership.economic_interest.new_entrants',
  'ownership.net_value',
] as const
type IndicatorKey = (typeof INDICATOR_KEYS)[number]

/** Missing any of these makes the ownership import unusable for scoring. */
const REQUIRED_INDICATORS: Record<IndicatorKey, string> = {
  'ownership.voting_rights.black_people': 'Voting rights — black people',
  'ownership.voting_rights.black_women': 'Voting rights — black women',
  'ownership.economic_interest.black_people': 'Economic interest — black people',
  'ownership.economic_interest.black_women': 'Economic interest — black women',
  'ownership.economic_interest.designated_groups': 'Economic interest — designated groups',
  'ownership.economic_interest.new_entrants': 'Economic interest — new entrants',
  'ownership.net_value': 'Net value',
}

/**
 * Indicators whose absence is a warning, not an error. Some templates omit the
 * new-entrants row entirely; the element simply does not score those 2 points.
 */
const OPTIONAL_INDICATORS: ReadonlySet<IndicatorKey> = new Set(['ownership.economic_interest.new_entrants'])

function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function cellAddress(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c })
}

/**
 * "25% + 1" expresses the 25%-plus-one-vote target. Normalise it to the 0.2501
 * convention the rest of the engine uses. Other spellings (e.g. the reference
 * workbook's "25+1%") are left alone and surface as a non-numeric target.
 */
function normalizeOwnershipTargetValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*%\s*\+\s*(\d+(?:\.\d+)?)$/)
  if (!match) return raw
  const basePct = Number(match[1])
  const bonusPoints = Number(match[2])
  if (!Number.isFinite(basePct) || !Number.isFinite(bonusPoints)) return raw
  return (basePct + bonusPoints / 100) / 100
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

// ---------------------------------------------------------------------------
// True worksheet rows
// ---------------------------------------------------------------------------

/**
 * `parseWorkbookFromBuffer` builds `rows` with `blankrows: false`, so a row's
 * index in `rows` is not its worksheet row. Recover the true row numbers from
 * the cell addresses so provenance points at the cell a reviewer can open.
 */
function trueRowIndex(sheet: FullWorkbookSheetData): (collapsed: number) => number {
  const addresses = Object.keys(sheet.cells ?? {})
  if (addresses.length === 0) return (collapsed) => collapsed
  const populated = new Set<number>()
  for (const address of addresses) {
    const decoded = XLSX.utils.decode_cell(address)
    if (Number.isFinite(decoded.r)) populated.add(decoded.r)
  }
  const ordered = [...populated].sort((a, b) => a - b)
  if (ordered.length !== sheet.rows.length) return (collapsed) => collapsed
  return (collapsed) => ordered[collapsed] ?? collapsed
}

// ---------------------------------------------------------------------------
// Column resolution
// ---------------------------------------------------------------------------

const HEADER_WEIGHTING = /weight/
const HEADER_TARGET = /target/
const HEADER_ACHIEVED = /verified|achieved|actual|result|level/
const HEADER_ENTITY = /entity|score/

function resolveColumns(sheet: FullWorkbookSheetData): ColumnMap {
  const limit = Math.min(sheet.rows.length, 20)
  for (let r = 0; r < limit; r += 1) {
    const row = sheet.rows[r] ?? []
    const labels = row.map((cell) => normalizeLabel(cell))

    let available = -1
    let target = -1
    let percentage = -1
    let entityScore = -1

    // Entity score first so "score"/"entity" cannot be claimed by the
    // achieved matcher (which accepts "result").
    labels.forEach((label, c) => {
      if (!label) return
      if (entityScore < 0 && HEADER_ENTITY.test(label)) entityScore = c
    })
    labels.forEach((label, c) => {
      if (!label || c === entityScore) return
      if (available < 0 && HEADER_WEIGHTING.test(label)) available = c
      else if (target < 0 && HEADER_TARGET.test(label)) target = c
      else if (percentage < 0 && HEADER_ACHIEVED.test(label)) percentage = c
    })

    if (available >= 0 && target >= 0 && percentage >= 0) {
      return {
        label: 0,
        available,
        target,
        percentage,
        entityScore: entityScore >= 0 ? entityScore : null,
        headerRow: r,
        source: 'header',
      }
    }
  }

  return { ...CANONICAL_COLUMNS, entityScore: CANONICAL_COLUMNS.entityScore, headerRow: -1, source: 'canonical_default' }
}

// ---------------------------------------------------------------------------
// Row classification
// ---------------------------------------------------------------------------

type Section = 'voting' | 'economic' | 'net_value' | null

const RE_VOTING = /voting|vote/
const RE_ECONOMIC = /economic|beneficial/
const RE_NET_VALUE = /net\s*value|net\s*worth/
const RE_NEW_ENTRANT = /new\s*entrant/
const RE_DESIGNATED = /designat|designed|esop|bbos|b-bee scheme|b-bbee scheme|scheme/
const RE_WOMEN = /women|woman/
const RE_BLACK = /black/
const RE_PLUS_ONE_VOTE = /\+\s*1|plus\s*one/

function sectionFromLabel(label: string): Section {
  if (RE_NET_VALUE.test(label)) return 'net_value'
  if (RE_VOTING.test(label)) return 'voting'
  if (RE_ECONOMIC.test(label)) return 'economic'
  return null
}

function rowHasData(row: unknown[], columns: ColumnMap): boolean {
  for (const c of [columns.available, columns.target, columns.percentage]) {
    const v = row[c]
    if (v == null || v === '') continue
    if (typeof v === 'number') return true
    if (Number.isFinite(Number(String(v).replace(/[,%\s]/g, '')))) return true
    if (detectExcelError(v)) return true
    // A non-numeric target such as "25+1%" still marks a data row.
    if (c === columns.target && String(v).trim() !== '') return true
  }
  return false
}

type ClassifiedRow = {
  row: number
  label: string
  key: IndicatorKey | null
  /** True when the label alone could not tell voting from economic interest. */
  ambiguous: boolean
  rawTarget: unknown
}

function classify(label: string, section: Section): { key: IndicatorKey | null; ambiguous: boolean } {
  if (RE_NET_VALUE.test(label)) return { key: 'ownership.net_value', ambiguous: false }
  // Checked before designated groups so a "new entrants" row is never
  // mis-filed under ESOP / BDG.
  if (RE_NEW_ENTRANT.test(label)) return { key: 'ownership.economic_interest.new_entrants', ambiguous: false }
  if (RE_DESIGNATED.test(label)) return { key: 'ownership.economic_interest.designated_groups', ambiguous: false }
  if (!RE_BLACK.test(label)) return { key: null, ambiguous: false }

  const gender = RE_WOMEN.test(label) ? 'black_women' : 'black_people'
  const inLabel = RE_VOTING.test(label) ? 'voting' : RE_ECONOMIC.test(label) ? 'economic' : null
  const scope = inLabel ?? (section === 'net_value' ? null : section)

  if (scope === 'voting') return { key: `ownership.voting_rights.${gender}` as IndicatorKey, ambiguous: false }
  if (scope === 'economic') return { key: `ownership.economic_interest.${gender}` as IndicatorKey, ambiguous: false }
  if (section === 'net_value') return { key: 'ownership.net_value', ambiguous: false }
  return { key: null, ambiguous: true }
}

/**
 * Resolve bare duplicate labels ("Black people" twice) without guessing by
 * ordinal position: the "25% + 1 vote" target marker pins the voting-rights
 * row, and the rows are then paired structurally around it.
 */
function resolveAmbiguousRows(
  ambiguous: ClassifiedRow[],
  issues: FullWorkbookValidationIssue[],
  sheetName: string,
): void {
  if (ambiguous.length === 0) return

  const people = ambiguous.filter((r) => !RE_WOMEN.test(r.label))
  const women = ambiguous.filter((r) => RE_WOMEN.test(r.label))

  const votingAnchor = people.find((r) => RE_PLUS_ONE_VOTE.test(String(r.rawTarget ?? '')))

  if (!votingAnchor || people.length !== 2 || women.length !== 2) {
    issues.push({
      issueType: 'metric_value_error',
      severity: 'error',
      sheetName,
      message:
        `Ownership sheet uses ambiguous labels (${ambiguous.map((r) => r.label).join(', ')}) with no ` +
        'section headers and no "25% + 1 vote" target marker, so voting rights could not be told apart ' +
        'from economic interest. Label the rows explicitly.',
    })
    return
  }

  const economicPerson = people.find((r) => r !== votingAnchor)!
  // The black-women row belonging to a block is the one that follows its
  // black-people row and precedes the next block.
  const votingWoman = women.find((r) => r.row > votingAnchor.row && r.row < economicPerson.row)
  const economicWoman = women.find((r) => r !== votingWoman)

  votingAnchor.key = 'ownership.voting_rights.black_people'
  economicPerson.key = 'ownership.economic_interest.black_people'
  if (votingWoman) votingWoman.key = 'ownership.voting_rights.black_women'
  if (economicWoman) economicWoman.key = 'ownership.economic_interest.black_women'

  issues.push({
    issueType: 'metric_value_warning',
    severity: 'warning',
    sheetName,
    message:
      'Ownership sheet repeats bare labels for voting rights and economic interest. Voting rights was ' +
      'identified from its "25% + 1 vote" target and the remaining rows paired structurally. Label the ' +
      'rows explicitly to remove the ambiguity.',
  })
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

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
  const columns = resolveColumns(sheet)
  const toTrueRow = trueRowIndex(sheet)

  if (columns.source === 'canonical_default') {
    issues.push({
      issueType: 'parse_warning',
      severity: 'warning',
      sheetName,
      message:
        'Ownership sheet has no recognisable column header row; the canonical layout was assumed ' +
        '(B = weighting points, C = target, D = verified level).',
    })
  }

  // --- walk data rows -------------------------------------------------------
  const classified: ClassifiedRow[] = []
  let section: Section = null

  for (let r = columns.headerRow + 1; r < sheet.rows.length; r += 1) {
    const row = sheet.rows[r] ?? []
    const label = normalizeLabel(row[columns.label]) || normalizeLabel(row[1])
    if (label.includes('shareholder')) break

    const hasData = rowHasData(row, columns)

    if (!hasData) {
      const asSection = label ? sectionFromLabel(label) : null
      if (asSection) section = asSection
      continue
    }
    if (!label) continue

    // A totals row: explicit "total", or an unlabelled row carrying only a
    // weighting figure after the indicator rows.
    if (label === 'total' || /^total\b/.test(label)) {
      classified.push({ row: r, label, key: null, ambiguous: false, rawTarget: row[columns.target] })
      continue
    }

    const { key, ambiguous } = classify(label, section)
    classified.push({ row: r, label, key, ambiguous, rawTarget: row[columns.target] })
  }

  resolveAmbiguousRows(
    classified.filter((c) => c.ambiguous),
    issues,
    sheetName,
  )

  // --- detect duplicates ----------------------------------------------------
  const byKey = new Map<IndicatorKey, ClassifiedRow[]>()
  for (const entry of classified) {
    if (!entry.key) continue
    const list = byKey.get(entry.key) ?? []
    list.push(entry)
    byKey.set(entry.key, list)
  }

  // --- emit -----------------------------------------------------------------
  const emitCell = (metricKey: string, r: number, c: number) => {
    const rawCell = sheet.rows[r]?.[c]
    const raw = c === columns.target ? normalizeOwnershipTargetValue(rawCell) : rawCell
    const trueRow = toTrueRow(r)
    if (detectExcelError(raw)) {
      metrics.push(
        emit(defs, metricKey, {
          value: null,
          sourceSheet: sheetName,
          sourceCell: cellAddress(trueRow, c),
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
        sourceCell: cellAddress(trueRow, c),
      }),
    )
  }

  for (const key of INDICATOR_KEYS) {
    const rows = byKey.get(key) ?? []

    if (rows.length > 1) {
      issues.push({
        issueType: 'metric_value_error',
        severity: 'error',
        sheetName,
        metricKey: key,
        message: `Ownership sheet has ${rows.length} rows matching ${REQUIRED_INDICATORS[key]}; it cannot be scored without a single unambiguous row.`,
      })
      for (const suffix of ['percentage', 'target', 'available_points']) {
        metrics.push(
          emit(defs, `${key}.${suffix}`, {
            value: null,
            sourceSheet: sheetName,
            sourceCell: null,
            validationState: 'error',
            validationMessage: `Multiple rows matched ${REQUIRED_INDICATORS[key]}.`,
          }),
        )
      }
      continue
    }

    if (rows.length === 0) {
      const optional = OPTIONAL_INDICATORS.has(key)
      issues.push({
        issueType: optional ? 'metric_value_warning' : 'required_metric_missing',
        severity: optional ? 'warning' : 'error',
        sheetName,
        metricKey: key,
        message: optional
          ? `Ownership sheet has no ${REQUIRED_INDICATORS[key]} row; those points cannot be scored.`
          : `Ownership sheet is missing the ${REQUIRED_INDICATORS[key]} row; ownership cannot be scored from this workbook.`,
      })
      for (const suffix of ['percentage', 'target', 'available_points']) {
        metrics.push(
          emit(defs, `${key}.${suffix}`, {
            value: null,
            sourceSheet: sheetName,
            sourceCell: null,
            validationState: optional ? 'warning' : 'error',
            validationMessage: `${REQUIRED_INDICATORS[key]} row was not found on the Ownership sheet.`,
          }),
        )
      }
      continue
    }

    const r = rows[0].row
    emitCell(`${key}.available_points`, r, columns.available)
    emitCell(`${key}.target`, r, columns.target)
    emitCell(`${key}.percentage`, r, columns.percentage)
  }

  // --- sheet total ----------------------------------------------------------
  const totalRows = classified.filter((c) => /^total\b/.test(c.label) || c.label === 'total')
  const unlabelledTotal =
    totalRows.length === 0
      ? classified.filter((c) => c.key === null && !c.ambiguous && c.label === '')
      : []
  const totalRow = totalRows[0] ?? unlabelledTotal[0] ?? null

  if (totalRow) {
    emitCell('ownership.total.available_points', totalRow.row, columns.available)
  } else {
    // Unlabelled totals row: the reference workbook leaves column A empty.
    const trailing = [...classified].reverse().find((c) => c.key === null && !c.ambiguous)
    if (trailing) emitCell('ownership.total.available_points', trailing.row, columns.available)
  }

  // Entity score is captured for audit only; the engine re-scores from inputs.
  if (columns.entityScore != null && byKey.size > 0) {
    issues.push({
      issueType: 'metric_value_warning',
      severity: 'warning',
      sheetName,
      message:
        'Ownership entity score column captured for audit only; the engine re-scores from the verified inputs.',
    })
  }

  return { metrics, issues }
}
