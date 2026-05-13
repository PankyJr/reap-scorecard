import { deriveScoreLevel } from '@/lib/scorecard/calculateScorecard'
import { PROCUREMENT_CATEGORIES, type ProcurementCategoryKey } from './config'
import type { ProcurementCategoryResult } from './assessment'

export const PROCUREMENT_MAX_POINTS = PROCUREMENT_CATEGORIES.reduce(
  (sum, c) => sum + c.availablePoints,
  0,
)

export function procurementScoreAsPercent(totalScore: number): number {
  if (PROCUREMENT_MAX_POINTS <= 0) return 0
  return (totalScore / PROCUREMENT_MAX_POINTS) * 100
}

/** Maps procurement points (0–max) to the same REAP bands as the legacy scorecard (% of max). */
export function deriveProcurementReapLevel(totalScore: number): string {
  return deriveScoreLevel(procurementScoreAsPercent(totalScore))
}

export type CategoryInsightStatus = 'strong' | 'moderate' | 'priority'

export interface ProcurementCategoryInsight extends ProcurementCategoryResult {
  /** Target spend share required for full points in this category. */
  targetPercentDisplay: number
  /** Achieved spend share (numerator / TMPS). */
  achievedPercentDisplay: number
  /** Shortfall in percentage points vs target (0 if at or above target). */
  gapPercentPoints: number
  /** Points not yet earned in this category. */
  pointsRemaining: number
  /** pointsAchieved / availablePoints */
  pointsUtilization: number
  /** achievedPercent / targetPercent when target > 0 */
  performanceVsTargetRatio: number
  status: CategoryInsightStatus
}

function categoryStatus(
  pointsUtilization: number,
  performanceVsTargetRatio: number,
): CategoryInsightStatus {
  if (pointsUtilization >= 0.85 || performanceVsTargetRatio >= 0.95) {
    return 'strong'
  }
  if (pointsUtilization >= 0.45 || performanceVsTargetRatio >= 0.55) {
    return 'moderate'
  }
  return 'priority'
}

export function buildCategoryInsights(
  categories: ProcurementCategoryResult[],
): ProcurementCategoryInsight[] {
  return categories.map((cat) => {
    const target = cat.targetPercent
    const achieved = cat.achievedPercent
    const gapPercentPoints =
      target > 0 ? Math.max(0, (target - achieved) * 100) : 0
    const pointsRemaining = Math.max(
      0,
      cat.availablePoints - cat.pointsAchieved,
    )
    const pointsUtilization =
      cat.availablePoints > 0
        ? cat.pointsAchieved / cat.availablePoints
        : 0
    const performanceVsTargetRatio =
      target > 0 ? Math.min(achieved / target, 2) : 0

    return {
      ...cat,
      targetPercentDisplay: target * 100,
      achievedPercentDisplay: achieved * 100,
      gapPercentPoints,
      pointsRemaining,
      pointsUtilization,
      performanceVsTargetRatio,
      status: categoryStatus(pointsUtilization, performanceVsTargetRatio),
    }
  })
}

export function getStrongestAndWeakestCategories(
  insights: ProcurementCategoryInsight[],
): {
  strongest: ProcurementCategoryInsight | null
  weakest: ProcurementCategoryInsight | null
} {
  if (!insights.length) return { strongest: null, weakest: null }
  const sorted = [...insights].sort(
    (a, b) => b.pointsUtilization - a.pointsUtilization,
  )
  const strongest = sorted[0] ?? null
  const weakest = sorted[sorted.length - 1] ?? null
  if (
    strongest &&
    weakest &&
    strongest.key === weakest.key &&
    insights.length === 1
  ) {
    return { strongest, weakest: null }
  }
  if (
    strongest &&
    weakest &&
    strongest.key === weakest.key &&
    insights.length > 1
  ) {
    return { strongest, weakest: sorted[sorted.length - 2] ?? null }
  }
  return { strongest, weakest }
}

