import {
  PROCUREMENT_BASE_CAP,
  PROCUREMENT_BONUS_CAP,
  applyProcurementElementCaps,
} from '@/lib/scorecard/generic/elements/procurement'
import { PROCUREMENT_CATEGORY_ENGINE_KEYS, isProcurementBonusCategory, type ProcurementCategoryKey } from './config'
import type { ProcurementAssessmentResult, ProcurementCategoryResult } from './assessment'
import { formatPoints } from './format'

/**
 * How a procurement result is shown: base points out of 25 with the bonus
 * apart, one plain sentence on the biggest gap, and a colour per line.
 *
 * No scoring happens here. Line points come from calculateProcurementResults;
 * the 25 + 2 caps come from the full scorecard engine
 * (applyProcurementElementCaps), so the procurement page and the full
 * scorecard always show the same procurement points.
 */

/**
 * A line is "far off" (red) when it reaches less than half of its target.
 * At or above the target it is green; anywhere in between it is amber.
 */
export const FAR_OFF_SHARE_OF_TARGET = 0.5

export type ProcurementLineTone = 'ok' | 'warn' | 'bad'

/** Plain names for the six lines, for people who do not know the codes. */
export const PROCUREMENT_LINE_LABELS: Record<ProcurementCategoryKey, string> = {
  all_bbbee_suppliers: 'All B-BBEE suppliers',
  all_qses: 'Small suppliers (QSEs)',
  all_emes: 'Very small suppliers (EMEs)',
  black_owned_51: 'Suppliers at least 51% black-owned',
  black_women_30: 'Suppliers at least 30% black women-owned',
  bdgs_51: 'Bonus: black designated group suppliers',
}

/** Which recognised amount on a supplier row counts towards each line. */
export const PROCUREMENT_LINE_AMOUNT_FIELD = {
  all_bbbee_suppliers: 'bbbee_spend',
  all_qses: 'qse_amount',
  all_emes: 'eme_amount',
  black_owned_51: 'black_owned_amount',
  black_women_30: 'black_women_amount',
  bdgs_51: 'bdgs_amount',
} as const satisfies Record<ProcurementCategoryKey, string>

export type ProcurementLineAmountField = (typeof PROCUREMENT_LINE_AMOUNT_FIELD)[ProcurementCategoryKey]

export function procurementLineTone(achievedPercent: number, targetPercent: number): ProcurementLineTone {
  if (!(targetPercent > 0)) return 'ok'
  const achieved = Number.isFinite(achievedPercent) ? achievedPercent : 0
  if (achieved >= targetPercent) return 'ok'
  if (achieved >= targetPercent * FAR_OFF_SHARE_OF_TARGET) return 'warn'
  return 'bad'
}

/** How much of the target is reached, from 0 to 1 (the width of the thin bar). */
export function procurementLineProgress(achievedPercent: number, targetPercent: number): number {
  if (!(targetPercent > 0)) return 1
  const achieved = Number.isFinite(achievedPercent) ? Math.max(0, achievedPercent) : 0
  return Math.min(1, achieved / targetPercent)
}

export type ProcurementScoreLine = ProcurementCategoryResult & {
  label: string
  isBonus: boolean
  /** Points still available on this line (available minus achieved, never below zero). */
  shortfallPoints: number
  tone: ProcurementLineTone
  progress: number
}

/**
 * Procurement points as every screen shows them: base points capped by the
 * engine (PROCUREMENT_BASE_CAP), and the bonus apart (PROCUREMENT_BONUS_CAP).
 */
export type ProcurementPoints = {
  /** Base points counted, capped by the engine. */
  basePoints: number
  baseCap: number
  /** Bonus points counted, capped by the engine. Shown apart from the base. */
  bonusPoints: number
  bonusCap: number
  /** The base lines added up before the cap. */
  uncappedBasePoints: number
  uncappedBonusPoints: number
  baseWasCapped: boolean
}

/** One scored line: its key and the points it earned (as stored or as calculated). */
export type ProcurementLinePoints = {
  key: ProcurementCategoryKey | string
  pointsAchieved: number | string | null | undefined
  /** Set when the caller already knows (e.g. the PDF input); otherwise read from the rule set by key. */
  isBonus?: boolean
}

