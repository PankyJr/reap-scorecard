import { ReportPdf, type TableColumn } from './document'
import {
  MISSING,
  formatDateLong,
  formatElementPoints,
  formatIndicatorPoints,
  formatIsoDate,
  formatPercent,
  formatPoints,
  formatRand,
  formatRecognitionPercent,
  parseCalendarDate,
  sastCalendarDay,
  trimNumber,
} from './format'

/**
 * Procurement scorecard PDF.
 *
 * A pure function of the data passed in: no database, no file system, no
 * browser. The route handler loads the stored assessment, maps it into
 * `ProcurementPdfInput` (targets and points straight from the engine's
 * stored results and config) and calls `buildProcurementPdf`.
 *
 * Nothing here invents a number. Missing values print as "—" or
 * "Not provided"; every recommendation is arithmetic on the input.
 */

export interface ProcurementPdfIndicator {
  key: string
  name: string
  /** Who to spend more with, e.g. "QSE suppliers". Used in recommendations. */
  supplierGroup?: string | null
  /** Ratios: 0.15 = 15%. */
  targetPercent: number | null
  achievedPercent: number | null
  availablePoints: number | null
  pointsAchieved: number | null
  /** Recognised spend counted towards this indicator, in rand. */
  recognisedSpend?: number | null
  isBonus: boolean
}

export interface ProcurementPdfSupplier {
  name: string | null
  /** As stored: "1"–"8", "Non-Compliant", or null when missing. */
  level: string | null
  /** EME / QSE / Generic as stored. */
  size: string | null
  spend: number | null
  recognisedSpend: number | null
  /** Stored yes/no flags — the database does not hold ownership percentages. */
  blackOwned51: boolean | null
  blackWomenOwned30: boolean | null
  certificateExpiry: string | null
  vatNumber?: string | null
  registrationNumber?: string | null
}

export interface ProcurementPdfAmountLine {
  label: string
  amount: number | null
}

export interface ProcurementPdfTmps {
  total: number | null
  inclusions: ProcurementPdfAmountLine[]
  exclusions: ProcurementPdfAmountLine[]
  inclusionsTotal?: number | null
  exclusionsTotal?: number | null
  /** Optional plain sentence on where the total came from. */
  basis?: string | null
}

export interface ProcurementPdfMethod {
  /** B-BBEE level → recognition ratio, exactly as the engine applies it. */
  recognitionLevels: Array<{ level: string; recognition: number }>
  /** Replaces the default method steps when the caller's engine differs. */
  steps?: string[]
  /** Extra notes, e.g. how flow-through suppliers are treated. */
  notes?: string[]
}

export interface ProcurementPdfInput {
  companyName: string
  assessmentName: string | null
  financialYear: string | null
  generatedAt: Date
  /** Certificates that expire before this day count as expired. Defaults to `generatedAt`. */
  certificateCheckDate?: Date | null
  indicators: ProcurementPdfIndicator[]
  tmps: ProcurementPdfTmps
  suppliers: ProcurementPdfSupplier[]
  method: ProcurementPdfMethod
}

export interface ProcurementPdfResult {
  bytes: Uint8Array
  pageCount: number
  /** Every string drawn, in order. For tests and diagnostics. */
  textLog: string[]
}

/* ------------------------------------------------------------------ */
/* Indicator analysis                                                  */
/* ------------------------------------------------------------------ */

const EPSILON = 0.005

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export type IndicatorStatus = 'Met' | 'Below target' | 'Not worked out'

export function indicatorStatus(ind: ProcurementPdfIndicator): IndicatorStatus {
  if (isNum(ind.achievedPercent) && isNum(ind.targetPercent)) {
    return ind.achievedPercent + 1e-9 >= ind.targetPercent ? 'Met' : 'Below target'
  }
  if (isNum(ind.pointsAchieved) && isNum(ind.availablePoints)) {
    return ind.pointsAchieved + EPSILON >= ind.availablePoints ? 'Met' : 'Below target'
  }
  return 'Not worked out'
}

