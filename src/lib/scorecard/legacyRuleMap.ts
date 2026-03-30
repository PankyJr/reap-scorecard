export type LegacyScorecardLevel =
  | 'Level 1'
  | 'Level 2'
  | 'Level 3'
  | 'Level 4'
  | 'Level 5'
  | 'Level 6'
  | 'Level 7'
  | 'Non-Compliant'

export interface LegacyScorecardCategoryRule {
  key: string
  name: string
  max_score: number
}

export interface LegacyScorecardLevelBand {
  min: number
  level: LegacyScorecardLevel
}

export interface LegacyRecommendationBandRule {
  completionPctUpperExclusive: number
  priority: 'high' | 'medium' | 'low'
  severityLabel: string
  titleSuffix: string
  description: string
}

export interface LegacyInterpretationRule {
  levelPhrases: Record<string, string>
}

export const LEGACY_SCORECARD_RULES = {
  categories: [
    { key: 'ownership', name: 'Ownership', max_score: 25 },
    {
      key: 'management_control',
      name: 'Management Control',
      max_score: 20,
    },
    {
      key: 'skills_development',
      name: 'Skills Development',
      max_score: 20,
    },
    {
      key: 'enterprise_development',
      name: 'Enterprise Development',
      max_score: 25,
    },
    {
      key: 'socio_economic_development',
      name: 'Socio-Economic Development',
      max_score: 10,
    },
  ] satisfies LegacyScorecardCategoryRule[],

  // Placeholder thresholds mapping (must match existing behavior).
  levelBands: [
    { min: 85, level: 'Level 1' },
    { min: 75, level: 'Level 2' },
    { min: 65, level: 'Level 3' },
    { min: 55, level: 'Level 4' },
    { min: 45, level: 'Level 5' },
    { min: 35, level: 'Level 6' },
    { min: 25, level: 'Level 7' },
  ] satisfies LegacyScorecardLevelBand[],

  // recommendation logic is driven by completion percentage of each category (score/max).
  recommendationBands: [
    {
      completionPctUpperExclusive: 60,
      priority: 'high',
      severityLabel: 'Critical gap',
      titleSuffix: 'immediate focus required',
      description:
        'This category is materially below expectations. Prioritise a structured remediation plan with clear ownership and timelines.',
    },
    {
      completionPctUpperExclusive: 80,
      priority: 'medium',
      severityLabel: 'Improvement area',
      titleSuffix: 'targeted improvement opportunity',
      description:
        'Performance is moderate with clear room for uplift. Focus on a few high‑leverage initiatives to close the remaining gap.',
    },
    {
      completionPctUpperExclusive: Number.POSITIVE_INFINITY,
      priority: 'low',
      severityLabel: 'Strength',
      titleSuffix: 'maintain and leverage strength',
      description:
        'Performance is strong. Maintain current practices and consider using this area as a reference model for weaker categories.',
    },
  ] satisfies LegacyRecommendationBandRule[],

  interpretation: {
    levelPhrases: {
      'Level 1': 'strong compliance with the REAP framework.',
      'Level 2': 'moderate compliance with clear room for uplift.',
      'Level 3': 'developing compliance; targeted improvements will yield material gains.',
      'Level 4': 'early-stage compliance; significant opportunity across several categories.',
      'Level 5': 'foundational compliance; focus on highest-impact categories first.',
      'Level 6': 'limited compliance; a structured improvement plan is recommended.',
      'Level 7': 'minimal compliance; priority focus on ownership and management control.',
      'Non-Compliant':
        'below the minimum threshold; a comprehensive remediation plan is recommended.',
    },
  } satisfies LegacyInterpretationRule,
} as const

