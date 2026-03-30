import type { ScorecardResult } from './calculateScorecard'
import type { CategoryGapAnalysis } from './analysis'
import { analyseGaps } from './analysis'
import { LEGACY_SCORECARD_RULES } from './legacyRuleMap'

export type RecommendationPriority = 'high' | 'medium' | 'low'

export interface CategoryRecommendation {
  category_key: string
  category_name: string
  priority: RecommendationPriority
  severityLabel: string
  title: string
  description: string
  currentScore: number
  maxScore: number
  gap: number
  completion: number
}

export function generateRecommendations(
  result: ScorecardResult,
): CategoryRecommendation[] {
  const { categories } = analyseGaps(result)

  return categories.map<CategoryRecommendation>((cat: CategoryGapAnalysis) => {
    const completionPct = cat.completion * 100
    const band =
      LEGACY_SCORECARD_RULES.recommendationBands.find(
        (b) => completionPct < b.completionPctUpperExclusive,
      ) ?? LEGACY_SCORECARD_RULES.recommendationBands[2]

    const priority = band.priority as RecommendationPriority
    const severityLabel = band.severityLabel
    const title = `${cat.category_name}: ${band.titleSuffix}`
    const description = band.description

    return {
      category_key: cat.category_key,
      category_name: cat.category_name,
      priority,
      severityLabel,
      title,
      description,
      currentScore: cat.score,
      maxScore: cat.max_score,
      gap: cat.gap,
      completion: cat.completion,
    }
  })
}

