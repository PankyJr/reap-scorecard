import { describe, expect, it } from 'vitest'

import {
  calculateScorecard,
  deriveScoreLevel,
  type ScorecardInput,
  type ScorecardResult,
} from '../calculateScorecard'
import { analyseGaps } from '../analysis'
import { getReportInterpretation } from '../interpretation'
import { generateRecommendations } from '../recommendations'
import { LEGACY_SCORECARD_RULES } from '../legacyRuleMap'

/**
 * Unit cover for the entry-level ("legacy") scorecard engine.
 *
 * These four modules are pure: inputs in, values out, no database and no React.
 * They had no test cover at all before this file.
 *
 * Category maxima come from LEGACY_SCORECARD_RULES and total 100:
 *   Ownership 25, Management Control 20, Skills Development 20,
 *   Enterprise Development 25, Socio-Economic Development 10.
 */

const MAXIMA = {
  ownership: 25,
  management_control: 20,
  skills_development: 20,
  enterprise_development: 25,
  socio_economic_development: 10,
} as const

function inputs(overrides: Partial<ScorecardInput> = {}): ScorecardInput {
  return {
    ownership: 0,
    management_control: 0,
    skills_development: 0,
    enterprise_development: 0,
    socio_economic_development: 0,
    ...overrides,
  }
}

describe('deriveScoreLevel', () => {
  it('maps a score to the highest band it qualifies for', () => {
    expect(deriveScoreLevel(100)).toBe('Level 1')
    expect(deriveScoreLevel(90)).toBe('Level 1')
    expect(deriveScoreLevel(80)).toBe('Level 2')
    expect(deriveScoreLevel(70)).toBe('Level 3')
    expect(deriveScoreLevel(60)).toBe('Level 4')
    expect(deriveScoreLevel(50)).toBe('Level 5')
    expect(deriveScoreLevel(40)).toBe('Level 6')
    expect(deriveScoreLevel(30)).toBe('Level 7')
    expect(deriveScoreLevel(10)).toBe('Non-Compliant')
  })

  // Boundaries are where banding bugs live: each band is inclusive of its
  // minimum, so a score sitting exactly on a threshold must take the HIGHER
  // level, and a hair below must drop to the next one down.
  it.each([
    [85, 'Level 1'],
    [84.99, 'Level 2'],
    [75, 'Level 2'],
    [74.99, 'Level 3'],
    [65, 'Level 3'],
    [64.99, 'Level 4'],
    [55, 'Level 4'],
    [54.99, 'Level 5'],
    [45, 'Level 5'],
    [44.99, 'Level 6'],
    [35, 'Level 6'],
    [34.99, 'Level 7'],
    [25, 'Level 7'],
    [24.99, 'Non-Compliant'],
  ])('scores exactly %d as %s', (score, expected) => {
    expect(deriveScoreLevel(score)).toBe(expected)
  })

  it('treats zero and negative totals as non-compliant', () => {
    expect(deriveScoreLevel(0)).toBe('Non-Compliant')
    expect(deriveScoreLevel(-10)).toBe('Non-Compliant')
  })

  it('covers every band declared in the rule map', () => {
    for (const band of LEGACY_SCORECARD_RULES.levelBands) {
      expect(deriveScoreLevel(band.min)).toBe(band.level)
    }
  })
})

