import {
  PROCUREMENT_CATEGORIES,
  type ProcurementCategoryKey,
} from './config'
import type { ProcurementSupplierWithCalculated } from './rows'

export interface ProcurementCategoryResult {
  key: ProcurementCategoryKey
  name: string
  targetPercent: number
  availablePoints: number
  achievedPercent: number
  pointsAchieved: number
  numeratorValue: number
  denominatorValue: number
}

export interface ProcurementAssessmentResult {
  totalScore: number
  categories: ProcurementCategoryResult[]
}

export interface ProcurementCategoryTotals {
  all_bbbee_suppliers: number
  all_qses: number
  all_emes: number
  black_owned_51: number
  black_women_30: number
  bdgs_51: number
}

export function aggregateCategoryTotals(
  suppliers: ProcurementSupplierWithCalculated[]
): ProcurementCategoryTotals {
  return suppliers.reduce<ProcurementCategoryTotals>(
    (acc, row) => {
      acc.all_bbbee_suppliers += row.bbbee_spend
      acc.all_qses += row.qse_amount
      acc.all_emes += row.eme_amount
      acc.black_owned_51 += row.black_owned_amount
      acc.black_women_30 += row.black_women_amount
      acc.bdgs_51 += row.bdgs_amount
      return acc
    },
    {
      all_bbbee_suppliers: 0,
      all_qses: 0,
      all_emes: 0,
      black_owned_51: 0,
      black_women_30: 0,
      bdgs_51: 0,
    }
  )
}

export function calculateProcurementResults(args: {
  totals: ProcurementCategoryTotals
  totalMeasuredSpend: number
}): ProcurementAssessmentResult {
  const { totals, totalMeasuredSpend } = args
  const denominator = totalMeasuredSpend > 0 ? totalMeasuredSpend : 0

  const categories: ProcurementCategoryResult[] = PROCUREMENT_CATEGORIES.map(
    (def) => {
      const numeratorValue = totals[def.key]
      const achievedPercent =
        denominator > 0 ? numeratorValue / denominator : 0

      const rawPoints =
        def.targetPercent > 0
          ? (achievedPercent / def.targetPercent) * def.availablePoints
          : 0

      const pointsAchieved = Math.min(rawPoints, def.availablePoints)

      return {
        key: def.key,
        name: def.name,
        targetPercent: def.targetPercent,
        availablePoints: def.availablePoints,
        achievedPercent,
        pointsAchieved,
        numeratorValue,
        denominatorValue: denominator,
      }
    }
  )

  const totalScore = categories.reduce(
    (sum, cat) => sum + cat.pointsAchieved,
    0
  )

  return {
    totalScore,
    categories,
  }
}

export function toProcurementResultsRows(
  assessmentId: string,
  result: ProcurementAssessmentResult
) {
  return result.categories.map((cat) => ({
    assessment_id: assessmentId,
    category_key: cat.key,
    category_name: cat.name,
    target_percent: cat.targetPercent,
    available_points: cat.availablePoints,
    achieved_percent: cat.achievedPercent,
    points_achieved: cat.pointsAchieved,
    numerator_value: cat.numeratorValue,
    denominator_value: cat.denominatorValue,
  }))
}

export function buildProcurementResultFromRows(rows: {
  category_key: ProcurementCategoryKey
  category_name: string
  target_percent: number
  available_points: number
  achieved_percent: number
  points_achieved: number
  numerator_value: number
  denominator_value: number
}[]): ProcurementAssessmentResult {
  const categories: ProcurementCategoryResult[] = rows.map((row) => ({
    key: row.category_key,
    name: row.category_name,
    targetPercent: Number(row.target_percent),
    availablePoints: Number(row.available_points),
    achievedPercent: Number(row.achieved_percent),
    pointsAchieved: Number(row.points_achieved),
    numeratorValue: Number(row.numerator_value),
    denominatorValue: Number(row.denominator_value),
  }))

  const totalScore = categories.reduce(
    (sum, cat) => sum + cat.pointsAchieved,
    0
  )

  return {
    totalScore,
    categories,
  }
}

