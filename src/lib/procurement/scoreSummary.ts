import {
  PROCUREMENT_BASE_CAP,
  PROCUREMENT_BONUS_CAP,
  applyProcurementElementCaps,
} from '@/lib/scorecard/generic/elements/procurement'
import { PROCUREMENT_CATEGORY_ENGINE_KEYS, isProcurementBonusCategory, type ProcurementCategoryKey } from './config'
import type { ProcurementAssessmentResult, ProcurementCategoryResult } from './assessment'

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

export type ProcurementScoreSummary = {
  /** Base points counted, capped at 25 by the engine. */
  basePoints: number
  baseCap: number
  /** Bonus points counted, capped at 2 by the engine. Shown apart from the 25. */
  bonusPoints: number
  bonusCap: number
  /** The five base lines added up before the cap (they are worth 27 together). */
  uncappedBasePoints: number
  uncappedBonusPoints: number
  /** The procurement-only module figure: all six lines added up, out of 29. */
  moduleTotal: number
  baseWasCapped: boolean
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

  const uncappedBasePoints = lines.filter((l) => !l.isBonus).reduce((sum, l) => sum + l.pointsAchieved, 0)
  const uncappedBonusPoints = lines.filter((l) => l.isBonus).reduce((sum, l) => sum + l.pointsAchieved, 0)
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
    moduleTotal: result.totalScore,
    baseWasCapped: capped.baseWasCapped,
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
  if (!gap) return 'Every indicator has reached its target, so there is no gap to close.'
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
