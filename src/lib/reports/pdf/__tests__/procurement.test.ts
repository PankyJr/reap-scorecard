import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  PROBLEM_LIST_LIMIT,
  biggestGapSentence,
  buildProcurementPdf,
  findSupplierProblems,
  procurementRecommendations,
  sortSuppliersBySpend,
  summarisePoints,
  type ProcurementPdfIndicator,
  type ProcurementPdfInput,
  type ProcurementPdfSupplier,
} from '../procurement'
import { extractPdfText } from './pdf-text'
import { procurementPointsFromLines } from '@/lib/procurement/scoreSummary'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'

/* Fixture values are test data, not product targets. */
const INDICATORS: ProcurementPdfIndicator[] = [
  { key: 'all', name: 'All B-BBEE suppliers', supplierGroup: 'B-BBEE compliant suppliers', targetPercent: 0.8, achievedPercent: 0.9, availablePoints: 5, pointsAchieved: 5, recognisedSpend: 900_000, isBonus: false },
  { key: 'qse', name: 'All QSEs', supplierGroup: 'QSE suppliers', targetPercent: 0.15, achievedPercent: 0.05, availablePoints: 3, pointsAchieved: 1, recognisedSpend: 50_000, isBonus: false },
  { key: 'eme', name: 'All EMEs', supplierGroup: 'EME suppliers', targetPercent: 0.15, achievedPercent: 0.075, availablePoints: 4, pointsAchieved: 2, recognisedSpend: 75_000, isBonus: false },
  { key: 'bo', name: '51% black owned', supplierGroup: '51%+ black-owned suppliers', targetPercent: 0.5, achievedPercent: 0.2, availablePoints: 11, pointsAchieved: 4.4, recognisedSpend: 200_000, isBonus: false },
  { key: 'bwo', name: '30% black women owned', supplierGroup: '30%+ black women-owned suppliers', targetPercent: 0.12, achievedPercent: 0.12, availablePoints: 4, pointsAchieved: 4, recognisedSpend: 120_000, isBonus: false },
  { key: 'bdg', name: '51% black designated groups', supplierGroup: 'designated group suppliers', targetPercent: 0.02, achievedPercent: 0.01, availablePoints: 2, pointsAchieved: 1, recognisedSpend: 10_000, isBonus: true },
]

/** Every indicator at its full points: the base indicators add up past the cap. */
const FULL_MARKS: ProcurementPdfIndicator[] = INDICATORS.map((i) => ({
  ...i,
  pointsAchieved: i.availablePoints,
  achievedPercent: i.targetPercent,
}))

function supplier(overrides: Partial<ProcurementPdfSupplier>): ProcurementPdfSupplier {
  return {
    name: 'Supplier',
    level: '2',
    size: 'QSE',
    spend: 1000,
    recognisedSpend: 1250,
    blackOwned51: true,
    blackWomenOwned30: false,
    certificateExpiry: '2027-01-31',
    vatNumber: null,
    registrationNumber: null,
    ...overrides,
  }
}

const GENERATED_AT = new Date('2026-10-06T08:00:00Z')

function baseInput(suppliers: ProcurementPdfSupplier[]): ProcurementPdfInput {
  return {
    companyName: 'Acme Holdings (Pty) Ltd',
    assessmentName: 'FY2026 procurement',
    financialYear: '2026',
    generatedAt: GENERATED_AT,
    indicators: INDICATORS,
    tmps: {
      total: 1_000_000,
      inclusionsTotal: 1_400_000,
      exclusionsTotal: 400_000,
      inclusions: [{ label: 'Cost of sales', amount: 1_400_000 }],
      exclusions: [
        { label: 'Employee costs', amount: 300_000 },
        { label: 'Depreciation', amount: 100_000 },
      ],
    },
    suppliers,
    method: {
      recognitionLevels: [
        { level: '1', recognition: 1.35 },
        { level: '4', recognition: 1 },
        { level: 'Non-Compliant', recognition: 0 },
      ],
    },
  }
}

const MESSY_SUPPLIERS: ProcurementPdfSupplier[] = [
  supplier({ name: 'Small Spend Co', spend: 500 }),
  supplier({ name: 'Biggest Spend Ltd', spend: 900_000, vatNumber: '4123456789' }),
  supplier({ name: 'No Level Traders', level: null }),
  supplier({ name: 'Lapsed Cert CC', certificateExpiry: '2026-09-30' }),
  supplier({ name: 'Odd Date Pty', certificateExpiry: 'sometime next year' }),
  supplier({ name: 'Zero Spend Inc', spend: 0 }),
  supplier({ name: 'Refund Co', spend: -250 }),
  supplier({ name: 'biggest  spend ltd.', spend: 10 }), // same name as #1 once normalised
  supplier({ name: 'Other Name', vatNumber: '4123-456-789' }), // same VAT as Biggest Spend
  supplier({ name: 'No Expiry EME', size: 'EME', certificateExpiry: null }),
]

