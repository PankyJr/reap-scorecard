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

import { saveApplicability, saveOwnership } from '../actions'

const assessmentId = '00000000-0000-4000-8000-0000000000a1'
const userId = '00000000-0000-4000-8000-0000000000a3'

let updates: Array<{ table: string; payload: Record<string, unknown> }>

/** Just enough of the database for the two save actions: owner checks pass, writes are recorded. */
class Query {
  private op: 'select' | 'update' | 'insert' = 'select'
  private payload: Record<string, unknown> = {}
  constructor(private table: string) {}
  select() {
    return this
  }
  update(payload: Record<string, unknown>) {
    this.op = 'update'
    this.payload = payload
    return this
  }
  insert() {
    this.op = 'insert'
    return this
  }
  eq() {
    return this
  }
  async maybeSingle() {
    if (this.table === 'scorecard_assessments') {
      return { data: { id: assessmentId, company_id: 'c1', applicability_snapshot: null }, error: null }
    }
    if (this.table === 'companies') return { data: { id: 'c1', owner_id: userId }, error: null }
    return { data: null, error: null }
  }
  then(resolve: (value: { data: null; error: null }) => void) {
    if (this.op === 'update') updates.push({ table: this.table, payload: this.payload })
    resolve({ data: null, error: null })
  }
}

function form(values: Record<string, string>) {
  const fd = new FormData()
  fd.set('assessmentId', assessmentId)
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

async function run(action: (fd: FormData) => Promise<unknown>, values: Record<string, string>) {
  await action(form(values)).catch((e: Error) => {
    if (!e.message.startsWith('REDIRECT:')) throw e
  })
}

describe('percentages typed on the full-scorecard screens are read as percentages', () => {
  beforeEach(() => {
    updates = []
    mocks.createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
      from: (table: string) => new Query(table),
    })
  })

  // The defect: a value of 1 or less was taken to be a fraction already, so
  // "1" (meaning 1%) was stored as 100% black owned — enough to make a QSE
  // look 100% black owned and give it an automatic Level 1.
  it('stores 1% black ownership as 1%, not 100%', async () => {
    await run(saveApplicability, { blackOwnershipPercentage: '1', blackWomenOwnershipPercentage: '0.5' })
    const snapshot = updates.find((u) => u.table === 'scorecard_assessments')?.payload.applicability_snapshot as Record<string, number>
    expect(snapshot.blackOwnershipPercentage).toBeCloseTo(0.01, 10)
    expect(snapshot.blackWomenOwnershipPercentage).toBeCloseTo(0.005, 10)
  })

  it('still stores ordinary percentages the same way', async () => {
    await run(saveApplicability, { blackOwnershipPercentage: '51' })
    const snapshot = updates.find((u) => u.table === 'scorecard_assessments')?.payload.applicability_snapshot as Record<string, number>
    expect(snapshot.blackOwnershipPercentage).toBeCloseTo(0.51, 10)
  })

  it('keeps an ownership figure under 1% under 1% when it is saved again', async () => {
    await run(saveOwnership, { newEntrantsEconomicInterestPercentage: '0.8', netValuePercentage: '15' })
    const inputs = updates.find((u) => u.table === 'scorecard_assessments')?.payload.ownership_inputs as Record<string, number>
    expect(inputs.newEntrantsEconomicInterestPercentage).toBeCloseTo(0.008, 10)
    expect(inputs.netValuePercentage).toBeCloseTo(0.15, 10)
  })
})
