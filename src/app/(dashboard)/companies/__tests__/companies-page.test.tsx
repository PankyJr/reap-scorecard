import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PROCUREMENT_CATEGORIES } from '@/lib/procurement/config'
import { PROCUREMENT_BASE_CAP } from '@/lib/scorecard/generic/elements/procurement'
import { fakeSupabase, type FakeTables } from '@/test-utils/fake-supabase'

const ALL_SIX = PROCUREMENT_CATEGORIES.reduce((sum, c) => sum + c.availablePoints, 0)

const tables: FakeTables = {
  companies: [{ id: 'c1', name: 'Acme Holdings', industry: null, created_at: '2026-01-01T00:00:00Z', owner_id: 'owner' }],
  scorecard_assessments: [],
  procurement_assessments: [
    { id: 'p1', company_id: 'c1', assessment_year: 2025, total_score: ALL_SIX, created_at: '2026-10-01T00:00:00Z' },
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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/companies',
  useSearchParams: () => new URLSearchParams(),
}))

import CompaniesPage from '../page'

describe('companies list', () => {
  it('shows the latest procurement scorecard as base points out of the cap, not "/ 29"', async () => {
    const html = renderToStaticMarkup(await CompaniesPage({ searchParams: Promise.resolve({}) }))
    expect(html).toContain(`Procurement: ${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points`)
    expect(html).not.toContain(`/ ${ALL_SIX}`)
  })
})
