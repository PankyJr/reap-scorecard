import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ resolveTenantReadContext: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))
vi.mock('@/lib/admin/tenant-read-context', () => ({
  resolveTenantReadContext: mocks.resolveTenantReadContext,
}))
vi.mock('../DeleteCompanyButton', () => ({ DeleteCompanyButton: () => null }))

import CompanyDetailsPage from '../page'

const companyId = '2079723c-5c30-486c-9d05-2082531b8118'
const userId = 'ac35b05a-71f8-47f4-881d-df2bbe5f9830'
const firstId = '397500f4-2474-41d0-9642-678f9cbc6c49'
const secondId = '11111111-2222-4333-8444-555555555555'

type Filter = { table: string; column: string; value: unknown }
let filters: Filter[]

const company = {
  id: companyId,
  owner_id: userId,
  name: 'Walkthrough Test',
  industry: 'Services',
  contact_person: null,
  email: null,
  phone: null,
  created_at: '2026-08-01T00:00:00.000Z',
  notes: null,
}

function assessment(overrides: Record<string, unknown> = {}) {
  return {
    id: firstId,
    name: 'Walkthrough Test 2026 Generic Scorecard',
    measurement_year: 2026,
    scope_mode: 'full',
    status: 'draft',
    preliminary_level: 'Level 8',
    final_level: null,
    needs_recalculation: false,
    updated_at: '2026-08-27T07:53:35.450Z',
    created_at: '2026-08-26T20:13:30.601Z',
    ...overrides,
  }
}

function makeDb(tables: Record<string, unknown>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? []
      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          filters.push({ table, column, value })
          return chain
        },
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        single: async () => ({ data: Array.isArray(rows) ? (rows[0] ?? null) : rows, error: null }),
        maybeSingle: async () => ({ data: Array.isArray(rows) ? (rows[0] ?? null) : rows, error: null }),
        then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(resolve),
      }
      return chain
    },
  }
}

async function render(scorecardAssessments: unknown[]) {
  mocks.resolveTenantReadContext.mockResolvedValue({
    user: { id: userId },
    isReapInternalAdmin: false,
    db: makeDb({
      companies: company,
      procurement_assessments: [],
      scorecard_assessments: scorecardAssessments,
    }),
  })
  const element = await CompanyDetailsPage({ params: Promise.resolve({ id: companyId }) })
  return renderToStaticMarkup(element)
}

beforeEach(() => {
  filters = []
  vi.clearAllMocks()
})

describe('company profile lists its generic scorecard assessments', () => {
  it('renders a link to the calculator for every assessment', async () => {
    const html = await render([
      assessment(),
      assessment({ id: secondId, name: 'Walkthrough Test 2025 Generic Scorecard', measurement_year: 2025 }),
    ])

    expect(html).toContain(`href="/scorecards/calculator/${firstId}/generic"`)
    expect(html).toContain(`href="/scorecards/calculator/${secondId}/generic"`)
    expect(html).toContain('Walkthrough Test 2026 Generic Scorecard')
    expect(html).toContain('Walkthrough Test 2025 Generic Scorecard')
    expect(html).toContain('Scorecard Assessments')
    expect(html.match(/Open Scorecard/g)).toHaveLength(2)
  })

  it('scopes the query to this company', async () => {
    await render([assessment()])
    expect(filters).toContainEqual({
      table: 'scorecard_assessments',
      column: 'company_id',
      value: companyId,
    })
  })

  it('marks an assessment whose level is stale, and only that one', async () => {
    const html = await render([
      assessment({ needs_recalculation: true }),
      assessment({ id: secondId, needs_recalculation: false }),
    ])
    expect(html.match(/Needs recalculation/g)).toHaveLength(1)
  })

  it('labels a preliminary level as preliminary and a final level as final', async () => {
    const preliminary = await render([assessment()])
    expect(preliminary).toContain('Preliminary Level')
    expect(preliminary).toContain('Level 8')

    const final = await render([assessment({ final_level: 'Level 4', preliminary_level: 'Level 8' })])
    expect(final).toContain('Final Level')
    expect(final).toContain('Level 4')
  })

  it('shows the empty state, matching the procurement wording, when there are none', async () => {
    const html = await render([])
    expect(html).toContain('No scorecard assessments yet')
    // React escapes the apostrophe, so match either form.
    expect(html).toMatch(
      /Create a scorecard assessment to start building this company(&#x27;|')s record\./,
    )
    expect(html).toContain(`href="/scorecards/new?companyId=${companyId}"`)
    expect(html).not.toContain('Open Scorecard')
  })
})
