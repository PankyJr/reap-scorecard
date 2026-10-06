/**
 * The full-scorecard workspace in plain words: the checklist of areas, what
 * colour each one is, the live score, and where points are being lost.
 *
 * Everything here reads the engine's preview (calculateGenericScorecard on the
 * current inputs). Nothing is calculated again and no number is made up: the
 * points, levels and sub-minimum thresholds are the engine's own.
 *
 * "Area" is the plain word on screen for what the B-BBEE codes call an element.
 */
import type { GenericScorecardCalculation } from '../index'
import type { ElementResult, PrioritySubminimumOutcome } from '../types'
import type { NextActionItem } from './workflow'

export type AreaStatus = 'done' | 'progress' | 'todo' | 'problem'

export type AreaKey =
  | 'applicability'
  | 'financial'
  | 'ownership'
  | 'management_control'
  | 'skills_development'
  | 'preferential_procurement'
  | 'enterprise_development'
  | 'supplier_development'
  | 'socio_economic_development'

/**
 * Has someone started filling this scorecard in by hand? Company size is
 * filled in from the company's own details when a scorecard is created, so it
 * does not count: a brand-new scorecard still offers "Upload your workbook".
 */
export function startedByHand(rows: Pick<AreaRow, 'key' | 'status'>[]): boolean {
  return rows.some((row) => row.key !== 'applicability' && row.status !== 'todo')
}

export type AreaRow = {
  key: AreaKey
  label: string
  href: string
  status: AreaStatus
  /** Nothing more to enter: done, or complete but below its minimum. */
  finished: boolean
  /** Points for the seven areas; null for the two set-up steps. */
  achieved: number | null
  available: number | null
  bonusAchieved: number
  bonusAvailable: number
  /** One short line on what is blocking or wrong, when something is. */
  note: string | null
  /** True for the two set-up steps before the seven areas. */
  setup: boolean
}

export const AREA_COPY: Record<AreaKey, { label: string; measures: string; slug: string }> = {
  applicability: {
    label: 'Company size and sector',
    measures: 'Turnover, ownership and sector, which decide which rules apply.',
    slug: 'applicability',
  },
  financial: {
    label: 'Financial figures',
    measures: 'Revenue, profit and payroll, which several targets are worked out from.',
    slug: 'financial',
  },
  ownership: {
    label: 'Ownership',
    measures: 'How much of the company black people own, and how much say they have in it.',
    slug: 'ownership',
  },
  management_control: {
    label: 'Management control',
    measures: 'How many black people, and black women, sit on the board and in management.',
    slug: 'management-control',
  },
  skills_development: {
    label: 'Skills development',
    measures: 'What the company spends on training black people, compared with its payroll.',
    slug: 'skills-development',
  },
  preferential_procurement: {
    label: 'Procurement',
    measures: 'How much the company buys from B-BBEE suppliers, especially black-owned ones.',
    slug: 'procurement',
  },
  supplier_development: {
    label: 'Supplier development',
    measures: 'Money and help the company gives its own black-owned suppliers to grow.',
    slug: 'supplier-development',
  },
  enterprise_development: {
    label: 'Enterprise development',
    measures: 'Money and help the company gives other black-owned businesses to grow.',
    slug: 'enterprise-development',
  },
  socio_economic_development: {
    label: 'Socio-economic development',
    measures: 'Money the company gives to community projects that help black people.',
    slug: 'socio-economic-development',
  },
}

/** The area a workspace page belongs to, from its URL step ("management-control"). */
export function areaKeyForSlug(slug: string): AreaKey | null {
  const hit = (Object.keys(AREA_COPY) as AreaKey[]).find((key) => AREA_COPY[key].slug === slug)
  return hit ?? null
}

/** Scorecard order: the two set-up steps, then the seven areas as the codes list them. */
export const AREA_ORDER: AreaKey[] = [
  'applicability',
  'financial',
  'ownership',
  'management_control',
  'skills_development',
  'preferential_procurement',
  'supplier_development',
  'enterprise_development',
  'socio_economic_development',
]

const two = (n: number) => n.toFixed(2)

/** The failed priority sub-minimum for one area, if any. */
export function failedMinimum(preview: GenericScorecardCalculation, key: string): PrioritySubminimumOutcome | null {
  return preview.prioritySubminimums.find((s) => s.elementKey === key && s.evaluated && s.passed === false) ?? null
}

/** The priority sub-minimum that applies to one area, whether or not it is met. */
export function minimumFor(preview: GenericScorecardCalculation, key: string): PrioritySubminimumOutcome | null {
  return preview.prioritySubminimums.find((s) => s.elementKey === key) ?? null
}