/** Points still available on an indicator, or null when either side is missing. */
export function pointsGap(ind: ProcurementPdfIndicator): number | null {
  if (!isNum(ind.availablePoints) || !isNum(ind.pointsAchieved)) return null
  return Math.max(0, ind.availablePoints - ind.pointsAchieved)
}

function rankByGap(indicators: ReadonlyArray<ProcurementPdfIndicator>) {
  return indicators
    .map((ind) => ({ ind, gap: pointsGap(ind) }))
    .filter((r): r is { ind: ProcurementPdfIndicator; gap: number } => r.gap !== null && r.gap > EPSILON)
    .sort((a, b) => b.gap - a.gap || Number(a.ind.isBonus) - Number(b.ind.isBonus))
}

function indicatorDisplayName(ind: ProcurementPdfIndicator): string {
  return ind.isBonus ? `${ind.name} (bonus)` : ind.name
}

export interface PointsSummary {
  core: { achieved: number | null; available: number | null }
  bonus: { achieved: number | null; available: number | null; present: boolean }
}

function sumOrNull(values: Array<number | null>): number | null {
  if (values.length === 0) return 0
  return values.every(isNum) ? (values as number[]).reduce((a, b) => a + b, 0) : null
}

export function summarisePoints(indicators: ReadonlyArray<ProcurementPdfIndicator>): PointsSummary {
  const core = indicators.filter((i) => !i.isBonus)
  const bonus = indicators.filter((i) => i.isBonus)
  return {
    core: {
      achieved: sumOrNull(core.map((i) => i.pointsAchieved)),
      available: sumOrNull(core.map((i) => i.availablePoints)),
    },
    bonus: {
      achieved: sumOrNull(bonus.map((i) => i.pointsAchieved)),
      available: sumOrNull(bonus.map((i) => i.availablePoints)),
      present: bonus.length > 0,
    },
  }
}

/** The one-sentence answer to "where am I losing the most points?". */
export function biggestGapSentence(indicators: ReadonlyArray<ProcurementPdfIndicator>): string {
  const known = indicators.filter((i) => pointsGap(i) !== null)
  if (indicators.length === 0 || known.length === 0) {
    return 'The gaps cannot be worked out yet because the indicator results are missing.'
  }
  const [top] = rankByGap(known)
  if (!top) return 'Every indicator meets its target, so no points are being lost.'
  const { ind, gap } = top
  const name = indicatorDisplayName(ind)
  if (isNum(ind.achievedPercent) && isNum(ind.targetPercent)) {
    return `The biggest gap is ${name}: ${formatPercent(ind.achievedPercent)} of spend against a ${formatPercent(ind.targetPercent)} target, ${formatPoints(gap)} points short.`
  }
  return `The biggest gap is ${name}: ${formatPoints(gap)} points short of the ${trimNumber(ind.availablePoints as number)} available.`
}

/** Up to three recommendations, each pure arithmetic on the stored results. */
export function procurementRecommendations(
  indicators: ReadonlyArray<ProcurementPdfIndicator>,
  tmpsTotal: number | null,
  limit = 3,
): string[] {
  const known = indicators.filter((i) => pointsGap(i) !== null)
  if (known.length === 0) {
    return ['No recommendations can be made until the indicator results are calculated.']
  }
  const ranked = rankByGap(known).slice(0, limit)
  if (ranked.length === 0) {
    return ['No recommendations: every indicator already meets its target.']
  }
  return ranked.map(({ ind, gap }) => {
    const who = ind.supplierGroup?.trim() || `suppliers that count towards "${ind.name}"`
    const bonus = ind.isBonus ? ' bonus' : ''
    const where =
      isNum(ind.achievedPercent) && isNum(ind.targetPercent)
        ? `currently ${formatPercent(ind.achievedPercent)} against a ${formatPercent(ind.targetPercent)} target`
        : `currently ${formatPoints(ind.pointsAchieved)} of ${trimNumber(ind.availablePoints as number)} points`
    let sentence = `Raise spend with ${who}: ${where}, worth up to ${formatPoints(gap)} more${bonus} points.`
    if (isNum(tmpsTotal) && tmpsTotal > 0 && isNum(ind.targetPercent) && isNum(ind.recognisedSpend)) {
      const needed = ind.targetPercent * tmpsTotal - ind.recognisedSpend
      if (needed > 0) {
        sentence += ` Reaching the target needs about ${formatRand(needed)} more recognised spend.`
      }
    }
    return sentence
  })
}

