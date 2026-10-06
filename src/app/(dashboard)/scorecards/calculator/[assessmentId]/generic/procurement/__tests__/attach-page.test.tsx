import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PROCUREMENT_CATEGORIES } from '@/lib/procurement/config'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'
import { DEFAULT_RULE_SET_KEY, getRuleSet } from '@/lib/scorecard/rules/registry'
import { fakeSupabase, type FakeTables } from '@/test-utils/fake-supabase'

const ALL_SIX = PROCUREMENT_CATEGORIES.reduce((sum, c) => sum + c.availablePoints, 0)

const tables: FakeTables = {
  procurement_assessments: [
    { id: 'p1', company_id: 'c1', assessment_year: 2025, status: 'complete', total_score: ALL_SIX, total_measured_procurement_spend: 1000 },
    { id: 'p0', company_id: 'c1', assessment_year: 2024, status: 'complete', total_score: '12.5', total_measured_procurement_spend: null },
  ],
  // p1: every line at its full points (the six add up past the cap). p0: no line results saved.
  procurement_results: PROCUREMENT_CATEGORIES.map((c) => ({
    assessment_id: 'p1',
    category_key: c.key,
    points_achieved: c.availablePoints,
  })),
}

vi.mock('@/utils/supabase/server', () => ({ createClient: async () => fakeSupabase(() => tables) }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
  redirect: () => {
    throw new Error('REDIRECT')
  },
}))
vi.mock('../../actions', () => ({ attachProcurementAssessment: vi.fn(), detachProcurementAssessment: vi.fn() }))
vi.mock('../../load', () => ({
  loadGenericAssessment: async () => ({
    assessment: { id: 'a1', name: 'Acme 2025 B-BBEE scorecard' },
    company: { id: 'c1', name: 'Acme Holdings' },
    preview: { ruleSet: getRuleSet(DEFAULT_RULE_SET_KEY) },
    inputs: { procurementSnapshot: null },
  }),
}))
vi.mock('../../workflow-context', () => ({ workflowForLoaded: () => ({}), workspaceFor: () => ({}) }))
vi.mock('../../workspace', () => ({ AreaIntro: () => null }))
vi.mock('../../ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../ui')>()),
  Shell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

import ProcurementPage from '../page'

async function render() {
  const html = renderToStaticMarkup(
    await ProcurementPage({ params: Promise.resolve({ assessmentId: 'a1' }), searchParams: Promise.resolve({}) }),
  )
  return html.replace(/<[^>]+>/g, ' ').replace(/&ldquo;|&rdquo;|“|”/g, '"').replace(/&rsquo;/g, '’').replace(/\s+/g, ' ')
}

describe('attaching a procurement scorecard to the full scorecard', () => {
  it('lists each procurement scorecard as base points of the cap with the bonus apart', async () => {
    const text = await render()
    expect(text).toContain(
      `2025: ${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points, bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`,
    )
    // No line results saved: the stored total, with no maximum.
    expect(text).toContain('2024: 12.50 points')
    expect(text).not.toContain(`of ${ALL_SIX} points`)
  })

  it('explains, in plain words and from the rule set, that both scorecards count the base and bonus the same way', async () => {
    const text = await render()
    expect(text).toContain('How procurement points count here')
    expect(text).not.toContain('Why 29 points there')
    expect(text).toContain(`The scorecard counts at most ${PROCUREMENT_BASE_CAP} of those`)
    expect(text).toContain(`"X of ${PROCUREMENT_BASE_CAP} points, bonus Y of ${PROCUREMENT_BONUS_CAP}"`)
    const rule = getRuleSet(DEFAULT_RULE_SET_KEY).prioritySubminimums.find((r) => r.elementKey === 'preferential_procurement')!
    expect(text).toMatch(
      new RegExp(`priority sub-minimum \\?? ?for this area is ${Math.round(rule.fraction * 100)}% of ${rule.basisPoints} points`),
    )
  })
})
