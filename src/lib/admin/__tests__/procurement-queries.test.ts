import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROCUREMENT_CATEGORIES } from '@/lib/procurement/config'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'
import { fakeSupabase, type FakeTables } from '@/test-utils/fake-supabase'

let tables: FakeTables = {}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleSupabase: () => fakeSupabase(() => tables) }))

import { fetchAdminCompanyDetail, fetchAdminProcurementPage } from '../queries'

const ALL_SIX = PROCUREMENT_CATEGORIES.reduce((sum, c) => sum + c.availablePoints, 0)
const CAPPED = `${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points, bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`

beforeEach(() => {
  tables = {
    companies: [{ id: 'c1', name: 'Acme Holdings', owner_id: null }],
    procurement_assessments: [
      {
        id: 'p1',
        company_id: 'c1',
        assessment_year: 2025,
        total_score: ALL_SIX,
        total_measured_procurement_spend: 1000,
        created_at: '2026-10-01T00:00:00Z',
        company: { name: 'Acme Holdings' },
      },
    ],
    // Every line at its full points: the six add up past the cap.
    procurement_results: PROCUREMENT_CATEGORIES.map((c) => ({
      assessment_id: 'p1',
      category_key: c.key,
      points_achieved: c.availablePoints,
    })),
    procurement_suppliers: [],
  }
})

describe('admin procurement views', () => {
  it('list each assessment as base points of the cap with the bonus apart, and no placeholder level', async () => {
    const { rows } = await fetchAdminProcurementPage({ page: 1, pageSize: 25, search: '' })
    expect(rows).toHaveLength(1)
    expect(rows[0].points_display).toBe(CAPPED)
    expect(rows[0]).not.toHaveProperty('level')
  })

  it('show a company’s assessments the same way, with the base alone and the bonus for the small card', async () => {
    const detail = await fetchAdminCompanyDetail('c1')
    const p = detail!.procurementAssessments[0]
    expect(p.points_display).toBe(CAPPED)
    expect(p.base_points_display).toBe(`${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points`)
    expect(p.bonus_display).toBe(`bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`)
    expect(p).not.toHaveProperty('level')
  })

  it('count every supplier in the recognised spend, past the 1,000 rows one read returns', async () => {
    // 2,500 suppliers with R1 recognised each, against R2,500 total spend: 100%.
    tables.procurement_assessments[0].total_measured_procurement_spend = 2500
    tables.procurement_suppliers = Array.from({ length: 2500 }, (_, i) => ({
      id: `s${String(i).padStart(5, '0')}`,
      assessment_id: 'p1',
      bbbee_spend: 1,
    }))
    const { rows } = await fetchAdminProcurementPage({ page: 1, pageSize: 25, search: '' })
    expect(rows[0].recognised_pct_display).toBe('100.00%')
    const detail = await fetchAdminCompanyDetail('c1')
    expect(detail!.procurementAssessments[0].recognised_display).toBe('100.00%')
  })

  it('fall back to the stored total as plain points when no line results are saved', async () => {
    tables.procurement_results = []
    const { rows } = await fetchAdminProcurementPage({ page: 1, pageSize: 25, search: '' })
    expect(rows[0].points_display).toBe(`${ALL_SIX.toFixed(2)} points`)
  })
})