function areaFromElement(args: {
  key: AreaKey
  element: ElementResult | undefined
  preview: GenericScorecardCalculation
  href: string
  procurementAttached: boolean
}): AreaRow {
  const { key, element, preview, href } = args
  const base = {
    key,
    label: AREA_COPY[key].label,
    href,
    achieved: element?.basePointsAchieved ?? 0,
    available: element?.basePointsAvailable ?? null,
    bonusAchieved: element?.bonusPointsAchieved ?? 0,
    bonusAvailable: element?.bonusPointsAvailable ?? 0,
    setup: false,
  }
  if (key === 'preferential_procurement' && !args.procurementAttached) {
    return { ...base, status: 'todo', finished: false, note: 'Attach a procurement scorecard' }
  }
  if (!element) return { ...base, status: 'todo', finished: false, note: null }

  const failed = failedMinimum(preview, key)
  if (failed) {
    return {
      ...base,
      status: 'problem',
      finished: element.status === 'scored',
      note: `Below its minimum: ${two(failed.achievedPoints ?? 0)} of the ${two(failed.thresholdPoints)} points needed`,
    }
  }
  if (element.status === 'pending_confirmation') {
    return { ...base, status: 'problem', finished: false, note: 'Waiting for you to confirm the evidence' }
  }
  if (element.status === 'scored') return { ...base, status: 'done', finished: true, note: null }
  if (element.status === 'not_started') return { ...base, status: 'todo', finished: false, note: null }
  return { ...base, status: 'progress', finished: false, note: 'Some figures are still missing' }
}

/** The checklist: two set-up steps, then the seven areas, each with its colour and points. */
export function buildAreaRows(args: {
  assessmentId: string
  preview: GenericScorecardCalculation
  workflowItems: NextActionItem[]
  procurementAttached: boolean
}): AreaRow[] {
  const base = `/scorecards/calculator/${args.assessmentId}/generic`
  return AREA_ORDER.map((key) => {
    const href = `${base}/${AREA_COPY[key].slug}`
    if (key === 'applicability' || key === 'financial') {
      const done = args.workflowItems.find((item) => item.id === key)?.complete ?? false
      return {
        key,
        label: AREA_COPY[key].label,
        href,
        status: done ? 'done' : 'todo',
        finished: done,
        achieved: null,
        available: null,
        bonusAchieved: 0,
        bonusAvailable: 0,
        note: null,
        setup: true,
      } satisfies AreaRow
    }
    return areaFromElement({
      key,
      element: args.preview.elements.find((e) => e.elementKey === key),
      preview: args.preview,
      href,
      procurementAttached: args.procurementAttached,
    })
  })
}

/**
 * The next area that still needs something, after the current one and then
 * from the top. Null when there is nothing left to enter: time to review.
 */
export function nextUnfinished(rows: AreaRow[], currentKey: AreaKey | null): AreaRow | null {
  const start = currentKey ? rows.findIndex((row) => row.key === currentKey) + 1 : 0
  const ordered = [...rows.slice(start), ...rows.slice(0, start)]
  return ordered.find((row) => !row.finished && row.key !== currentKey) ?? null
}

export type LiveScore = {
  totalPoints: number
  level: string
  /** True when the engine says a final level may be shown. */
  isFinal: boolean
  recognitionPercentage: number
  /** Areas below their priority minimum, which dropped the level by one. */
  droppedBy: Array<{ label: string; achieved: number; threshold: number }>
}

/** The live score bar: the engine's total and level on the figures entered so far. */
export function liveScore(preview: GenericScorecardCalculation): LiveScore {
  const droppedBy = preview.discountApplied
    ? preview.prioritySubminimums
        .filter((s) => s.evaluated && s.passed === false)
        .map((s) => ({
          label: AREA_COPY[s.elementKey as AreaKey]?.label ?? s.label,
          achieved: s.achievedPoints ?? 0,
          threshold: s.thresholdPoints,
        }))
    : []
  return {
    totalPoints: preview.rawTotalPoints,
    level: preview.finalLevel.level,
    isFinal: preview.readiness.complete,
    recognitionPercentage: preview.finalLevel.recognitionPercentage,
    droppedBy,
  }
}

/** The plain warning under the live score when a priority area dropped the level. */
export function droppedLevelSentence(score: LiveScore): string | null {
  if (score.droppedBy.length === 0) return null
  const names = score.droppedBy.map((d) => `${d.label} (${two(d.achieved)} of the ${two(d.threshold)} points needed)`)
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `Dropped one level: ${list} ${names.length === 1 ? 'is' : 'are'} below the minimum.`
}

