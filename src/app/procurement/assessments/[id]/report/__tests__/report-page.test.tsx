import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateSupplierRow, type ProcurementSupplierInput } from '@/lib/procurement/rows'
import { aggregateCategoryTotals, calculateProcurementResults, toProcurementResultsRows } from '@/lib/procurement/assessment'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'
import { fakeSupabase, type FakeTables } from '@/test-utils/fake-supabase'
import { fadedTextClasses, sidewaysScrollers, unreachableScrollers } from '@/test-utils/a11y-markup'

let tables: FakeTables = {}

vi.mock('@/lib/admin/tenant-read-context', () => ({
  resolveTenantReadContext: async () => ({
    user: { id: 'owner' },
    db: fakeSupabase(() => tables),
    isReapInternalAdmin: false,
  }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/procurement/assessments/p1/report',
}))

import ProcurementReportPage from '../page'

const COMPANY = { id: 'c1', name: 'Acme Holdings', owner_id: 'owner' }

function supplier(i: number, input: Partial<ProcurementSupplierInput>) {
  const full: ProcurementSupplierInput = {
    supplier_name: `Supplier ${i}`,
    supplier_type: 'Generic',
    level: '4',
    value_ex_vat: 100,
    is_51_black_owned: false,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    is_51_percent_flow_through: false,
    ...input,
  }
  return { id: `s${i}`, assessment_id: 'p1', ...calculateSupplierRow(full) }
}

/** Every line full: the five base lines add up past the cap, and the bonus line is full too. */
function seedFullMarks() {
  const suppliers = [
    supplier(0, { supplier_type: 'QSE', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
    supplier(1, { supplier_type: 'EME', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
  ]
  const result = calculateProcurementResults({ totals: aggregateCategoryTotals(suppliers), totalMeasuredSpend: 1000 })
  tables = {
    procurement_assessments: [
      {
        id: 'p1',
        company_id: COMPANY.id,
        company: COMPANY,
        assessment_year: 2025,
        created_at: '2026-01-01T00:00:00Z',
        total_measured_procurement_spend: 1000,
        total_score: result.totalScore,
      },
    ],
    procurement_suppliers: suppliers,
    procurement_results: toProcurementResultsRows('p1', result),
  }
  return result
}

async function render() {
  return renderToStaticMarkup(
    await ProcurementReportPage({ params: Promise.resolve({ id: 'p1' }), searchParams: Promise.resolve({}) }),
  )
}

const CAPPED = `${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points, bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`

beforeEach(() => {
  seedFullMarks()
})

describe('procurement report page', () => {
  it('"What this means" states the points as the score page does: base out of the cap, bonus apart', async () => {
    const html = await render()
    const section = html.slice(html.indexOf('What this means'))
    expect(section).toContain(`This company scored ${CAPPED}.`)
    expect(html).not.toMatch(/out of 29 procurement points/)
  })

  it('the summary tiles show base points out of the cap with the bonus apart, never "/ 29"', async () => {
    const html = await render()
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(text).toContain(`Procurement points ${PROCUREMENT_BASE_CAP}.00 / ${PROCUREMENT_BASE_CAP} points bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`)
    expect(text).toContain(`Procurement score ${PROCUREMENT_BASE_CAP}.00 / ${PROCUREMENT_BASE_CAP} points bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`)
    expect(text).not.toMatch(/\/ 29\b/)
    expect(text).not.toMatch(/\b29 pts\b/)
  })

  it('shows no procurement rating (its bands were placeholders); the biggest gap is stated instead', async () => {
    const html = await render()
    expect(html).not.toContain('Procurement rating')
    expect(html).not.toContain('Based on recognised B-BBEE procurement performance')
    expect(html).toContain('Every indicator has reached its target, so there is no gap to close.')
  })

  it('lets the keyboard reach every table that scrolls sideways, each named (axe scrollable-region-focusable)', async () => {
    const html = await render()
    expect(sidewaysScrollers(html).length).toBeGreaterThanOrEqual(3)
    expect(unreachableScrollers(html)).toEqual([])
    expect(html).toContain('aria-label="Recognised supplier breakdown, scrolls sideways"')
  })

  it('uses full text colours, never a faded one (axe color-contrast)', async () => {
    expect(fadedTextClasses(await render())).toEqual([])
  })

  it('says under the six-line table that its Total adds up all six, and what the scorecard counts', async () => {
    const html = await render()
    expect(html).toContain(`The Total row adds up all six indicators. The scorecard counts at most ${PROCUREMENT_BASE_CAP} base points`)
    expect(html).toContain(`so this company has ${CAPPED}.`)
  })
})