/* ------------------------------------------------------------------ */
/* Supplier checks                                                     */
/* ------------------------------------------------------------------ */

export interface RankedSupplier extends ProcurementPdfSupplier {
  /** Position in the supplier list (1 = largest spend). */
  rank: number
}

/** Largest spend first; missing spend last; ties by name. Does not mutate the input. */
export function sortSuppliersBySpend(
  suppliers: ReadonlyArray<ProcurementPdfSupplier>,
): RankedSupplier[] {
  return suppliers
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const as = isNum(a.s.spend) ? a.s.spend : -Infinity
      const bs = isNum(b.s.spend) ? b.s.spend : -Infinity
      if (as !== bs) return bs - as
      const an = (a.s.name ?? '').toLowerCase()
      const bn = (b.s.name ?? '').toLowerCase()
      if (an !== bn) return an < bn ? -1 : 1
      return a.i - b.i
    })
    .map(({ s }, i) => ({ ...s, rank: i + 1 }))
}

export interface DuplicateGroup {
  suppliers: RankedSupplier[]
  reasons: Array<'Same name' | 'Same VAT number' | 'Same registration number'>
}

export interface SupplierProblems {
  missingName: RankedSupplier[]
  missingLevel: RankedSupplier[]
  expired: Array<RankedSupplier & { expiryDate: Date }>
  unreadableExpiry: RankedSupplier[]
  duplicates: DuplicateGroup[]
  badSpend: RankedSupplier[]
}