function linePoints(value: number | string | null | undefined): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/**
 * Turns per-line points into base and bonus points, capped exactly as the
 * full scorecard engine caps them (applyProcurementElementCaps). The bonus
 * line is whichever the engine's rule set marks as bonus-only.
 */
export function procurementPointsFromLines(lines: ReadonlyArray<ProcurementLinePoints>): ProcurementPoints {
  const isBonus = (line: ProcurementLinePoints) =>
    line.isBonus ?? isProcurementBonusCategory(line.key as ProcurementCategoryKey)
  const uncappedBasePoints = lines.filter((l) => !isBonus(l)).reduce((sum, l) => sum + linePoints(l.pointsAchieved), 0)
  const uncappedBonusPoints = lines.filter(isBonus).reduce((sum, l) => sum + linePoints(l.pointsAchieved), 0)
  const capped = applyProcurementElementCaps({
    basePointsAchieved: uncappedBasePoints,
    bonusPointsAchieved: uncappedBonusPoints,
  })
  return {
    basePoints: capped.basePointsAchieved,
    baseCap: PROCUREMENT_BASE_CAP,
    bonusPoints: capped.bonusPointsAchieved,
    bonusCap: PROCUREMENT_BONUS_CAP,
    uncappedBasePoints,
    uncappedBonusPoints,
    baseWasCapped: capped.baseWasCapped,
  }
}

/** A stored result row from procurement_results (only the two columns needed). */
export type StoredProcurementLinePoints = {
  category_key: string
  points_achieved: number | string | null
}

/** The same, from saved procurement_results rows; null when none are stored. */
export function procurementPointsFromStoredResults(
  rows: ReadonlyArray<StoredProcurementLinePoints> | null | undefined,
): ProcurementPoints | null {
  if (!rows || rows.length === 0) return null
  return procurementPointsFromLines(rows.map((row) => ({ key: row.category_key, pointsAchieved: row.points_achieved })))
}

/**
 * The one way a procurement score is written: "22.40 of 25 points, bonus
 * 1.00 of 2". Pass { bonus: false } where there is only room for the base.
 */
export function formatProcurementPoints(
  points: Pick<ProcurementPoints, 'basePoints' | 'baseCap' | 'bonusPoints' | 'bonusCap'>,
  options: { bonus?: boolean } = {},
): string {
  const base = `${formatPoints(points.basePoints)} of ${points.baseCap} points`
  if (options.bonus === false) return base
  return `${base}, bonus ${formatPoints(points.bonusPoints)} of ${points.bonusCap}`
}

/**
 * A procurement score for a list or a choice: from the stored line results
 * when there are any; otherwise the stored total, as plain "points" with no
 * maximum (no maximum is known to be right for it). A dash when neither is
 * known.
 */
export function procurementScoreText(
  args: { results?: ReadonlyArray<StoredProcurementLinePoints> | null; storedTotal?: number | string | null },
  options: { bonus?: boolean } = {},
): string {
  const points = procurementPointsFromStoredResults(args.results)
  if (points) return formatProcurementPoints(points, options)
  const total = args.storedTotal == null || args.storedTotal === '' ? NaN : Number(args.storedTotal)
  return Number.isFinite(total) ? `${formatPoints(total)} points` : '—'
}

export type ProcurementScoreSummary = ProcurementPoints & {
  /** The procurement-only module figure: all six lines added up. */
  moduleTotal: number
  lines: ProcurementScoreLine[]
}

const LINE_ORDER = Object.keys(PROCUREMENT_CATEGORY_ENGINE_KEYS) as ProcurementCategoryKey[]

export function summariseProcurementScore(result: ProcurementAssessmentResult): ProcurementScoreSummary {
  // Saved results can come back in any order (the page reads them by name); show them in scorecard order.
  const ordered = [...result.categories].sort((a, b) => LINE_ORDER.indexOf(a.key) - LINE_ORDER.indexOf(b.key))
  const lines: ProcurementScoreLine[] = ordered.map((category) => ({
    ...category,
    label: PROCUREMENT_LINE_LABELS[category.key] ?? category.name,
    isBonus: isProcurementBonusCategory(category.key),
    shortfallPoints: Math.max(0, category.availablePoints - category.pointsAchieved),
    tone: procurementLineTone(category.achievedPercent, category.targetPercent),
    progress: procurementLineProgress(category.achievedPercent, category.targetPercent),
  }))

  return {
    ...procurementPointsFromLines(lines),
    moduleTotal: result.totalScore,
    lines,
  }
}

