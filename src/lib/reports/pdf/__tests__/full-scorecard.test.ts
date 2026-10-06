import { describe, expect, it } from 'vitest'
import {
  buildFullScorecardPdf,
  levelSentences,
  pointsToGain,
  pointsToGainSentences,
  type ScorecardPdfElement,
  type ScorecardPdfInput,
} from '../full-scorecard'
import { extractPdfText } from './pdf-text'

/* Fixture values are test data, not product rules. */
function el(
  key: string,
  name: string,
  points: number,
  available: number,
  indicators: ScorecardPdfElement['indicators'] = [],
): ScorecardPdfElement {
  return { key, name, status: 'calculated', points, availablePoints: available, indicators }
}

const ELEMENTS: ScorecardPdfElement[] = [
  el('ownership', 'Ownership', 18.5, 25, [
    { name: 'Black voting rights', achieved: '30.0%', target: '25.0%', points: 4, availablePoints: 4 },
    { name: 'Net value', achieved: '20.0%', target: '25.0%', points: 6.4, availablePoints: 8 },
    { name: 'Black women voting rights', achieved: '5.0%', target: '10.0%', points: 1, availablePoints: 2 },
  ]),
  el('management_control', 'Management Control', 12.57, 19, [
    { name: 'Black board members', achieved: '30.0%', target: '50.0%', points: 1.2, availablePoints: 2 },
    { name: 'Black executive directors', achieved: '0.0%', target: '50.0%', points: 0, availablePoints: 2 },
  ]),
  el('skills_development', 'Skills Development', 9, 20, [
    { name: 'Skills spend on black people', achieved: 'R 120,000.00', target: 'R 300,000.00', points: 3, availablePoints: 8 },
    { name: 'Absorbed learners', achieved: '0', target: '2.5%', points: 0, availablePoints: 5, isBonus: true },
  ]),
  el('preferential_procurement', 'Preferential Procurement', 20, 25),
  { key: 'supplier_development', name: 'Supplier Development', status: 'not_calculated', points: null, availablePoints: 10, note: 'Supplier Development spend has not been entered.', indicators: [] },
  el('enterprise_development', 'Enterprise Development', 5, 5),
  el('sed', 'Socio-Economic Development', 5, 5),
]

function input(overrides: Partial<ScorecardPdfInput> = {}): ScorecardPdfInput {
  return {
    companyName: 'Acme Holdings (Pty) Ltd',
    assessmentName: 'FY2026 B-BBEE',
    financialYear: '2026',
    generatedAt: new Date('2026-10-06T08:00:00Z'),
    calculated: true,
    calculatedAt: new Date('2026-10-01T09:00:00Z'),
    ruleSet: { name: 'Generic scorecard', version: '2019' },
    level: { label: 'Level 6', isFinal: true, notFinalReasons: [], recognitionPercent: 0.6 },
    totalPoints: 70.07,
    bonusPoints: 1.5,
    availablePoints: 109,
    elements: ELEMENTS,
    priorityResults: [
      { name: 'Ownership: net value', requirement: '40% of points', achieved: '80%', met: true },
      { name: 'Skills Development', requirement: '40% of points', achieved: '45%', met: true },
      { name: 'Preferential Procurement', requirement: '40% of points', achieved: '80%', met: true },
      { name: 'Supplier Development', requirement: '40% of points', achieved: null, met: null },
    ],
    levelTable: [
      { level: 'Level 1', minPoints: 100, recognitionPercent: 1.35 },
      { level: 'Level 6', minPoints: 55, recognitionPercent: 0.6 },
    ],
    ...overrides,
  }
}

describe('level sentences', () => {
  it('says the level and what clients can claim only when the level is final', () => {
    expect(levelSentences(input())).toEqual([
      'Your company is a Level 6 contributor. Clients can claim 60% of what they spend with you.',
    ])
  })

  it('says plainly when the level is not final', () => {
    const notFinal = input({
      level: { label: 'Level 6', isFinal: false, notFinalReasons: ['Supplier Development is not calculated.'], recognitionPercent: 0.6 },
    })
    const sentences = levelSentences(notFinal)
    expect(sentences).toEqual(['Your B-BBEE level is not final. Level 6 is a working result only.'])
    expect(sentences.join(' ')).not.toContain('Clients can claim')
  })

  it('says when the stored result gives no reason', () => {
    const s = levelSentences(input({ level: { label: null, isFinal: false, notFinalReasons: [], recognitionPercent: null } }))
    expect(s).toContain('The stored result does not say why.')
  })

  it('handles a non-compliant result and a level lowered by a priority sub-minimum', () => {
    expect(
      levelSentences(input({ level: { label: 'Non-compliant', isFinal: true, notFinalReasons: [], recognitionPercent: 0 } })),
    ).toEqual(['Your company is a non-compliant contributor. Clients cannot claim any of what they spend with you.'])
    expect(
      levelSentences(input({ level: { label: 'Level 7', isFinal: true, notFinalReasons: [], recognitionPercent: 0.5, levelBeforeDiscount: 'Level 6' } })),
    ).toEqual([
      'Your company is a Level 7 contributor. Clients can claim 50% of what they spend with you.',
      'A priority sub-minimum was not met, so the level was lowered from Level 6 to Level 7.',
    ])
  })
})