const LEVEL_INTERPRETATION: Record<string, string> = {
  'Level 1':
    'Recognition is strong versus the maximum: supplier mix and compliance are doing most of the work for you.',
  'Level 2':
    'Strong recognised spend is carrying this score. Remaining upside sits mainly in EME and Black Designated Group supplier participation.',
  'Level 3':
    'Core targets are only partly met; the fastest lift is tightening the weakest categories where points are still available.',
  'Level 4':
    'Several categories lag their targets—prioritise compliant suppliers and align spend where the point pools are largest.',
  'Level 5':
    'Material gaps versus targets: review supplier mix, certificate levels, and how much spend sits with rated entities.',
  'Level 6':
    'Recognition is thin across multiple categories; a deliberate compliance and supplier-development plan is required.',
  'Level 7':
    'Most targets are far off—where policy allows, concentrate spend with compliant QSEs, EMEs, and black-owned suppliers.',
  'Non-Compliant':
    'Recognition sits below typical reporting expectations; supplier compliance and mix need a structured remediation plan.',
}

/** Short executive line for the scorecard hero (same level bands as {@link getProcurementExecutiveInterpretation}). */
export function getProcurementExecutiveScorecardLine(reapLevel: string): string {
  return (
    LEVEL_INTERPRETATION[reapLevel] ??
    `Performance maps to ${reapLevel} using the same REAP-style bands as the legacy scorecard (as a percentage of maximum procurement points).`
  )
}

export function getProcurementExecutiveInterpretation(
  reapLevel: string,
  totalScore: number,
): string {
  const base =
    LEVEL_INTERPRETATION[reapLevel] ??
    `Performance maps to ${reapLevel} using the same REAP-style bands as the legacy scorecard (as a percentage of maximum procurement points).`
  const pts = `${totalScore.toFixed(2)} of ${PROCUREMENT_MAX_POINTS.toFixed(0)} maximum points.`
  return `${base} This assessment scores ${pts}`
}

export function isProcurementSupplierCompliant(
  level: string | null | undefined,
): boolean {
  if (level == null || level === '') return false
  return level !== 'Non-Compliant'
}

export interface SupplierMixSummary {
  totalSuppliers: number
  compliantCount: number
  nonCompliantCount: number
  totalValueExVat: number
  compliantValueExVat: number
  nonCompliantValueExVat: number
  totalBbbeeSpend: number
  bbbeeSpendShareOfTmps: number
}

export function summarizeSupplierMix(
  suppliers: Array<{
    level: string
    value_ex_vat: number | string | null
    bbbee_spend: number | string | null
  }>,
  totalMeasuredSpend: number,
): SupplierMixSummary {
  let compliantCount = 0
  let nonCompliantCount = 0
  let totalValueExVat = 0
  let compliantValueExVat = 0
  let nonCompliantValueExVat = 0
  let totalBbbeeSpend = 0

  for (const s of suppliers) {
    const v = Number(s.value_ex_vat ?? 0) || 0
    const b = Number(s.bbbee_spend ?? 0) || 0
    totalValueExVat += v
    totalBbbeeSpend += b
    const ok = isProcurementSupplierCompliant(s.level)
    if (ok) {
      compliantCount += 1
      compliantValueExVat += v
    } else {
      nonCompliantCount += 1
      nonCompliantValueExVat += v
    }
  }

  const tmps = totalMeasuredSpend > 0 ? totalMeasuredSpend : 0
  const bbbeeSpendShareOfTmps = tmps > 0 ? totalBbbeeSpend / tmps : 0

  return {
    totalSuppliers: suppliers.length,
    compliantCount,
    nonCompliantCount,
    totalValueExVat,
    compliantValueExVat,
    nonCompliantValueExVat,
    totalBbbeeSpend,
    bbbeeSpendShareOfTmps,
  }
}

const WHAT_THIS_MEANS_COPY: Record<
  ProcurementCategoryKey,
  { met: string; below: string }
> = {
  all_bbbee_suppliers: {
    met: 'Overall B-BBEE supplier spend is above the 80% target.',
    below: 'Overall B-BBEE supplier spend is below the 80% target.',
  },
  all_qses: {
    met: 'QSE procurement target is met.',
    below: 'QSE spend is below the 15% target.',
  },
  all_emes: {
    met: 'EME procurement target is met.',
    below: 'EME spend is below target.',
  },
  black_owned_51: {
    met: '51% black-owned procurement target is met.',
    below: '51% black-owned procurement target is not yet met.',
  },
  black_women_30: {
    met: '30% black women-owned procurement target is met.',
    below: '30% black women-owned procurement target is not yet met.',
  },
  bdgs_51: {
    met: '51% black designated group supplier target is met.',
    below: '51% black designated group supplier spend is below target.',
  },
}

