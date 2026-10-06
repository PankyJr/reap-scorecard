import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PROCUREMENT_CATEGORIES } from '@/lib/procurement/config'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'
import { fakeSupabase, type FakeTables } from '@/test-utils/fake-supabase'

const ALL_SIX = PROCUREMENT_CATEGORIES.reduce((sum, c) => sum + c.availablePoints, 0)

const tables: FakeTables = {
  procurement_assessments: [
    {
      id: 'p1',
      company_id: 'c1',
      assessment_year: 2025,
      total_score: ALL_SIX,
      created_at: '2026-10-01T00:00:00Z',
      companies: { id: 'c1', name: 'Acme Holdings', owner_id: 'owner' },
    },
  ],
  // Every line at its full points: the six add up past the cap.
  procurement_results: PROCUREMENT_CATEGORIES.map((c) => ({
    assessment_id: 'p1',
    category_key: c.key,
    points_achieved: c.availablePoints,
  })),
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    ...fakeSupabase(() => tables),
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  }),
}))
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('REDIRECT')
  },
}))

import ProcurementListPage from '../page'

describe('procurement scorecards list', () => {
  it('shows each scorecard as base points out of the cap with the bonus apart', async () => {
    const html = renderToStaticMarkup(await ProcurementListPage())
    expect(html).toContain(
      `${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points, bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`,
    )
    expect(html).not.toContain(`of ${ALL_SIX} points`)
  })
})
