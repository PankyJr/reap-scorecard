import { ReportPdf, type TableColumn } from './document'
import {
  MISSING,
  formatDateLong,
  formatElementPoints,
  formatIndicatorPoints,
  formatPoints,
  formatRecognitionPercent,
  trimNumber,
} from './format'

/**
 * Full B-BBEE scorecard PDF (all seven elements).
 *
 * A pure function of the data passed in. The route handler reads the
 * stored calculation (the assessment's result snapshot) and maps it into
 * `ScorecardPdfInput`; nothing here recalculates or invents a figure.
 * Indicator achieved/target values arrive already formatted because their
 * units differ (percentages, rand, headcounts).
 *
 * "Not yet calculated" is a first-class state: the PDF is short and says
 * so, with the next step, instead of failing.
 */

export interface ScorecardPdfIndicator {
  name: string
  /** Formatted by the caller, e.g. "32.5%" or "R 120,000.00". Null = not provided. */
  achieved: string | null
  target: string | null
  points: number | null
  availablePoints: number | null
  isBonus?: boolean
}

export type ScorecardPdfElementStatus = 'calculated' | 'not_calculated' | 'not_applicable'

export interface ScorecardPdfElement {
  key: string
  name: string
  status: ScorecardPdfElementStatus
  points: number | null
  availablePoints: number | null
  bonusPoints?: number | null
  /** A plain sentence shown under the element, e.g. why it is not calculated. */
  note?: string | null
  indicators: ScorecardPdfIndicator[]
}

export interface ScorecardPdfPriorityResult {
  /** e.g. "Ownership: net value". */
  name: string
  /** What has to be reached, as stored, e.g. "40% of points". */
  requirement: string | null
  achieved: string | null
  met: boolean | null
}

export interface ScorecardPdfLevel {
  /** "Level 6", "Non-compliant"; null when no level was worked out. */
  label: string | null
  isFinal: boolean
  /** Why the level is not final, in plain words. */
  notFinalReasons: string[]
  /** Ratio: 0.6 = 60%. */
  recognitionPercent: number | null
  /** Set only when the stored result says a priority sub-minimum lowered the level. */
  levelBeforeDiscount?: string | null
}

export interface ScorecardPdfInput {
  companyName: string
  assessmentName: string | null
  financialYear: string | null
  generatedAt: Date
  calculated: boolean
  /** When not calculated: why, in plain words, if known. */
  notCalculatedReason?: string | null
  calculatedAt?: Date | null
  ruleSet: { name: string | null; version: string | null }
  level: ScorecardPdfLevel
  /** Points not counting bonus points. */
  totalPoints: number | null
  bonusPoints: number | null
  availablePoints?: number | null
  elements: ScorecardPdfElement[]
  priorityResults: ScorecardPdfPriorityResult[]
  /** The rule set's level table, if the caller has it. */
  levelTable?: Array<{ level: string; minPoints: number; recognitionPercent: number }>
  /** Replaces the default method steps when the caller's rule set differs. */
  methodSteps?: string[]
  methodNotes?: string[]
}

