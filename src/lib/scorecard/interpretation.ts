import type { ScorecardGapSummary } from './analysis'
import { LEGACY_SCORECARD_RULES } from './legacyRuleMap'

/**
 * Deterministic, rule-based interpretation for the scorecard report.
 * No AI; uses total score, level, and category analysis only.
 */
export function getReportInterpretation(
  gapSummary: ScorecardGapSummary,
  scoreLevel: string,
  totalScore: number
): string {
  const levelPhrases = LEGACY_SCORECARD_RULES.interpretation
    .levelPhrases as Record<string, string>
  const levelText =
    levelPhrases[scoreLevel] ??
    `operating at ${scoreLevel}, with scope for improvement.`

  const intro = `This company is currently operating at ${scoreLevel}, showing ${levelText}`

  if (!gapSummary.strongestCategory && !gapSummary.weakestCategory) {
    return `${intro} Category-level performance is uniform.`
  }

  const strongest =
    gapSummary.strongestCategory?.category_name ?? 'several categories'
  const weakest =
    gapSummary.weakestCategory?.category_name ?? 'some categories'

  if (strongest === weakest) {
    return `${intro} Performance is consistent across categories.`
  }

  return `${intro} Performance is strongest in ${strongest}, while ${weakest} appears to be the biggest opportunity for improvement.`
}
