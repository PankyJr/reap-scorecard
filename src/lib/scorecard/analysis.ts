import type { CategoryResult, ScorecardResult } from './calculateScorecard'

export interface CategoryGapAnalysis extends CategoryResult {
  gap: number
  completion: number // 0–1
}

export interface ScorecardGapSummary {
  categories: CategoryGapAnalysis[]
  strongestCategory: CategoryGapAnalysis | null
  weakestCategory: CategoryGapAnalysis | null
  biggestGapCategory: CategoryGapAnalysis | null
}

export function analyseGaps(result: ScorecardResult): ScorecardGapSummary {
  const categories: CategoryGapAnalysis[] = result.category_results.map((cat) => {
    const gap = Math.max(0, cat.max_score - cat.score)
    const completion = cat.max_score > 0 ? cat.score / cat.max_score : 0

    return {
      ...cat,
      gap,
      completion,
    }
  })

  if (categories.length === 0) {
    return {
      categories: [],
      strongestCategory: null,
      weakestCategory: null,
      biggestGapCategory: null,
    }
  }

  const strongestCategory = [...categories].sort(
    (a, b) => b.completion - a.completion,
  )[0]

  const weakestCategory = [...categories].sort(
    (a, b) => a.completion - b.completion,
  )[0]

  const biggestGapCategory = [...categories].sort((a, b) => b.gap - a.gap)[0]

  return {
    categories,
    strongestCategory,
    weakestCategory,
    biggestGapCategory,
  }
}