export type LostPoints = { name: string; achieved: number; available: number; why: string }

/** "Where you're losing points": the indicators with the biggest gap, largest first. */
export function losingPoints(element: ElementResult | undefined, limit = 3): LostPoints[] {
  if (!element) return []
  return element.indicators
    .map((indicator) => ({
      name: indicator.displayName,
      achieved: indicator.basePointsAchieved ?? 0,
      available: indicator.basePointsAvailable,
      why: indicator.explanation,
    }))
    .filter((row) => row.available - row.achieved > 0.004)
    .sort((a, b) => b.available - b.achieved - (a.available - a.achieved))
    .slice(0, limit)
}

/** The six areas a scorecard workbook can fill in. Procurement always comes from a procurement scorecard. */
export const WORKBOOK_AREAS: AreaKey[] = [
  'ownership',
  'management_control',
  'skills_development',
  'supplier_development',
  'enterprise_development',
  'socio_economic_development',
]

/**
 * After a workbook import: "We filled in 5 of the 6 areas a workbook covers.
 * Management control is missing." Counts an area only when the import applied
 * it and the engine has figures for it.
 */
export function importSummary(applied: readonly string[], preview: GenericScorecardCalculation): {
  filled: AreaKey[]
  missing: AreaKey[]
  sentence: string
} {
  const filled = WORKBOOK_AREAS.filter(
    (key) => applied.includes(key) && preview.elements.find((e) => e.elementKey === key)?.status !== 'not_started',
  )
  const missing = WORKBOOK_AREAS.filter((key) => !filled.includes(key))
  const names = missing.map((key) => AREA_COPY[key].label)
  const list = names.length <= 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  const missingSentence =
    missing.length === 0 ? '' : ` ${list.charAt(0).toUpperCase()}${list.slice(1)} ${missing.length === 1 ? 'is' : 'are'} missing.`
  return {
    filled,
    missing,
    sentence: `We filled in ${filled.length} of the ${WORKBOOK_AREAS.length} areas a workbook covers.${missingSentence}`,
  }
}

// ---------------------------------------------------------------------------
// The final result page
// ---------------------------------------------------------------------------

/**
 * "Your company is a Level 6 contributor. Clients can claim 60% of what they
 * spend with you." Only for a final level; the numbers are the engine's.
 */
export function plainLevelSentence(level: string, recognitionPercentage: number): string {
  if (/non-compliant/i.test(level)) {
    return 'Your company is a non-compliant contributor. Clients cannot claim any of what they spend with you.'
  }
  return `Your company is a ${level} contributor. Clients can claim ${recognitionPercentage}% of what they spend with you.`
}

export type ResultBarTone = 'healthy' | 'weak' | 'dragging'

/**
 * One bar per area on the result page. Red ("dragging") when the area is below
 * its priority minimum and so dropped the level; amber ("weak") below half of
 * its points; green otherwise. The half-way line is a display choice, not a
 * B-BBEE rule.
 */
export function resultBars(result: GenericScorecardCalculation): Array<{
  key: AreaKey
  label: string
  achieved: number
  available: number
  bonusAchieved: number
  bonusAvailable: number
  tone: ResultBarTone
}> {
  return result.elements.map((element) => {
    const key = element.elementKey as AreaKey
    const dragging = Boolean(failedMinimum(result, key))
    const share = element.basePointsAvailable > 0 ? element.basePointsAchieved / element.basePointsAvailable : 0
    return {
      key,
      label: AREA_COPY[key]?.label ?? element.displayName,
      achieved: element.basePointsAchieved,
      available: element.basePointsAvailable,
      bonusAchieved: element.bonusPointsAchieved,
      bonusAvailable: element.bonusPointsAvailable,
      tone: dragging ? 'dragging' : share < 0.5 ? 'weak' : 'healthy',
    }
  })
}

/** "Where to gain points": the scored lines with the most points still to win, across all areas. */
export function whereToGainPoints(result: GenericScorecardCalculation, limit = 3): Array<LostPoints & { area: string; href: string }> {
  return result.elements
    .flatMap((element) =>
      losingPoints(element, 99).map((row) => ({
        ...row,
        area: AREA_COPY[element.elementKey as AreaKey]?.label ?? element.displayName,
        href: AREA_COPY[element.elementKey as AreaKey]?.slug ?? '',
      })),
    )
    .sort((a, b) => b.available - b.achieved - (a.available - a.achieved))
    .slice(0, limit)
}
