import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const companies = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Acme Manufacturing' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Beta Logistics' },
]

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`)
  },
}))
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: companies }) }) }) }),
  }),
}))
vi.mock('../actions', () => ({ createScorecard: vi.fn() }))
vi.mock('../NewScorecardForm', () => ({ NewScorecardForm: () => null }))

import LegacyScorecardNewPage from '../LegacyScorecardNewPage'

describe('manual scorecard without a company', () => {
  it('offers the person their companies instead of a dead end', async () => {
    const html = renderToStaticMarkup(await LegacyScorecardNewPage({ searchParams: Promise.resolve({}) }))
    for (const c of companies) {
      expect(html).toContain(c.name)
      expect(html).toContain(`/scorecards/new?legacy=1&amp;companyId=${c.id}`)
    }
    expect(html).not.toMatch(/start a new scorecard from there/i)
  })
})