export interface ProcurementWhatThisMeans {
  intro: string
  strongAreas: string[]
  improvementAreas: string[]
}

/** Plain-English bullets derived from stored category outcomes (rule-based). */
export function buildProcurementWhatThisMeans(args: {
  totalScore: number
  insights: ProcurementCategoryInsight[]
}): ProcurementWhatThisMeans | null {
  const { totalScore, insights } = args
  if (!insights.length) return null

  const intro = `This company scored ${totalScore.toFixed(2)} out of ${PROCUREMENT_MAX_POINTS} procurement points.`
  const strongAreas: string[] = []
  const improvementAreas: string[] = []

  for (const cat of insights) {
    const copy = WHAT_THIS_MEANS_COPY[cat.key]
    if (!copy) continue
    const met = cat.achievedPercent + 1e-9 >= cat.targetPercent
    const line = met ? copy.met : copy.below
    if (met) {
      if (!strongAreas.includes(line)) strongAreas.push(line)
    } else {
      if (!improvementAreas.includes(line)) improvementAreas.push(line)
    }
  }

  return { intro, strongAreas, improvementAreas }
}

export function buildProcurementRecommendations(args: {
  insights: ProcurementCategoryInsight[]
  mix: SupplierMixSummary
}): string[] {
  const out: string[] = []
  const { insights, mix } = args

  const byKey = Object.fromEntries(insights.map((i) => [i.key, i])) as Record<
    string,
    ProcurementCategoryInsight
  >

  const pushUnique = (s: string) => {
    if (s && !out.includes(s)) out.push(s)
  }

  if (mix.nonCompliantCount > 0 && mix.totalSuppliers > 0) {
    const pct = Math.round(
      (mix.nonCompliantCount / mix.totalSuppliers) * 100,
    )
    if (pct >= 40) {
      pushUnique(
        `A large share of suppliers (${pct}%) are non-compliant on B-BBEE level. Replacing or uplifting critical high-spend suppliers will improve recognition.`,
      )
    } else if (mix.nonCompliantCount >= 3) {
      pushUnique(
        'Several non-compliant suppliers are present. Prioritise level upgrades or alternate sourcing for those with the highest ex-VAT spend.',
      )
    }
  }

  if (
    mix.totalValueExVat > 0 &&
    mix.nonCompliantValueExVat / mix.totalValueExVat > 0.35
  ) {
    pushUnique(
      'A significant portion of procurement value sits with non-compliant suppliers. Focus compliance uplift where spend is concentrated.',
    )
  }

  const bbbee = byKey.all_bbbee_suppliers
  if (bbbee?.status === 'priority') {
    pushUnique(
      'Increase spend with B-BBEE recognised suppliers toward the 80% target to capture more of the “All B-BBEE suppliers” points.',
    )
  }

  const qse = byKey.all_qses
  const eme = byKey.all_emes
  if (qse?.status === 'priority') {
    pushUnique(
      'Grow QSE participation in the supplier base (15% target) to unlock QSE category points.',
    )
  }
  if (eme?.status === 'priority') {
    pushUnique(
      'Increase EME spend share (15% target) through targeted EME sourcing or enterprise development.',
    )
  }

  const bo = byKey.black_owned_51
  if (bo?.status === 'priority') {
    pushUnique(
      'Expand 51% black-owned supplier spend toward the 50% target; this category carries the largest point weight.',
    )
  }

  const bw = byKey.black_women_30
  if (bw?.status === 'priority') {
    pushUnique(
      'Add or grow 30% black women-owned suppliers to close the gap on that category target (12% of TMPS).',
    )
  }

  const bdgs = byKey.bdgs_51
  if (bdgs?.status === 'priority') {
    pushUnique(
      'Include qualifying black designated group suppliers to meet the 2% target and secure BDGs points.',
    )
  }

  if (mix.bbbeeSpendShareOfTmps < 0.5 && mix.totalBbbeeSpend >= 0) {
    pushUnique(
      'Recognised B-BBEE spend is low relative to measured procurement (TMPS). Rebalance the mix toward rated, compliant entities.',
    )
  }

  if (out.length === 0) {
    pushUnique(
      'Maintain current supplier governance: re-run this assessment after major sourcing changes to track drift in category performance.',
    )
  }

  return out.slice(0, 8)
}