describe('where to gain points', () => {
  it('lists the three largest gaps from the stored points, skipping elements not calculated', () => {
    const items = pointsToGain(ELEMENTS)
    expect(items.map((i) => [i.element, i.indicator, Number(i.gap.toFixed(2))])).toEqual([
      ['Skills Development', 'Skills spend on black people', 5],
      ['Preferential Procurement', null, 5],
      ['Skills Development', 'Absorbed learners', 5],
    ])
    // Equal gaps: main points come before bonus points.
    expect(items[2].isBonus).toBe(true)
  })

  it('words each item from the data only', () => {
    expect(pointsToGainSentences(input())[0]).toBe(
      'Skills Development, Skills spend on black people: 3.00 of 8 points, so up to 5.00 more points are available. Currently R 120,000.00 against a target of R 300,000.00.',
    )
  })

  it('says so when nothing can be gained or nothing is calculated', () => {
    const full = ELEMENTS.filter((e) => e.status === 'calculated').map((e) => ({
      ...e,
      points: e.availablePoints,
      indicators: e.indicators.map((i) => ({ ...i, points: i.availablePoints })),
    }))
    expect(pointsToGainSentences(input({ elements: full }))).toEqual([
      'No gaps found: every calculated indicator already has its full points.',
    ])
    expect(pointsToGainSentences(input({ calculated: false }))).toEqual([
      'Points to gain cannot be worked out until the assessment is calculated.',
    ])
  })
})

describe('buildFullScorecardPdf', () => {
  it('produces every section in order, for all seven elements', async () => {
    const result = await buildFullScorecardPdf(input())
    const text = await extractPdfText(result.bytes)
    expect(text.pageCount).toBe(result.pageCount)
    const all = text.all

    const order = [
      'Acme Holdings (Pty) Ltd',
      'DRAFT — not a verified B-BBEE certificate',
      'Summary',
      'Your company is a Level 6 contributor. Clients can claim 60% of what they spend with you.',
      'Points by element',
      'Element by element',
      'Ownership: 18.50 / 25',
      'Management Control: 12.57 / 19',
      'Skills Development: 9.00 / 20',
      'Preferential Procurement: 20.00 / 25',
      'Supplier Development',
      'Enterprise Development: 5.00 / 5',
      'Socio-Economic Development: 5.00 / 5',
      'Priority sub-minimum results',
      'Where to gain points',
      'How it was calculated',
    ]
    let last = -1
    for (const marker of order) {
      const at = all.indexOf(marker, last + 1)
      expect(at, `"${marker}" should appear after the previous section`).toBeGreaterThan(last)
      last = at
    }

    expect(text.pages[0]).toContain('Generated 6 October 2026')
    expect(all).toContain('70.07 out of 109')
    expect(all).toContain('1.50') // bonus shown separately
    expect(all).toContain('71.57') // total with bonus
    expect(all).toContain('60%')
    expect(all).toContain('Generic scorecard (version 2019)')
    expect(all).toContain('1.20 / 2.00') // indicator points format
    expect(all).toContain('Absorbed learners (bonus)')
    expect(all).toContain('Not calculated yet') // chart label for Supplier Development
    expect(all).toContain('Supplier Development spend has not been entered.')
    expect(all).toContain('Not worked out') // priority result with no stored outcome
    expect(all).toContain('1. Skills Development, Skills spend on black people')
    expect(all).toContain('Calculated on')
    expect(all).toContain('1 October 2026')
    expect(all).toContain('Page 1 of')
  })

  it('makes a short PDF that says what to do when the assessment is not calculated', async () => {
    const result = await buildFullScorecardPdf(
      input({ calculated: false, elements: [], priorityResults: [], totalPoints: null, bonusPoints: null }),
    )
    const text = await extractPdfText(result.bytes)
    expect(text.pageCount).toBe(2)
    expect(text.all).toContain('Not calculated yet')
    // Wrapped lines are separate runs; rejoin them to check the sentence.
    expect(text.all.replace(/\n/g, ' ')).toContain('press Calculate. Then download this PDF again.')
    expect(text.all).not.toContain('Summary')
    expect(text.all).not.toContain('Clients can claim')
  })

  it('lists the reasons when the level is not final and never claims a recognition percentage', async () => {
    const result = await buildFullScorecardPdf(
      input({
        level: {
          label: 'Level 6',
          isFinal: false,
          notFinalReasons: ['Supplier Development is not calculated.'],
          recognitionPercent: 0.6,
        },
      }),
    )
    const log = result.textLog.join('\n')
    expect(log).toContain('Level 6 (not final)')
    expect(log).toContain('Why it is not final:')
    expect(log).toContain('Supplier Development is not calculated.')
    expect(log).not.toContain('Clients can claim')
  })

  it('shows a missing rule set honestly', async () => {
    const result = await buildFullScorecardPdf(input({ ruleSet: { name: null, version: null } }))
    expect(result.textLog).toContain('Not recorded in the stored result')
  })
})