const SHORTFALL_EPSILON = 0.005

function pct(ratio: number): string {
  const value = Number.isFinite(ratio) ? ratio * 100 : 0
  return `${value.toFixed(1).replace(/\.0$/, '')}%`
}

function pts(value: number): string {
  return value.toFixed(2)
}

/** The line with the largest points shortfall that still changes the score, or null. */
export function biggestProcurementGap(summary: ProcurementScoreSummary): ProcurementScoreLine | null {
  const pick = (candidates: ProcurementScoreLine[]) =>
    candidates.reduce<ProcurementScoreLine | null>(
      (best, line) =>
        line.shortfallPoints > SHORTFALL_EPSILON && (!best || line.shortfallPoints > best.shortfallPoints) ? line : best,
      null,
    )
  // Base shortfalls only matter while the base points are below the 25 cap.
  if (summary.basePoints < summary.baseCap - SHORTFALL_EPSILON) {
    const base = pick(summary.lines.filter((l) => !l.isBonus))
    if (base) return base
  }
  return pick(summary.lines.filter((l) => l.isBonus))
}

/** One plain sentence naming the biggest gap. */
export function biggestProcurementGapSentence(summary: ProcurementScoreSummary): string {
  const gap = biggestProcurementGap(summary)
  if (!gap) {
    // At the 25-point cap a base line can still be short of its target; say so rather than claim every target is met.
    const short = summary.lines.filter((l) => !l.isBonus && l.shortfallPoints > SHORTFALL_EPSILON)
    if (short.length === 0) return 'Every indicator has reached its target, so there is no gap to close.'
    const names = short.map((l) => `${l.label}, ${pct(l.achievedPercent)} against a ${pct(l.targetPercent)} target`)
    return `The base points are at the ${summary.baseCap} maximum, so no points are missing. Still below target: ${names.join('; ')}.`
  }
  const detail = `${pct(gap.achievedPercent)} of total spend against a ${pct(gap.targetPercent)} target, ${pts(gap.shortfallPoints)} points short`
  if (gap.isBonus) {
    const prefix =
      summary.basePoints >= summary.baseCap - SHORTFALL_EPSILON
        ? `The base points are at the ${summary.baseCap} maximum. `
        : ''
    return `${prefix}The only gap left is the bonus indicator for black designated group suppliers: ${detail}.`
  }
  return `The biggest gap is ${gap.label.toLowerCase()}: ${detail}.`
}

export type ProcurementLineSupplier = {
  id: string
  supplier_name: string
  level: string
  value_ex_vat: number
  /** The supplier's recognised amount that counts towards this line. */
  amount: number
}

type SupplierAmounts = {
  id?: string | null
  supplier_name: string
  level: string
  value_ex_vat: number | string | null
} & Partial<Record<ProcurementLineAmountField, number | string | null>>

/**
 * The suppliers that count towards one line, largest spend first (ties: the
 * larger recognised amount). Returns at most `limit` rows plus how many count
 * and the recognised total that counts towards the line.
 */
export function suppliersForProcurementLine(
  suppliers: SupplierAmounts[],
  key: ProcurementCategoryKey,
  limit = 50,
): { rows: ProcurementLineSupplier[]; count: number; total: number } {
  const field = PROCUREMENT_LINE_AMOUNT_FIELD[key]
  const counting: ProcurementLineSupplier[] = []
  let total = 0
  suppliers.forEach((supplier, index) => {
    const amount = Number(supplier[field] ?? 0)
    if (!(amount > 0)) return
    total += amount
    counting.push({
      id: supplier.id ? String(supplier.id) : `row-${index}`,
      supplier_name: supplier.supplier_name,
      level: supplier.level,
      value_ex_vat: Number(supplier.value_ex_vat ?? 0) || 0,
      amount,
    })
  })
  counting.sort((a, b) => b.value_ex_vat - a.value_ex_vat || b.amount - a.amount)
  return { rows: counting.slice(0, Math.max(0, limit)), count: counting.length, total }
}