describe('calculateScorecard', () => {
  it('returns one result per configured category, in rule-map order', () => {
    const result = calculateScorecard(inputs())

    expect(result.category_results.map((c) => c.category_key)).toEqual([
      'ownership',
      'management_control',
      'skills_development',
      'enterprise_development',
      'socio_economic_development',
    ])
    expect(result.category_results.map((c) => c.max_score)).toEqual([
      25, 20, 20, 25, 10,
    ])
  })

  it('sums a normal mixed-performance scorecard', () => {
    // 20 + 10 + 16 + 25 + 5 = 76, which lands in Level 2 (min 75).
    const result = calculateScorecard(
      inputs({
        ownership: 20,
        management_control: 10,
        skills_development: 16,
        enterprise_development: 25,
        socio_economic_development: 5,
      }),
    )

    expect(result.total_score).toBe(76)
    expect(result.score_level).toBe('Level 2')
  })

  it('awards a perfect 100 when every category is maxed', () => {
    const result = calculateScorecard(inputs(MAXIMA))

    expect(result.total_score).toBe(100)
    expect(result.score_level).toBe('Level 1')
  })

  it('scores an empty scorecard as zero and non-compliant', () => {
    const result = calculateScorecard(inputs())

    expect(result.total_score).toBe(0)
    expect(result.score_level).toBe('Non-Compliant')
  })

  // Boundary: a category can never contribute more than its maximum, however
  // large the raw input. Without this cap one over-stated category could carry
  // a company to Level 1 on its own.
  it('caps each category at its maximum', () => {
    const result = calculateScorecard(
      inputs({ ownership: 999, socio_economic_development: 40 }),
    )

    const ownership = result.category_results.find(
      (c) => c.category_key === 'ownership',
    )
    const sed = result.category_results.find(
      (c) => c.category_key === 'socio_economic_development',
    )

    expect(ownership?.score).toBe(25)
    expect(sed?.score).toBe(10)
    expect(result.total_score).toBe(35)
  })

  // Boundary: negative input is clamped to zero rather than subtracting from
  // the total, so a bad import cannot drag other categories down.
  it('clamps negative input to zero instead of subtracting', () => {
    const result = calculateScorecard(
      inputs({ ownership: -50, management_control: 20 }),
    )

    const ownership = result.category_results.find(
      (c) => c.category_key === 'ownership',
    )

    expect(ownership?.score).toBe(0)
    expect(result.total_score).toBe(20)
  })

  it('rounds fractional category scores to two decimal places', () => {
    const result = calculateScorecard(inputs({ ownership: 12.3456 }))

    const ownership = result.category_results.find(
      (c) => c.category_key === 'ownership',
    )

    expect(ownership?.score).toBe(12.35)
  })
})

describe('analyseGaps', () => {
  const result: ScorecardResult = calculateScorecard(
    inputs({
      ownership: 25, // 100% complete, gap 0
      management_control: 10, // 50% complete, gap 10
      skills_development: 16, // 80% complete, gap 4
      enterprise_development: 5, // 20% complete, gap 20  <- biggest gap
      socio_economic_development: 1, // 10% complete, gap 9  <- weakest
    }),
  )

  it('computes gap and completion per category', () => {
    const summary = analyseGaps(result)
    const byKey = Object.fromEntries(
      summary.categories.map((c) => [c.category_key, c]),
    )

    expect(byKey.ownership.gap).toBe(0)
    expect(byKey.ownership.completion).toBe(1)
    expect(byKey.management_control.gap).toBe(10)
    expect(byKey.management_control.completion).toBe(0.5)
    expect(byKey.enterprise_development.gap).toBe(20)
    expect(byKey.enterprise_development.completion).toBe(0.2)
  })

  it('identifies strongest by completion, not by raw points', () => {
    const summary = analyseGaps(result)
    expect(summary.strongestCategory?.category_key).toBe('ownership')
  })

  it('identifies the weakest category by completion', () => {
    // Socio-Economic Development is 10% complete — lower than Enterprise
    // Development's 20% — even though its raw gap is smaller.
    const summary = analyseGaps(result)
    expect(summary.weakestCategory?.category_key).toBe(
      'socio_economic_development',
    )
  })

  it('identifies the biggest gap by absolute points, not by completion', () => {
    // This distinction matters for remediation planning: the weakest category
    // and the biggest point opportunity are deliberately different here.
    const summary = analyseGaps(result)
    expect(summary.biggestGapCategory?.category_key).toBe(
      'enterprise_development',
    )
    expect(summary.biggestGapCategory?.gap).toBe(20)
  })

  it('returns nulls rather than throwing when there are no categories', () => {
    const summary = analyseGaps({
      total_score: 0,
      score_level: 'Non-Compliant',
      category_results: [],
    })

    expect(summary.categories).toEqual([])
    expect(summary.strongestCategory).toBeNull()
    expect(summary.weakestCategory).toBeNull()
    expect(summary.biggestGapCategory).toBeNull()
  })

  // Guard against divide-by-zero: a category with a zero maximum must report
  // 0% complete rather than NaN, which would poison every downstream figure.
  it('reports zero completion for a zero-maximum category', () => {
    const summary = analyseGaps({
      total_score: 0,
      score_level: 'Non-Compliant',
      category_results: [
        {
          category_key: 'placeholder',
          category_name: 'Placeholder',
          score: 0,
          max_score: 0,
        },
      ],
    })

    expect(summary.categories[0].completion).toBe(0)
    expect(Number.isNaN(summary.categories[0].completion)).toBe(false)
  })
})