function normaliseName(name: string | null): string {
  return (name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const PLACEHOLDER_IDS = new Set(['NA', 'NONE', 'NIL', 'UNKNOWN', 'TBC', 'TBA', 'NOTAPPLICABLE'])

/** Registration and VAT numbers compared without spaces, dashes or slashes. Placeholders are ignored. */
function normaliseId(value: string | null | undefined): string {
  const id = (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!id || /^0+$/.test(id) || PLACEHOLDER_IDS.has(id)) return ''
  return id
}

function isMissingText(value: string | null | undefined): boolean {
  return typeof value !== 'string' || value.trim() === '' || value.trim() === '-'
}

/**
 * Finds data problems in the supplier list. Reports only what the data
 * shows: a missing expiry date is not a problem (EMEs often have none), but
 * a date that cannot be read is.
 */
export function findSupplierProblems(
  ranked: ReadonlyArray<RankedSupplier>,
  checkDate: Date,
): SupplierProblems {
  const checkDay = sastCalendarDay(checkDate).getTime()
  const problems: SupplierProblems = {
    missingName: [],
    missingLevel: [],
    expired: [],
    unreadableExpiry: [],
    duplicates: [],
    badSpend: [],
  }

  // Union-find over suppliers sharing a name, VAT number or registration number.
  const parent = ranked.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const linkReasons = new Map<number, Set<DuplicateGroup['reasons'][number]>>()
  const firstSeen = new Map<string, number>()
  const link = (key: string, i: number, reason: DuplicateGroup['reasons'][number]) => {
    const seen = firstSeen.get(key)
    if (seen === undefined) {
      firstSeen.set(key, i)
      return
    }
    const a = find(seen)
    const b = find(i)
    const reasons = new Set([...(linkReasons.get(a) ?? []), ...(linkReasons.get(b) ?? []), reason])
    parent[b] = a
    linkReasons.set(a, reasons)
  }

  ranked.forEach((s, i) => {
    if (isMissingText(s.name)) problems.missingName.push(s)
    if (isMissingText(s.level)) problems.missingLevel.push(s)
    if (!isNum(s.spend) || s.spend <= 0) problems.badSpend.push(s)

    if (!isMissingText(s.certificateExpiry)) {
      const expiryDate = parseCalendarDate(s.certificateExpiry)
      if (!expiryDate) problems.unreadableExpiry.push(s)
      else if (expiryDate.getTime() < checkDay) problems.expired.push({ ...s, expiryDate })
    }

    const name = normaliseName(s.name)
    if (name) link(`name:${name}`, i, 'Same name')
    const vat = normaliseId(s.vatNumber)
    if (vat) link(`vat:${vat}`, i, 'Same VAT number')
    const reg = normaliseId(s.registrationNumber)
    if (reg) link(`reg:${reg}`, i, 'Same registration number')
  })

  const groups = new Map<number, RankedSupplier[]>()
  ranked.forEach((s, i) => {
    const root = find(i)
    if (!linkReasons.has(root)) return
    const list = groups.get(root) ?? []
    list.push(s)
    groups.set(root, list)
  })
  const order: DuplicateGroup['reasons'] = ['Same name', 'Same VAT number', 'Same registration number']
  for (const [root, suppliers] of groups) {
    if (suppliers.length < 2) continue
    const reasons = linkReasons.get(root) as Set<DuplicateGroup['reasons'][number]>
    problems.duplicates.push({ suppliers, reasons: order.filter((r) => reasons.has(r)) })
  }
  problems.duplicates.sort((a, b) => a.suppliers[0].rank - b.suppliers[0].rank)
  return problems
}

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

function formatRandWhole(value: number | null): string {
  if (!isNum(value)) return MISSING
  const rounded = Math.round(value)
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${rounded < 0 ? '-' : ''}R ${digits}`
}

function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function displayLevel(level: string | null): string {
  if (isMissingText(level)) return MISSING
  const t = (level as string).trim()
  if (/^[1-8]$/.test(t)) return `Level ${t}`
  if (/^non[\s-]?compliant$/i.test(t)) return 'Non-compliant'
  return t
}

function yesNo(value: boolean | null): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return MISSING
}

function displayExpiry(value: string | null): string {
  if (isMissingText(value)) return MISSING
  const date = parseCalendarDate(value)
  return date ? formatIsoDate(date) : (value as string).trim()
}

function supplierName(s: ProcurementPdfSupplier): string {
  return isMissingText(s.name) ? 'Name not provided' : (s.name as string).trim()
}

/** Problem lists longer than this are cut short, with a note saying so. */
export const PROBLEM_LIST_LIMIT = 200

export const DEFAULT_PROCUREMENT_METHOD_STEPS = [
  "Each supplier's spend is multiplied by the recognition percentage for its B-BBEE level. The result is called recognised spend. The percentages used are in the table below.",
  'For each indicator, the recognised spend with the suppliers that qualify is added up and divided by total measured procurement spend. That gives your percentage.',
  'Points for an indicator are your percentage divided by the target, multiplied by the points available. An indicator never earns more than its points available.',
  'Bonus points are added on top and are shown separately from the main total.',
]

/* ------------------------------------------------------------------ */
/* The document                                                        */
/* ------------------------------------------------------------------ */

export async function buildProcurementPdf(
  input: ProcurementPdfInput,
): Promise<ProcurementPdfResult> {
  const pdf = await ReportPdf.create({
    title: `Procurement scorecard: ${input.companyName}`,
    headerLabel: `Procurement scorecard · ${input.companyName}`,
    createdAt: input.generatedAt,
  })
  const ranked = sortSuppliersBySpend(input.suppliers)
  const checkDate = input.certificateCheckDate ?? input.generatedAt

  drawCover(pdf, input)
  pdf.newPage()
  drawSummary(pdf, input)
  drawBreakdown(pdf, input)
  drawTmps(pdf, input)
  pdf.newPage()
  drawSupplierList(pdf, ranked)
  pdf.newPage()
  drawProblems(pdf, findSupplierProblems(ranked, checkDate), checkDate)
  drawRecommendations(pdf, input)
  drawMethod(pdf, input)

  const bytes = await pdf.save()
  return { bytes, pageCount: pdf.pageCount, textLog: pdf.textLog }
}

function drawCover(pdf: ReportPdf, input: ProcurementPdfInput): void {
  pdf.moveDown(120)
  pdf.paragraph('Procurement scorecard', { size: 14 })
  pdf.paragraph(input.companyName, { size: 26, bold: true, after: 10 })
  const details: string[] = []
  if (input.assessmentName?.trim()) details.push(input.assessmentName.trim())
  if (input.financialYear?.trim()) details.push(`Financial year ${input.financialYear.trim()}`)
  for (const line of details) pdf.paragraph(line, { size: 13, after: 2 })
  pdf.paragraph(`Generated ${formatDateLong(input.generatedAt)}`, { size: 11, after: 40 })
  pdf.box(
    'DRAFT — not a verified B-BBEE certificate',
    'This report is worked out from the information entered in REAP. It has not been checked by a B-BBEE verification agency, so it cannot be used as a B-BBEE certificate or as proof of your level.',
  )
}

/** A round chart scale at or above `max`: 20%, 50%, 100%, 150%… */
function niceScale(max: number): number {
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 1.5, 2]
  return steps.find((s) => s + 1e-9 >= max) ?? Math.ceil(max)
}

function pointsOutOf(achieved: number | null, available: number | null): string {
  if (!isNum(achieved) || !isNum(available)) return 'Not worked out'
  return `${formatPoints(achieved)} out of ${trimNumber(available)}`
}

function drawSummary(pdf: ReportPdf, input: ProcurementPdfInput): void {
  const points = summarisePoints(input.indicators)
  pdf.heading('Summary')
  const rows: Array<[string, string]> = [
    ['Points, not counting bonus', pointsOutOf(points.core.achieved, points.core.available)],
  ]
  if (points.bonus.present) {
    rows.push(['Bonus points', pointsOutOf(points.bonus.achieved, points.bonus.available)])
    if (isNum(points.core.achieved) && isNum(points.bonus.achieved)) {
      rows.push(['Total with bonus', formatPoints(points.core.achieved + points.bonus.achieved)])
    }
  }
  rows.push(['Total measured procurement spend', isNum(input.tmps.total) ? formatRand(input.tmps.total) : 'Not provided'])
  rows.push(['Suppliers', formatCount(input.suppliers.length)])
  pdf.keyValues(rows, { boldValues: true })
  pdf.paragraph(biggestGapSentence(input.indicators), { size: 11, bold: true, after: 14 })

  pdf.heading('Each indicator against its target', 2)
  if (input.indicators.length === 0) {
    pdf.paragraph('No indicator results are stored for this assessment yet.')
    return
  }
  const values = input.indicators.flatMap((i) => [i.achievedPercent, i.targetPercent]).filter(isNum)
  const scaleMax = niceScale(Math.max(0, ...values))
  pdf.barChart(
    input.indicators.map((ind) => {
      const status = indicatorStatus(ind)
      const valueLabel =
        status === 'Not worked out'
          ? 'Not worked out'
          : isNum(ind.achievedPercent) && isNum(ind.targetPercent)
            ? `${formatPercent(ind.achievedPercent)} vs ${formatPercent(ind.targetPercent)} target: ${status}`
            : `${formatIndicatorPoints(ind.pointsAchieved, ind.availablePoints)} points: ${status}`
      return {
        label: indicatorDisplayName(ind),
        value: ind.achievedPercent,
        marker: ind.targetPercent,
        valueLabel,
      }
    }),
    {
      scaleMax,
      ticks: [
        [0, '0%'],
        [scaleMax / 2, formatPercent(scaleMax / 2, 0)],
        [scaleMax, formatPercent(scaleMax, 0)],
      ],
    },
  )
  pdf.paragraph('How to read the chart: the solid bar is your percentage of total measured procurement spend; the vertical line is the target. The figures and the result are printed beside each bar.', { size: 8.5 })
}

function drawBreakdown(pdf: ReportPdf, input: ProcurementPdfInput): void {
  pdf.heading('Breakdown by indicator', 2)
  if (input.indicators.length === 0) {
    pdf.paragraph('No indicator results are stored for this assessment yet.')
    return
  }
  const w = pdf.contentWidth
  const columns: TableColumn[] = [
    { header: 'Indicator', width: w - 70 - 65 - 85 - 85, maxLines: 2 },
    { header: 'Your percentage', width: 70, align: 'right' },
    { header: 'Target', width: 65, align: 'right' },
    { header: 'Points', width: 85, align: 'right' },
    { header: 'Status', width: 85 },
  ]
  const rows = input.indicators.map((ind) => [
    indicatorDisplayName(ind),
    formatPercent(ind.achievedPercent),
    formatPercent(ind.targetPercent),
    formatIndicatorPoints(ind.pointsAchieved, ind.availablePoints),
    indicatorStatus(ind),
  ])
  const points = summarisePoints(input.indicators)
  const bold = new Set<number>()
  bold.add(rows.length)
  rows.push(['Total, not counting bonus', '', '', formatElementPoints(points.core.achieved, points.core.available), ''])
  if (points.bonus.present) {
    bold.add(rows.length)
    rows.push(['Bonus', '', '', formatElementPoints(points.bonus.achieved, points.bonus.available), ''])
  }
  pdf.table(columns, rows, { boldRows: bold, size: 9, continuedLabel: 'Breakdown by indicator (continued)' })
}

function drawTmps(pdf: ReportPdf, input: ProcurementPdfInput): void {
  const t = input.tmps
  pdf.heading('Total measured procurement spend', 2)
  pdf.paragraph('Total measured procurement spend is the amount every percentage in this report is divided by. It is the included costs less the excluded costs listed below.')
  const rows: Array<[string, string]> = [
    ['Total measured procurement spend', isNum(t.total) ? formatRand(t.total) : 'Not provided'],
  ]
  if (isNum(t.inclusionsTotal)) rows.push(['Included costs', formatRand(t.inclusionsTotal)])
  if (isNum(t.exclusionsTotal)) rows.push(['Excluded costs', formatRand(t.exclusionsTotal)])
  pdf.keyValues(rows, { boldValues: true })
  if (t.basis?.trim()) pdf.paragraph(t.basis.trim(), { size: 9 })

  if (t.inclusions.length === 0 && t.exclusions.length === 0) {
    pdf.paragraph('No breakdown is stored for this assessment, so only the total can be shown.')
    return
  }
  const columns: TableColumn[] = [
    { header: 'Item', width: pdf.contentWidth - 140, maxLines: 2 },
    { header: 'Amount', width: 140, align: 'right' },
  ]
  const amountRows = (lines: ProcurementPdfAmountLine[]) =>
    lines.map((l) => [l.label, isNum(l.amount) ? formatRand(l.amount) : 'Not provided'])
  pdf.heading('Excluded costs', 3)
  if (t.exclusions.length) pdf.table(columns, amountRows(t.exclusions), { size: 9 })
  else pdf.paragraph('No exclusions are stored.')
  pdf.heading('Included costs', 3)
  if (t.inclusions.length) pdf.table(columns, amountRows(t.inclusions), { size: 9 })
  else pdf.paragraph('No inclusions are stored.')
}

function drawSupplierList(pdf: ReportPdf, ranked: ReadonlyArray<RankedSupplier>): void {
  pdf.heading('Supplier list')
  if (ranked.length === 0) {
    pdf.paragraph('No suppliers are stored for this assessment.')
    return
  }
  pdf.paragraph(
    `${formatCount(ranked.length)} suppliers, largest spend first. Amounts are in rand, rounded to the nearest rand. Recognised spend is spend multiplied by the recognition percentage for the supplier's B-BBEE level. The two ownership columns show the yes/no answer stored for each supplier, not a percentage.`,
    { size: 9, after: 8 },
  )
  const fixed = 28 + 42 + 38 + 62 + 62 + 44 + 52 + 48
  const columns: TableColumn[] = [
    { header: '#', width: 28, align: 'right' },
    { header: 'Supplier', width: pdf.contentWidth - fixed, maxLines: 2 },
    { header: 'B-BBEE level', width: 42, maxLines: 2 },
    { header: 'Size', width: 38 },
    { header: 'Spend', width: 62, align: 'right' },
    { header: 'Recognised spend', width: 62, align: 'right' },
    { header: '51%+ black owned', width: 44 },
    { header: '30%+ black women owned', width: 52 },
    { header: 'Certificate expiry', width: 48 },
  ]
  const rows = ranked.map((s) => [
    String(s.rank),
    supplierName(s),
    displayLevel(s.level),
    isMissingText(s.size) ? MISSING : (s.size as string).trim(),
    formatRandWhole(s.spend),
    formatRandWhole(s.recognisedSpend),
    yesNo(s.blackOwned51),
    yesNo(s.blackWomenOwned30),
    displayExpiry(s.certificateExpiry),
  ])
  pdf.table(columns, rows, {
    size: 7.5,
    headerSize: 7.5,
    rowPadding: 2.5,
    continuedLabel: 'Supplier list (continued)',
  })
}

function drawProblemTable(
  pdf: ReportPdf,
  title: string,
  items: ReadonlyArray<RankedSupplier>,
  detail: (s: RankedSupplier) => string,
): void {
  pdf.heading(`${title} (${formatCount(items.length)})`, 3)
  if (items.length === 0) {
    pdf.paragraph('None found.', { size: 9 })
    return
  }
  const shown = items.slice(0, PROBLEM_LIST_LIMIT)
  pdf.table(
    [
      { header: '#', width: 30, align: 'right' },
      { header: 'Supplier', width: pdf.contentWidth - 30 - 170, maxLines: 2 },
      { header: 'What the data shows', width: 170, maxLines: 2 },
    ],
    shown.map((s) => [String(s.rank), supplierName(s), detail(s)]),
    { size: 8, continuedLabel: `${title} (continued)` },
  )
  if (items.length > shown.length) {
    pdf.paragraph(
      `Showing the first ${formatCount(shown.length)} of ${formatCount(items.length)}. The supplier list shows all of them; the # column matches.`,
      { size: 8.5 },
    )
  }
}

function drawProblems(pdf: ReportPdf, problems: SupplierProblems, checkDate: Date): void {
  pdf.heading('Problems found')
  pdf.paragraph(
    `These checks look only at the supplier data stored for this assessment. A certificate counts as expired if its expiry date is before ${formatDateLong(checkDate)}. The # column is the supplier's row in the supplier list.`,
    { size: 9, after: 4 },
  )
  drawProblemTable(pdf, 'Missing B-BBEE level', problems.missingLevel, () => 'No level recorded')
  drawProblemTable(pdf, 'Expired certificate', problems.expired, (s) => {
    const e = (s as RankedSupplier & { expiryDate: Date }).expiryDate
    return `Expired ${formatIsoDate(e)}`
  })
  drawProblemTable(pdf, 'Certificate expiry date could not be read', problems.unreadableExpiry, (s) => `Stored as "${(s.certificateExpiry ?? '').trim()}"`)
  drawProblemTable(pdf, 'Zero, negative or missing spend', problems.badSpend, (s) => (isNum(s.spend) ? formatRand(s.spend) : 'Spend not provided'))
  drawProblemTable(pdf, 'Missing supplier name', problems.missingName, () => 'No name recorded')

  const groups = problems.duplicates
  pdf.heading(
    `Possible duplicates (${formatCount(groups.length)} ${groups.length === 1 ? 'group' : 'groups'})`,
    3,
  )
  if (groups.length === 0) {
    pdf.paragraph('None found.', { size: 9 })
    return
  }
  const shown = groups.slice(0, PROBLEM_LIST_LIMIT)
  pdf.table(
    [
      { header: 'Suppliers (# and name)', width: pdf.contentWidth - 150, maxLines: 4 },
      { header: 'Why they look the same', width: 150, maxLines: 3 },
    ],
    shown.map((g) => [
      g.suppliers.map((s) => `#${s.rank} ${supplierName(s)}`).join('; '),
      g.reasons.join(', '),
    ]),
    { size: 8, continuedLabel: 'Possible duplicates (continued)' },
  )
  if (groups.length > shown.length) {
    pdf.paragraph(`Showing the first ${formatCount(shown.length)} of ${formatCount(groups.length)} groups.`, { size: 8.5 })
  }
}

function drawRecommendations(pdf: ReportPdf, input: ProcurementPdfInput): void {
  pdf.heading('Top 3 recommendations')
  pdf.paragraph('These come only from the figures in this report: the indicators losing the most points, largest first.', { size: 9 })
  procurementRecommendations(input.indicators, input.tmps.total).forEach((text, i) => {
    // Real recommendations are numbered; a "nothing to recommend" message is not.
    pdf.paragraph(text.startsWith('Raise') ? `${i + 1}. ${text}` : text, { after: 8 })
  })
}

function drawMethod(pdf: ReportPdf, input: ProcurementPdfInput): void {
  pdf.heading('How it was calculated')
  const steps = input.method.steps?.length ? input.method.steps : DEFAULT_PROCUREMENT_METHOD_STEPS
  steps.forEach((step, i) => pdf.paragraph(`${i + 1}. ${step}`))
  if (input.method.notes?.length) pdf.bullets(input.method.notes)

  if (input.indicators.length) {
    pdf.heading('Targets and points', 3)
    pdf.table(
      [
        { header: 'Indicator', width: pdf.contentWidth - 80 - 90 - 60, maxLines: 2 },
        { header: 'Target', width: 80, align: 'right' },
        { header: 'Points available', width: 90, align: 'right' },
        { header: 'Bonus', width: 60 },
      ],
      input.indicators.map((ind) => [
        ind.name,
        formatPercent(ind.targetPercent),
        isNum(ind.availablePoints) ? trimNumber(ind.availablePoints) : MISSING,
        ind.isBonus ? 'Yes' : 'No',
      ]),
      { size: 9 },
    )
  }

  if (input.method.recognitionLevels.length) {
    pdf.heading('Recognition percentage by B-BBEE level', 3)
    pdf.table(
      [
        { header: 'B-BBEE level', width: 160 },
        { header: 'Recognition percentage', width: 140, align: 'right' },
        { header: '', width: pdf.contentWidth - 300 },
      ],
      input.method.recognitionLevels.map((r) => [displayLevel(r.level), formatRecognitionPercent(r.recognition), '']),
      { size: 9 },
    )
  }
  pdf.paragraph('This report is a draft worked out from the information entered in REAP. Only an accredited B-BBEE verification agency can issue a B-BBEE certificate.', { size: 9 })
}