describe('procurement analysis', () => {
  it('sorts suppliers by spend, largest first, missing spend last', () => {
    const ranked = sortSuppliersBySpend([
      supplier({ name: 'b', spend: 10 }),
      supplier({ name: 'none', spend: null }),
      supplier({ name: 'a', spend: 99 }),
    ])
    expect(ranked.map((s) => [s.rank, s.name])).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'none'],
    ])
  })

  it('finds missing levels, expired and unreadable certificates, duplicates and bad spend', () => {
    const ranked = sortSuppliersBySpend(MESSY_SUPPLIERS)
    const p = findSupplierProblems(ranked, GENERATED_AT)
    expect(p.missingLevel.map((s) => s.name)).toEqual(['No Level Traders'])
    expect(p.expired.map((s) => s.name)).toEqual(['Lapsed Cert CC'])
    expect(p.unreadableExpiry.map((s) => s.name)).toEqual(['Odd Date Pty'])
    expect(p.badSpend.map((s) => s.name).sort()).toEqual(['Refund Co', 'Zero Spend Inc'])
    expect(p.missingName).toEqual([])
    // One group: two linked by name, a third linked by VAT number.
    expect(p.duplicates).toHaveLength(1)
    expect(p.duplicates[0].suppliers.map((s) => s.name).sort()).toEqual([
      'Biggest Spend Ltd',
      'Other Name',
      'biggest  spend ltd.',
    ])
    expect(p.duplicates[0].reasons).toEqual(['Same name', 'Same VAT number'])
  })

  it('does not call a certificate expiring on the check day expired, nor treat placeholder VAT numbers as duplicates', () => {
    const ranked = sortSuppliersBySpend([
      supplier({ name: 'A', certificateExpiry: '2026-10-06', vatNumber: 'N/A' }),
      supplier({ name: 'B', certificateExpiry: '06/10/2026', vatNumber: 'n/a' }),
      supplier({ name: 'C', certificateExpiry: '05/10/2026', vatNumber: '0000000000' }),
      supplier({ name: 'D', vatNumber: '0000000000' }),
    ])
    const p = findSupplierProblems(ranked, GENERATED_AT)
    expect(p.expired.map((s) => s.name)).toEqual(['C'])
    expect(p.duplicates).toEqual([])
  })

  it('keeps bonus points apart from the base, each out of the engine cap', () => {
    const s = summarisePoints(INDICATORS)
    expect(s.core).toEqual({ achieved: 16.4, available: PROCUREMENT_BASE_CAP, uncapped: 16.4, wasCapped: false })
    expect(s.bonus).toEqual({ achieved: 1, available: PROCUREMENT_BONUS_CAP, present: true })
  })

  it('caps the base points as the score page does when the base indicators add up past the cap', () => {
    const s = summarisePoints(FULL_MARKS)
    const baseWorth = FULL_MARKS.filter((i) => !i.isBonus).reduce((sum, i) => sum + (i.availablePoints ?? 0), 0)
    expect(baseWorth).toBeGreaterThan(PROCUREMENT_BASE_CAP)
    expect(s.core).toEqual({ achieved: PROCUREMENT_BASE_CAP, available: PROCUREMENT_BASE_CAP, uncapped: baseWorth, wasCapped: true })
    expect(s.bonus.achieved).toBe(PROCUREMENT_BONUS_CAP)
    // The same figures as the shared helper the screens use.
    const screens = procurementPointsFromLines(FULL_MARKS.map((i) => ({ key: i.key, isBonus: i.isBonus, pointsAchieved: i.pointsAchieved })))
    expect([s.core.achieved, s.bonus.achieved]).toEqual([screens.basePoints, screens.bonusPoints])
  })

  it('names the biggest points gap using only the stored figures', () => {
    expect(biggestGapSentence(INDICATORS)).toBe(
      'The biggest gap is 51% black owned: 20.0% of spend against a 50.0% target, 6.60 points short.',
    )
  })

  it('recommends the three indicators losing the most points, with arithmetic from the input only', () => {
    const recs = procurementRecommendations(INDICATORS, 1_000_000)
    expect(recs).toHaveLength(3)
    expect(recs[0]).toBe(
      'Raise spend with 51%+ black-owned suppliers: currently 20.0% against a 50.0% target, worth up to 6.60 more points. Reaching the target needs about R 300,000.00 more recognised spend.',
    )
    expect(recs[1]).toMatch(/^Raise spend with QSE suppliers: .*worth up to 2\.00 more points/)
    expect(recs[2]).toMatch(/^Raise spend with EME suppliers: .*worth up to 2\.00 more points/)
  })

  it('says plainly when there is nothing to recommend or nothing to work from', () => {
    const allMet = INDICATORS.map((i) => ({ ...i, pointsAchieved: i.availablePoints, achievedPercent: i.targetPercent }))
    expect(procurementRecommendations(allMet, 1)).toEqual([
      'No recommendations: every indicator already meets its target.',
    ])
    const missing = INDICATORS.map((i) => ({ ...i, pointsAchieved: null, achievedPercent: null }))
    expect(procurementRecommendations(missing, null)).toEqual([
      'No recommendations can be made until the indicator results are calculated.',
    ])
    expect(biggestGapSentence(missing)).toMatch(/cannot be worked out/)
  })
})