describe('getReportInterpretation', () => {
  // Every category gets a DISTINCT completion so "strongest" and "weakest"
  // have exactly one correct answer each. With ties, the stable sort would
  // simply return whichever category the rule map lists first, and the test
  // would be asserting iteration order rather than the analysis.
  const summary = analyseGaps(
    calculateScorecard(
      inputs({
        ownership: 25, // 100% <- strongest
        management_control: 10, // 50%
        skills_development: 16, // 80%
        enterprise_development: 5, // 20%
        socio_economic_development: 1, // 10% <- weakest
      }),
    ),
  )

  it('opens with the level and its rule-map phrase', () => {
    const text = getReportInterpretation(summary, 'Level 2', 76)

    expect(text).toContain('Level 2')
    expect(text).toContain(
      LEGACY_SCORECARD_RULES.interpretation.levelPhrases['Level 2'],
    )
  })

  it('names the strongest and weakest categories', () => {
    const text = getReportInterpretation(summary, 'Level 4', 55)

    expect(text).toContain('Ownership')
    expect(text).toContain('Socio-Economic Development')
    expect(text).toContain('biggest opportunity for improvement')
  })

  it('falls back to a generic phrase for an unrecognised level', () => {
    const text = getReportInterpretation(summary, 'Level 99', 10)
    expect(text).toContain('scope for improvement')
  })

  it('reports uniform performance when every category is equally complete', () => {
    // All five categories at 100%: strongest and weakest resolve to the same
    // category, so the narrative must not claim a strength and a weakness.
    const uniform = analyseGaps(calculateScorecard(inputs(MAXIMA)))
    const text = getReportInterpretation(uniform, 'Level 1', 100)

    expect(text).toContain('Performance is consistent across categories.')
    expect(text).not.toContain('biggest opportunity')
  })

  it('reports uniform performance when there are no categories at all', () => {
    const empty = analyseGaps({
      total_score: 0,
      score_level: 'Non-Compliant',
      category_results: [],
    })
    const text = getReportInterpretation(empty, 'Non-Compliant', 0)

    expect(text).toContain('Category-level performance is uniform.')
  })
})

describe('generateRecommendations', () => {
  it('returns one recommendation per category', () => {
    const recs = generateRecommendations(calculateScorecard(inputs()))
    expect(recs).toHaveLength(5)
  })

  // Band boundaries: high is completion < 60%, medium is < 80%, low is the
  // rest. A category sitting exactly on 60 or 80 must fall into the HIGHER
  // (less severe) band, because both bounds are exclusive upper limits.
  it.each([
    ['below 60% complete', { ownership: 14 }, 'high', 'Critical gap'], // 56%
    ['exactly 60% complete', { ownership: 15 }, 'medium', 'Improvement area'],
    ['between 60 and 80%', { ownership: 17.5 }, 'medium', 'Improvement area'], // 70%
    ['exactly 80% complete', { ownership: 20 }, 'low', 'Strength'],
    ['above 80% complete', { ownership: 25 }, 'low', 'Strength'], // 100%
  ])('bands ownership %s as %s', (_label, override, priority, severity) => {
    const recs = generateRecommendations(
      calculateScorecard(inputs(override as Partial<ScorecardInput>)),
    )
    const ownership = recs.find((r) => r.category_key === 'ownership')

    expect(ownership?.priority).toBe(priority)
    expect(ownership?.severityLabel).toBe(severity)
  })

  it('scores an untouched category as the most severe band', () => {
    const recs = generateRecommendations(calculateScorecard(inputs()))

    for (const rec of recs) {
      expect(rec.priority).toBe('high')
      expect(rec.completion).toBe(0)
      expect(rec.gap).toBe(rec.maxScore)
    }
  })

  it('carries the category figures through to the recommendation', () => {
    const recs = generateRecommendations(
      calculateScorecard(inputs({ management_control: 12 })),
    )
    const mc = recs.find((r) => r.category_key === 'management_control')

    expect(mc?.currentScore).toBe(12)
    expect(mc?.maxScore).toBe(20)
    expect(mc?.gap).toBe(8)
    expect(mc?.completion).toBe(0.6)
    expect(mc?.title).toContain('Management Control')
  })
})