export interface ScorecardPdfResult {
  bytes: Uint8Array
  pageCount: number
  textLog: string[]
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

const EPSILON = 0.005

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

/** The plain-English answer to "what is my level and what does it mean?". */
export function levelSentences(input: ScorecardPdfInput): string[] {
  if (!input.calculated) {
    return ['This assessment has not been calculated yet, so there is no B-BBEE level to show.']
  }
  const { level } = input
  if (!level.isFinal || !level.label) {
    const out = [
      level.label
        ? `Your B-BBEE level is not final. ${level.label} is a working result only.`
        : 'Your B-BBEE level is not final, and no working level could be shown.',
    ]
    if (level.notFinalReasons.length === 0) out.push('The stored result does not say why.')
    return out
  }
  const out: string[] = []
  if (isNum(level.recognitionPercent) && level.recognitionPercent <= 0) {
    out.push(
      `Your company is a ${level.label.toLowerCase().startsWith('non') ? 'non-compliant' : level.label} contributor. Clients cannot claim any of what they spend with you.`,
    )
  } else if (isNum(level.recognitionPercent)) {
    out.push(
      `Your company is a ${level.label} contributor. Clients can claim ${formatRecognitionPercent(level.recognitionPercent)} of what they spend with you.`,
    )
  } else {
    out.push(`Your company is a ${level.label} contributor.`)
  }
  if (level.levelBeforeDiscount) {
    out.push(
      `A priority sub-minimum was not met, so the level was lowered from ${level.levelBeforeDiscount} to ${level.label}.`,
    )
  }
  return out
}

export interface PointsGapItem {
  element: string
  indicator: string | null
  points: number
  availablePoints: number
  gap: number
  achieved: string | null
  target: string | null
  isBonus: boolean
}

/** Indicators (or whole elements without indicator detail) losing the most points. */
export function pointsToGain(elements: ReadonlyArray<ScorecardPdfElement>, limit = 3): PointsGapItem[] {
  const items: PointsGapItem[] = []
  for (const el of elements) {
    if (el.status !== 'calculated') continue
    const scored = el.indicators.filter((i) => isNum(i.points) && isNum(i.availablePoints))
    if (scored.length > 0) {
      for (const ind of scored) {
        const gap = (ind.availablePoints as number) - (ind.points as number)
        if (gap > EPSILON) {
          items.push({
            element: el.name,
            indicator: ind.name,
            points: ind.points as number,
            availablePoints: ind.availablePoints as number,
            gap,
            achieved: ind.achieved,
            target: ind.target,
            isBonus: ind.isBonus === true,
          })
        }
      }
    } else if (isNum(el.points) && isNum(el.availablePoints) && el.availablePoints - el.points > EPSILON) {
      items.push({
        element: el.name,
        indicator: null,
        points: el.points,
        availablePoints: el.availablePoints,
        gap: el.availablePoints - el.points,
        achieved: null,
        target: null,
        isBonus: false,
      })
    }
  }
  return items
    .sort((a, b) => b.gap - a.gap || Number(a.isBonus) - Number(b.isBonus))
    .slice(0, limit)
}

export function pointsToGainSentences(input: ScorecardPdfInput): string[] {
  if (!input.calculated) {
    return ['Points to gain cannot be worked out until the assessment is calculated.']
  }
  const items = pointsToGain(input.elements)
  if (items.length === 0) {
    const anyScored = input.elements.some((e) => e.status === 'calculated')
    return [
      anyScored
        ? 'No gaps found: every calculated indicator already has its full points.'
        : 'Points to gain cannot be worked out because no element has been calculated.',
    ]
  }
  return items.map((it) => {
    const where = it.indicator ? `${it.element}, ${it.indicator}` : it.element
    const bonus = it.isBonus ? ' bonus' : ''
    let sentence = `${where}: ${formatPoints(it.points)} of ${trimNumber(it.availablePoints)}${bonus} points, so up to ${formatPoints(it.gap)} more points are available.`
    if (it.achieved && it.target) {
      sentence += ` Currently ${it.achieved} against a target of ${it.target}.`
    }
    return sentence
  })
}

export const DEFAULT_SCORECARD_METHOD_STEPS = [
  'Each indicator earns points by comparing what you achieved with its target, under the rule set named above. An indicator never earns more than its points available.',
  "Indicator points add up to each element's points, and the element points add up to the total.",
  'The total sets the B-BBEE level.',
  'A priority element that misses its sub-minimum can lower the level. The priority sub-minimum results above show each one as stored.',
  'The recognition percentage is how much of their spend with you your clients can count on their own scorecards.',
]

/* ------------------------------------------------------------------ */
/* The document                                                        */
/* ------------------------------------------------------------------ */

export async function buildFullScorecardPdf(input: ScorecardPdfInput): Promise<ScorecardPdfResult> {
  const pdf = await ReportPdf.create({
    title: `B-BBEE scorecard: ${input.companyName}`,
    headerLabel: `B-BBEE scorecard · ${input.companyName}`,
    createdAt: input.generatedAt,
  })
  drawCover(pdf, input)
  pdf.newPage()
  if (!input.calculated) {
    drawNotCalculated(pdf, input)
  } else {
    drawSummary(pdf, input)
    pdf.newPage()
    drawElements(pdf, input)
    drawPriority(pdf, input)
    drawPointsToGain(pdf, input)
    drawMethod(pdf, input)
  }
  const bytes = await pdf.save()
  return { bytes, pageCount: pdf.pageCount, textLog: pdf.textLog }
}

function drawCover(pdf: ReportPdf, input: ScorecardPdfInput): void {
  pdf.moveDown(120)
  pdf.paragraph('B-BBEE scorecard', { size: 14 })
  pdf.paragraph(input.companyName, { size: 26, bold: true, after: 10 })
  if (input.assessmentName?.trim()) pdf.paragraph(input.assessmentName.trim(), { size: 13, after: 2 })
  if (input.financialYear?.trim()) pdf.paragraph(`Financial year ${input.financialYear.trim()}`, { size: 13, after: 2 })
  pdf.paragraph(`Generated ${formatDateLong(input.generatedAt)}`, { size: 11, after: 40 })
  pdf.box(
    'DRAFT — not a verified B-BBEE certificate',
    'This report is worked out from the information entered in REAP. It has not been checked by a B-BBEE verification agency, so it cannot be used as a B-BBEE certificate or as proof of your level.',
  )
}

function ruleSetText(input: ScorecardPdfInput): string {
  const { name, version } = input.ruleSet
  if (!name && !version) return 'Not recorded in the stored result'
  if (name && version) return `${name} (version ${version})`
  return (name ?? `Version ${version}`) as string
}

function drawNotCalculated(pdf: ReportPdf, input: ScorecardPdfInput): void {
  pdf.heading('Not calculated yet')
  pdf.paragraph(
    'This assessment has not been calculated, so there are no points, level or recommendations to show yet.',
    { size: 11 },
  )
  if (input.notCalculatedReason?.trim()) pdf.paragraph(input.notCalculatedReason.trim())
  pdf.paragraph(
    'What to do next: open the assessment in REAP, complete each element, and press Calculate. Then download this PDF again.',
    { bold: true },
  )
}

function levelValue(input: ScorecardPdfInput): string {
  const { level } = input
  if (!level.label) return 'Not worked out'
  return level.isFinal ? level.label : `${level.label} (not final)`
}

function drawSummary(pdf: ReportPdf, input: ScorecardPdfInput): void {
  pdf.heading('Summary')
  const rows: Array<[string, string]> = [['B-BBEE level', levelValue(input)]]
  const total = isNum(input.totalPoints) ? formatPoints(input.totalPoints) : 'Not worked out'
  rows.push([
    'Total points, not counting bonus',
    isNum(input.totalPoints) && isNum(input.availablePoints)
      ? `${total} out of ${trimNumber(input.availablePoints)}`
      : total,
  ])
  rows.push(['Bonus points', isNum(input.bonusPoints) ? formatPoints(input.bonusPoints) : MISSING])
  if (isNum(input.totalPoints) && isNum(input.bonusPoints)) {
    rows.push(['Total with bonus', formatPoints(input.totalPoints + input.bonusPoints)])
  }
  rows.push([
    'Recognition percentage',
    input.level.isFinal && isNum(input.level.recognitionPercent)
      ? formatRecognitionPercent(input.level.recognitionPercent)
      : MISSING,
  ])
  rows.push(['Rule set', ruleSetText(input)])
  pdf.keyValues(rows, { boldValues: true })

  for (const sentence of levelSentences(input)) pdf.paragraph(sentence, { size: 11, bold: true })
  if (!input.level.isFinal && input.level.notFinalReasons.length) {
    pdf.paragraph('Why it is not final:', { after: 2 })
    pdf.bullets(input.level.notFinalReasons)
  }

  pdf.heading('Points by element', 2)
  if (input.elements.length === 0) {
    pdf.paragraph('No element results are stored for this assessment.')
    return
  }
  const scaleMax = Math.max(1, ...input.elements.map((e) => e.availablePoints).filter(isNum))
  pdf.barChart(
    input.elements.map((el) => ({
      label: el.name,
      value: el.status === 'calculated' ? el.points : null,
      trackMax: el.availablePoints,
      valueLabel:
        el.status === 'not_applicable'
          ? 'Does not apply'
          : el.status === 'not_calculated'
            ? 'Not calculated yet'
            : `${formatElementPoints(el.points, el.availablePoints)} points`,
    })),
    { scaleMax, ticks: [[0, '0'], [scaleMax, `${trimNumber(scaleMax)} points`]] },
  )
  pdf.paragraph(
    "How to read the chart: the outline is the element's points available and the solid bar is the points achieved. The figures are printed beside each bar.",
    { size: 8.5 },
  )
}

function drawElements(pdf: ReportPdf, input: ScorecardPdfInput): void {
  pdf.heading('Element by element')
  const w = pdf.contentWidth
  const columns: TableColumn[] = [
    { header: 'Indicator', width: w - 95 - 95 - 85, maxLines: 3 },
    { header: 'Achieved', width: 95, align: 'right', maxLines: 2 },
    { header: 'Target', width: 95, align: 'right', maxLines: 2 },
    { header: 'Points', width: 85, align: 'right' },
  ]
  for (const el of input.elements) {
    const heading =
      el.status === 'calculated'
        ? `${el.name}: ${formatElementPoints(el.points, el.availablePoints)}`
        : el.name
    pdf.heading(heading, 2)
    if (el.status === 'not_applicable') {
      pdf.paragraph(el.note?.trim() || 'This element does not apply to this assessment.')
      continue
    }
    if (el.status === 'not_calculated') {
      pdf.paragraph(el.note?.trim() || 'Not calculated yet.')
      continue
    }
    if (el.note?.trim()) pdf.paragraph(el.note.trim(), { size: 9 })
    if (isNum(el.bonusPoints) && el.bonusPoints > 0) {
      pdf.paragraph(`Includes bonus points: ${formatPoints(el.bonusPoints)}.`, { size: 9 })
    }
    if (el.indicators.length === 0) {
      pdf.paragraph('No indicator detail is stored for this element.', { size: 9 })
      continue
    }
    pdf.table(
      columns,
      el.indicators.map((ind) => [
        ind.isBonus ? `${ind.name} (bonus)` : ind.name,
        ind.achieved ?? MISSING,
        ind.target ?? MISSING,
        formatIndicatorPoints(ind.points, ind.availablePoints),
      ]),
      { size: 8.5, continuedLabel: `${el.name} (continued)` },
    )
  }
}

function drawPriority(pdf: ReportPdf, input: ScorecardPdfInput): void {
  pdf.heading('Priority sub-minimum results')
  if (input.priorityResults.length === 0) {
    pdf.paragraph('No priority sub-minimum results are stored for this assessment.')
    return
  }
  const w = pdf.contentWidth
  pdf.table(
    [
      { header: 'Priority element', width: w - 110 - 110 - 80, maxLines: 2 },
      { header: 'Sub-minimum', width: 110, maxLines: 2 },
      { header: 'Achieved', width: 110, maxLines: 2 },
      { header: 'Result', width: 80 },
    ],
    input.priorityResults.map((p) => [
      p.name,
      p.requirement ?? MISSING,
      p.achieved ?? MISSING,
      p.met === true ? 'Met' : p.met === false ? 'Not met' : 'Not worked out',
    ]),
    { size: 9, continuedLabel: 'Priority sub-minimum results (continued)' },
  )
  const missed = input.priorityResults.filter((p) => p.met === false).length
  if (missed > 0) {
    pdf.paragraph(
      `${missed} priority sub-minimum${missed === 1 ? ' was' : 's were'} not met. ${input.level.levelBeforeDiscount ? `The level was lowered from ${input.level.levelBeforeDiscount} to ${input.level.label}.` : 'See the summary for the effect on the level.'}`,
      { size: 9.5 },
    )
  }
}

function drawPointsToGain(pdf: ReportPdf, input: ScorecardPdfInput): void {
  pdf.heading('Where to gain points')
  pdf.paragraph(
    'These come only from the figures in this report: the indicators with the most points still available, largest first. Where no indicator detail is stored, the whole element is listed.',
    { size: 9 },
  )
  const items = pointsToGain(input.elements)
  pointsToGainSentences(input).forEach((text, i) => {
    pdf.paragraph(items.length ? `${i + 1}. ${text}` : text, { after: 8 })
  })
}

function drawMethod(pdf: ReportPdf, input: ScorecardPdfInput): void {
  pdf.heading('How it was calculated')
  const rows: Array<[string, string]> = [['Rule set', ruleSetText(input)]]
  if (input.calculatedAt) rows.push(['Calculated on', formatDateLong(input.calculatedAt)])
  pdf.keyValues(rows)
  const steps = input.methodSteps?.length ? input.methodSteps : DEFAULT_SCORECARD_METHOD_STEPS
  steps.forEach((step, i) => pdf.paragraph(`${i + 1}. ${step}`))
  if (input.methodNotes?.length) pdf.bullets(input.methodNotes)
  if (input.levelTable?.length) {
    pdf.heading('Level table', 3)
    pdf.table(
      [
        { header: 'B-BBEE level', width: 140 },
        { header: 'Points needed (at least)', width: 140, align: 'right' },
        { header: 'Recognition percentage', width: 140, align: 'right' },
        { header: '', width: pdf.contentWidth - 420 },
      ],
      input.levelTable.map((row) => [
        row.level,
        trimNumber(row.minPoints),
        formatRecognitionPercent(row.recognitionPercent),
        '',
      ]),
      { size: 9 },
    )
  }
  pdf.paragraph(
    'This report is a draft worked out from the information entered in REAP. Only an accredited B-BBEE verification agency can issue a B-BBEE certificate.',
    { size: 9 },
  )
}
