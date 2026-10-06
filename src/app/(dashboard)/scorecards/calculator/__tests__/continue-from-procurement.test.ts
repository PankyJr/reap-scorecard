import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((url: string): never => {
    throw new Error(`REDIRECT:${url}`)
  }),
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('server-only', () => ({}))

import { createGenericScorecardAssessment } from '../actions'

const USER = 'user-1'
const COMPANY = 'company-1'
const PROCUREMENT = 'procurement-1'
const NEW_ID = '00000000-0000-4000-8000-0000000000aa'

type Row = Record<string, unknown>
type Write = { table: string; op: 'insert' | 'update' | 'delete'; payload: unknown; filters: [string, unknown][] }

let tables: Record<string, Row[]>
let writes: Write[]

class Query {
  private filters: [string, unknown][] = []
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: unknown = null
  private isSingle = false
  private from = 0
  private to = Number.POSITIVE_INFINITY
  constructor(private table: string) {}
  select() {
    return this
  }
  insert(payload: unknown) {
    this.op = 'insert'
    this.payload = payload
    return this
  }
  update(payload: unknown) {
    this.op = 'update'
    this.payload = payload
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }
  /** Only used for last year's scorecard (none in these tests). */
  lt() {
    this.filters.push(['__never__', true])
    return this
  }
  order() {
    return this
  }
  limit() {
    return this
  }
  range(from: number, to: number) {
    this.from = from
    this.to = to
    return this
  }
  maybeSingle() {
    this.isSingle = true
    return this
  }
  single() {
    this.isSingle = true
    return this
  }
  then(resolve?: (value: { data: unknown; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
    if (this.op !== 'select') {
      writes.push({ table: this.table, op: this.op, payload: this.payload, filters: this.filters })
      const data = this.op === 'insert' && this.isSingle ? { id: NEW_ID } : null
      return Promise.resolve({ data, error: null }).then(resolve, reject)
    }
    const matching = (tables[this.table] ?? []).filter((row) => this.filters.every(([c, v]) => row[c] === v))
    const data = this.isSingle ? (matching[0] ?? null) : matching.slice(this.from, Math.min(this.to + 1, this.from + 1000))
    return Promise.resolve({ data, error: null }).then(resolve, reject)
  }
}

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

const continueForm = () =>
  form({ companyId: COMPANY, name: 'Acme 2026 B-BBEE scorecard', measurementYear: '2026', procurementAssessmentId: PROCUREMENT })

beforeEach(() => {
  writes = []
  tables = {
    companies: [{ id: COMPANY, name: 'Acme', owner_id: USER }],
    procurement_assessments: [
      { id: PROCUREMENT, company_id: COMPANY, assessment_year: 2026, total_measured_procurement_spend: 1000, total_score: 3 },
    ],
    procurement_suppliers: [
      { id: 's1', assessment_id: PROCUREMENT, bbbee_spend: 400, eme_amount: 0, qse_amount: 400, black_owned_amount: 400, black_women_amount: 0, bdgs_amount: 0, is_51_percent_flow_through: false },
    ],
    scorecard_assessments: [],
    eap_target_sets: [],
  }
  mocks.redirect.mockClear()
  mocks.createClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: USER } } }) },
    from: (table: string) => new Query(table),
  })
})

describe('Continue to full scorecard', () => {
  it('creates a full scorecard with the procurement scorecard attached and lands on it', async () => {
    await expect(createGenericScorecardAssessment(continueForm())).rejects.toThrow(
      `REDIRECT:/scorecards/calculator/${NEW_ID}/generic?attached=1`,
    )
    const created = writes.find((w) => w.table === 'scorecard_assessments' && w.op === 'insert')
    expect(created?.payload).toMatchObject({ company_id: COMPANY, measurement_year: 2026, status: 'draft' })
    expect(writes.some((w) => w.table === 'scorecard_assessment_elements' && w.op === 'insert')).toBe(true)
    const attach = writes.find(
      (w) => w.table === 'scorecard_assessments' && w.op === 'update' && (w.payload as Row).procurement_assessment_id,
    )
    expect(attach?.filters).toEqual([['id', NEW_ID]])
    const snapshot = (attach?.payload as { procurement_snapshot: { recognisedSpend: Record<string, number> } }).procurement_snapshot
    expect(snapshot.recognisedSpend['preferential_procurement.all_empowering_suppliers']).toBe(400)
    const audit = writes.find((w) => w.table === 'scorecard_assessment_audit_log')
    expect(audit?.payload).toMatchObject({ action: 'procurement.snapshot_attached' })
  })

  it('opens the existing full scorecard on a second press instead of making another', async () => {
    tables.scorecard_assessments = [{ id: 'existing-full', company_id: COMPANY, procurement_assessment_id: PROCUREMENT }]
    await expect(createGenericScorecardAssessment(continueForm())).rejects.toThrow(
      'REDIRECT:/scorecards/calculator/existing-full/generic?attached=1',
    )
    expect(writes).toEqual([])
  })

  it('refuses a procurement scorecard from another company', async () => {
    tables.procurement_assessments[0].company_id = 'someone-else'
    await expect(createGenericScorecardAssessment(continueForm())).rejects.toThrow(
      /^REDIRECT:\/procurement\/assessments\/procurement-1\?error=/,
    )
    expect(writes).toEqual([])
  })

  it('without a procurement scorecard still goes to the workbook upload as before', async () => {
    await expect(
      createGenericScorecardAssessment(form({ companyId: COMPANY, name: 'Acme', measurementYear: '2026' })),
    ).rejects.toThrow(`REDIRECT:/scorecards/calculator/${NEW_ID}/generic`)
    expect(writes.some((w) => w.table === 'scorecard_assessment_audit_log')).toBe(false)
  })
})