describe('buildProcurementPdf', () => {
  it('produces every section, in order, with the stored figures', async () => {
    const result = await buildProcurementPdf(baseInput(MESSY_SUPPLIERS))
    const text = await extractPdfText(result.bytes)
    expect(text.pageCount).toBe(result.pageCount)
    expect(text.pageCount).toBeGreaterThanOrEqual(4)

    const all = text.all
    const order = [
      'Acme Holdings (Pty) Ltd',
      'DRAFT — not a verified B-BBEE certificate',
      'Summary',
      'The biggest gap is 51% black owned',
      'Each indicator against its target',
      'Breakdown by indicator',
      'Total measured procurement spend',
      'Supplier list',
      'Problems found',
      'Top 3 recommendations',
      'How it was calculated',
    ]
    let last = -1
    for (const marker of order) {
      const at = all.indexOf(marker, last + 1)
      expect(at, `"${marker}" should appear after the previous section`).toBeGreaterThan(last)
      last = at
    }

    // Cover details.
    expect(text.pages[0]).toContain('FY2026 procurement')
    expect(text.pages[0]).toContain('Financial year 2026')
    expect(text.pages[0]).toContain('Generated 6 October 2026')
    // Base points out of the cap, bonus shown separately: the score page's words.
    expect(all).toContain(`16.40 of ${PROCUREMENT_BASE_CAP} points`)
    expect(all).toContain('Bonus points')
    expect(all).toContain(`1.00 of ${PROCUREMENT_BONUS_CAP}`)
    expect(all).not.toContain('out of 27')
    // Status words, so the chart and table read without colour.
    expect(all).toContain('20.0% vs 50.0% target: Below target')
    expect(all).toContain('90.0% vs 80.0% target: Met')
    expect(all).toContain('51% black designated groups (bonus)')
    // TMPS exclusions listed.
    expect(all).toContain('Employee costs')
    expect(all).toContain('R 300,000.00')
    // Supplier list: honest column labels, largest first, "—" when expiry missing.
    expect(all).toContain('51%+ black')
    expect(all.indexOf('Biggest Spend Ltd')).toBeLessThan(all.indexOf('Small Spend Co'))
    expect(all).toContain('R 900,000')
    // Problems.
    expect(all).toContain('Missing B-BBEE level (1)')
    expect(all).toContain('Expired certificate (1)')
    expect(all).toContain('Expired 2026-09-30')
    expect(all).toContain('Zero, negative or missing spend (2)')
    expect(all).toContain('Possible duplicates (1 group)')
    expect(all).toContain('Same name, Same VAT number')
    // Recommendations and method.
    expect(all).toContain('1. Raise spend with 51%+ black-owned suppliers')
    expect(all).toContain('135%')
    expect(all).toContain('Page 1 of')
  })

  it('says "None found." for each check when the data is clean', async () => {
    const result = await buildProcurementPdf(
      baseInput([
        supplier({ name: 'Clean One', spend: 100 }),
        supplier({ name: 'Clean Two', spend: 200, vatNumber: '4000000001' }),
      ]),
    )
    const none = result.textLog.filter((t) => t === 'None found.')
    expect(none).toHaveLength(6)
  })

  it('prints the base points capped, out of the cap, and says what the base indicators added up to', async () => {
    const input = baseInput([supplier({ name: 'Clean One', spend: 100 })])
    input.indicators = FULL_MARKS
    const result = await buildProcurementPdf(input)
    const all = (await extractPdfText(result.bytes)).all
    const baseWorth = FULL_MARKS.filter((i) => !i.isBonus).reduce((sum, i) => sum + (i.availablePoints ?? 0), 0)
    expect(all).toContain(`${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points`)
    expect(all).toContain(`${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`)
    expect(all).toContain(`${PROCUREMENT_BASE_CAP}.00 / ${PROCUREMENT_BASE_CAP}`)
    expect(all).toContain(`The base indicators add up to ${baseWorth.toFixed(2)} points; the scorecard counts at most ${PROCUREMENT_BASE_CAP}.`)
    expect(all).not.toContain(`${baseWorth.toFixed(2)} out of ${baseWorth}`)
    expect(all).not.toContain(`${baseWorth.toFixed(2)} / ${baseWorth}`)
  })

  it('handles no suppliers, no results and no TMPS without inventing numbers', async () => {
    const input = baseInput([])
    input.indicators = []
    input.tmps = { total: null, inclusions: [], exclusions: [] }
    const result = await buildProcurementPdf(input)
    const log = result.textLog.join('\n')
    expect(log).toContain('No suppliers are stored for this assessment.')
    expect(log).toContain('No indicator results are stored for this assessment yet.')
    expect(log).toContain('Not provided')
    expect(log).toContain('No recommendations can be made until the indicator results are calculated.')
  })

  it('draws supplier names in any script without failing', async () => {
    const result = await buildProcurementPdf(
      baseInput([supplier({ name: 'Łódź 北京 Trading 🚚' }), supplier({ name: 'Ñandú Café' })]),
    )
    expect(result.textLog).toContain('Ñandú Café')
    expect(result.textLog).toContain('?ódz ?? Trading ?')
  })

  it('caps very long problem lists and says so', async () => {
    const many = Array.from({ length: PROBLEM_LIST_LIMIT + 5 }, (_, i) =>
      supplier({ name: `Unlevelled ${i}`, level: null, spend: 1000 + i }),
    )
    const result = await buildProcurementPdf(baseInput(many))
    const log = result.textLog.join('\n')
    expect(log).toContain(`Missing B-BBEE level (${PROBLEM_LIST_LIMIT + 5})`)
    expect(log).toContain(`Showing the first ${PROBLEM_LIST_LIMIT} of ${PROBLEM_LIST_LIMIT + 5}.`)
  })
})

