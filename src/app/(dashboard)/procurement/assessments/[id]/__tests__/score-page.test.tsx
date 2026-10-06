import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateSupplierRow, type ProcurementSupplierInput } from '@/lib/procurement/rows'
import { aggregateCategoryTotals, calculateProcurementResults, toProcurementResultsRows } from '@/lib/procurement/assessment'
import { mismatchedButtons } from '@/test-utils/button-names'
import { fadedTextClasses, sidewaysScrollers, unreachableScrollers } from '@/test-utils/a11y-markup'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'

type Row = Record<string, unknown>
let tables: Record<string, Row[]>

/** Behaves like the hosted API for the queries this page makes. */
class Query {
  private filters: ((row: Row) => boolean)[] = []
  private isSingle = false
  private from = 0
  private to = Number.POSITIVE_INFINITY
  private max = Number.POSITIVE_INFINITY
  constructor(private table: string) {}
  select() {
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }
  lt(column: string, value: string) {
    this.filters.push((row) => String(row[column]) < value)
    return this
  }
  not(column: string) {
    this.filters.push((row) => row[column] != null)
    return this
  }
  order() {
    return this
  }
  limit(n: number) {
    this.max = n
    return this
  }
  range(from: number, to: number) {
    this.from = from
    this.to = to
    return this
  }
  single() {
    this.isSingle = true
    return this
  }
  maybeSingle() {
    this.isSingle = true
    return this
  }
  then(resolve?: (value: { data: unknown; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
    const rows = (tables[this.table] ?? []).filter((row) => this.filters.every((f) => f(row)))
    const page = rows.slice(this.from, Math.min(this.to + 1, this.from + 1000)).slice(0, this.max)
    const data = this.isSingle ? (page[0] ?? null) : page
    return Promise.resolve({ data, error: null }).then(resolve, reject)
  }
}

vi.mock('@/lib/admin/tenant-read-context', () => ({
  resolveTenantReadContext: async () => ({
    user: { id: 'owner' },
    db: { from: (table: string) => new Query(table) },
    isReapInternalAdmin: false,
  }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/procurement/assessments/p1',
}))
vi.mock('@/app/(dashboard)/scorecards/calculator/actions', () => ({ createGenericScorecardAssessment: vi.fn() }))
vi.mock('../actions', () => ({ deleteProcurementAssessment: vi.fn(), updateProcurementAssessment: vi.fn() }))

import ProcurementAssessmentDetailsPage from '../page'

const COMPANY = { id: 'c1', name: 'Acme Holdings', owner_id: 'owner' }

function supplier(i: number, overrides: Partial<ProcurementSupplierInput & { expiry: string }> = {}) {
  const input: ProcurementSupplierInput = {
    supplier_name: `Supplier ${i}`,
    supplier_type: (['Generic', 'QSE', 'EME'] as const)[i % 3],
    level: String((i % 4) + 1),
    value_ex_vat: 1000 + i,
    is_51_black_owned: i % 2 === 0,
    is_30_black_women_owned: i % 5 === 0,
    is_51_bdgs: false,
    is_51_percent_flow_through: false,
    ...overrides,
  }
  return { id: `s${String(i).padStart(5, '0')}`, assessment_id: 'p1', ...calculateSupplierRow(input), expiry: overrides.expiry ?? null }
}

function seed(suppliers: Row[], options: { tmps?: number; scorecards?: Row[] } = {}) {
  const tmps = options.tmps ?? suppliers.reduce((sum, s) => sum + Number(s.value_ex_vat), 0)
  const result = calculateProcurementResults({
    totals: aggregateCategoryTotals(suppliers as unknown as ReturnType<typeof calculateSupplierRow>[]),
    totalMeasuredSpend: tmps,
  })
  tables = {
    procurement_assessments: [
      {
        id: 'p1',
        company_id: COMPANY.id,
        company: COMPANY,
        assessment_year: 2025,
        created_at: '2026-01-01T00:00:00Z',
        total_measured_procurement_spend: tmps,
        total_score: result.totalScore,
        tmps_denominator_source: 'import_supplier_total',
      },
    ],
    procurement_suppliers: suppliers,
    procurement_results: toProcurementResultsRows('p1', result),
    scorecard_assessments: options.scorecards ?? [],
  }
}

async function render() {
  return renderToStaticMarkup(await ProcurementAssessmentDetailsPage({ params: Promise.resolve({ id: 'p1' }) }))
}

// Total spend well above the suppliers', so every line has a gap to show.
beforeEach(() => seed([supplier(0), supplier(1), supplier(2)], { tmps: 30_000 }))

describe('procurement score page', () => {
  it('shows points out of 25 with the bonus apart, the biggest gap, and the next steps', async () => {
    const html = await render()
    expect(html).toContain('/ 25 points')
    expect(html).toMatch(/\+ [\d.]+<\/strong> bonus/)
    expect(html).toContain('The biggest gap is')
    expect(html).toContain('Continue to full scorecard')
    expect(html).toContain('name="procurementAssessmentId" value="p1"')
    expect(html).toContain('Download report')
    expect(html).toContain('Open the printable report')
    expect(html).not.toContain('Incomplete')
    expect(mismatchedButtons(html)).toEqual([])
  })

  it('writes the score in the same words in the header and under "What this means"', async () => {
    const words = new RegExp(`[\\d.]+ of ${PROCUREMENT_BASE_CAP} points, bonus [\\d.]+ of ${PROCUREMENT_BONUS_CAP}\\.`)
    const html = await render()
    expect(html).toMatch(new RegExp(`For Acme Holdings\\. ${words.source}`))
    expect(html.slice(html.indexOf('What this means'))).toMatch(new RegExp(`This company scored ${words.source}`))
    expect(html).not.toMatch(/out of 29 procurement points/)
  })

  it('has one expandable row per indicator that lists its suppliers by spend', async () => {
    const html = await render()
    expect(html.match(/aria-expanded="false" aria-controls="/g)?.length).toBeGreaterThanOrEqual(6)
    expect(html).toContain('Their share')
    expect(html).toContain('All B-BBEE suppliers')
    expect(html).toContain('Bonus: black designated group suppliers')
    expect(html).toContain('No supplier counts towards this indicator yet.')
    // Largest spend first inside the all-suppliers indicator.
    const line = html.slice(html.indexOf('suppliers count towards this indicator'))
    expect(line.indexOf('Supplier 2')).toBeLessThan(line.indexOf('Supplier 0'))
  })

  it('keeps the uncapped figure and the formula behind "How is this calculated?"', async () => {
    const html = await render()
    expect(html).toContain('How is this calculated?')
    expect(html).toContain('of 29, the figure in the table below')
    expect(html).toContain('below 50% of the target')
  })

  it('says amber what holds the score back, and marks it Incomplete while problems remain', async () => {
    seed([
      supplier(0, { level: 'Non-Compliant', expiry: '2024-01-31' }),
      supplier(1, { level: '2', expiry: '2024-06-30' }),
      supplier(2, { level: '' }),
      supplier(3),
    ])
    const html = await render()
    expect(html).toContain('Incomplete')
    expect(html).toContain('What is holding the score back')
    expect(html).toContain('1 supplier isn’t counting because its certificate expired')
    expect(html).toContain('1 supplier isn’t counting because it has no B-BBEE level')
    expect(html).toContain('1 supplier still counts although its certificate expired')
    expect(html).toContain('Fix the supplier list')
  })

  it('says plainly that the QSE procurement scorecard is not in the app yet for a QSE', async () => {
    seed([supplier(0)], {
      scorecards: [{ id: 'f1', company_id: COMPANY.id, applicability_snapshot: { annualRevenue: 30_000_000, isStartUp: false } }],
    })
    const html = await render()
    expect(html).toContain('The QSE procurement scorecard is not in the app yet')
    expect(html).toContain('use it as a guide only')
  })

  it('opens the full scorecard it is already attached to instead of making another', async () => {
    seed([supplier(0)], { scorecards: [{ id: 'f9', company_id: COMPANY.id, procurement_assessment_id: 'p1' }] })
    const html = await render()
    expect(html).toContain('href="/scorecards/calculator/f9/generic"')
    expect(html).toContain('Open the full scorecard')
    expect(html).not.toContain('Continue to full scorecard')
  })

  it('compares with the previous scorecard in points of 25, with no procurement rating', async () => {
    tables.procurement_assessments.push({
      id: 'p0',
      company_id: COMPANY.id,
      company: COMPANY,
      assessment_year: 2024,
      created_at: '2025-01-01T00:00:00Z',
      total_measured_procurement_spend: 30_000,
      total_score: 0,
    })
    // Last year: nothing scored on any line.
    tables.procurement_results.push(
      ...(tables.procurement_results as Row[])
        .filter((r) => r.assessment_id === 'p1')
        .map((r) => ({ ...r, assessment_id: 'p0', points_achieved: 0, achieved_percent: 0, numerator_value: 0 })),
    )
    const html = await render()
    expect(html).toContain('Compared to previous assessment')
    expect(html).toMatch(new RegExp(`Procurement points went up from 0\\.00 to [\\d.]+ of ${PROCUREMENT_BASE_CAP}\\.`))
    expect(html).not.toContain('Procurement rating')
  })

  it('lets the keyboard reach every table that scrolls sideways, and uses full text colours (axe)', async () => {
    const html = await render()
    expect(sidewaysScrollers(html).length).toBeGreaterThanOrEqual(3)
    expect(unreachableScrollers(html)).toEqual([])
    expect(fadedTextClasses(html)).toEqual([])
  })

  it('has a plain empty state when there is no score yet', async () => {
    seed([])
    tables.procurement_results = []
    const html = await render()
    expect(html).toContain('This procurement scorecard has no score yet')
    expect(html).toContain('Add suppliers and total spend')
  })

  it('reads and shows 8,000 suppliers without rendering them all', async () => {
    seed(Array.from({ length: 8000 }, (_, i) => supplier(i)))
    const started = performance.now()
    const html = await render()
    const elapsed = performance.now() - started
    expect(html).toContain('Suppliers 1 to 100 of 8000')
    expect(html).toContain('The 50 largest of 8000 suppliers that count towards this indicator')
    expect(elapsed).toBeLessThan(5000)
  })
})