/** Deterministic pseudo-random numbers so the large test is repeatable. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function syntheticSuppliers(count: number): ProcurementPdfSupplier[] {
  const rand = seeded(42)
  const levels = ['1', '2', '3', '4', '5', '6', '7', '8', 'Non-Compliant', null]
  const sizes = ['EME', 'QSE', 'Generic']
  return Array.from({ length: count }, (_, i) => {
    const spend = Math.round(rand() * 5_000_000 * 100) / 100
    const level = levels[Math.floor(rand() * levels.length)]
    return {
      name: `Synthetic Supplier ${String(i + 1).padStart(5, '0')} (Pty) Ltd`,
      level,
      size: sizes[Math.floor(rand() * sizes.length)],
      spend,
      recognisedSpend: level ? spend * 0.8 : 0,
      blackOwned51: rand() > 0.5,
      blackWomenOwned30: rand() > 0.7,
      certificateExpiry: rand() > 0.2 ? `2026-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-15` : null,
      vatNumber: `4${String(100000000 + i)}`,
      registrationNumber: `2010/${String(i).padStart(6, '0')}/07`,
    }
  })
}

describe('buildProcurementPdf at scale', () => {
  it('renders 8,000 suppliers quickly and under 5 MB', async () => {
    const suppliers = syntheticSuppliers(8000)
    const started = performance.now()
    const result = await buildProcurementPdf(baseInput(suppliers))
    const elapsedMs = performance.now() - started
    const sizeMb = result.bytes.length / (1024 * 1024)

    console.info(
      `[pdf] 8,000 suppliers: ${result.pageCount} pages, ${sizeMb.toFixed(2)} MB, ${Math.round(elapsedMs)} ms`,
    )
    // Measured alone: about 1.5 s for 197 pages. The ceiling leaves room for a
    // busy machine running the whole suite in parallel, and still catches a
    // slowdown of the kind that would break a Netlify function (10 s default).
    expect(elapsedMs).toBeLessThan(10_000)
    expect(result.bytes.length).toBeLessThan(5 * 1024 * 1024)

    // The file is a real PDF and the last supplier made it in.
    const loaded = await PDFDocument.load(result.bytes)
    expect(loaded.getPageCount()).toBe(result.pageCount)
    expect(result.pageCount).toBeGreaterThan(100)
    const ranked = sortSuppliersBySpend(suppliers)
    expect(result.textLog.join(' ')).toContain(ranked[ranked.length - 1].name)
  }, 30_000)
})
