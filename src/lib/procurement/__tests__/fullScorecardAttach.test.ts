import { describe, expect, it } from 'vitest'
import { attachProcurementSnapshot, buildProcurementSnapshot } from '../fullScorecardAttach'
import type { ServerSupabase } from '@/lib/scorecard/assessmentAudit'

/**
 * A stand-in for the Supabase client that behaves like the hosted API: a
 * select returns at most 1,000 rows unless a smaller range is asked for.
 */
const API_MAX_ROWS = 1000

type Row = Record<string, unknown>

function fakeSupabase(tables: Record<string, Row[]>) {
  const writes: { table: string; op: string; payload: unknown; filters: [string, unknown][] }[] = []
  class Query implements PromiseLike<{ data: unknown; error: null }> {
    private filters: [string, unknown][] = []
    private rangeFrom = 0
    private rangeTo = Number.POSITIVE_INFINITY
    private single = false
    private op: 'select' | 'update' | 'insert' = 'select'
    private payload: unknown = null
    constructor(private table: string) {}
    select() {
      return this
    }
    update(payload: unknown) {
      this.op = 'update'
      this.payload = payload
      return this
    }
    insert(payload: unknown) {
      this.op = 'insert'
      this.payload = payload
      return this
    }
    eq(column: string, value: unknown) {
      this.filters.push([column, value])
      return this
    }
    order() {
      return this
    }
    range(from: number, to: number) {
      this.rangeFrom = from
      this.rangeTo = to
      return this
    }
    maybeSingle() {
      this.single = true
      return this
    }
    then<A, B>(resolve?: ((value: { data: unknown; error: null }) => A) | null, reject?: ((reason: unknown) => B) | null) {
      if (this.op !== 'select') {
        writes.push({ table: this.table, op: this.op, payload: this.payload, filters: this.filters })
        return Promise.resolve({ data: null, error: null }).then(resolve, reject)
      }
      const matching = (tables[this.table] ?? []).filter((row) => this.filters.every(([c, v]) => row[c] === v))
      const data = this.single
        ? (matching[0] ?? null)
        : matching.slice(this.rangeFrom, Math.min(this.rangeTo + 1, this.rangeFrom + API_MAX_ROWS))
      return Promise.resolve({ data, error: null }).then(resolve, reject)
    }
  }
  return { client: { from: (table: string) => new Query(table) } as unknown as ServerSupabase, writes }
}

const SOURCE_ID = 'p-1'

function suppliers(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s-${String(i).padStart(5, '0')}`,
    assessment_id: SOURCE_ID,
    bbbee_spend: 100,
    eme_amount: i % 2 === 0 ? 100 : 0,
    qse_amount: 0,
    black_owned_amount: 100,
    black_women_amount: 0,
    bdgs_amount: 0,
    is_51_percent_flow_through: i === 2499,
  }))
}

describe('buildProcurementSnapshot', () => {
  it('freezes the recognised spend of every supplier, not just the first 1,000', async () => {
    const { client } = fakeSupabase({
      procurement_assessments: [{ id: SOURCE_ID, assessment_year: 2026, total_measured_procurement_spend: 1_000_000, total_score: 10 }],
      procurement_suppliers: suppliers(2500),
    })
    const snapshot = await buildProcurementSnapshot(client, SOURCE_ID, 'user-1')
    expect(snapshot?.recognisedSpend['preferential_procurement.all_empowering_suppliers']).toBe(250_000)
    expect(snapshot?.recognisedSpend['preferential_procurement.eme']).toBe(125_000)
    // The last supplier (row 2,500) is the only flow-through one.
    expect(snapshot?.flowThroughApplied).toBe(true)
    expect(snapshot?.totalMeasuredProcurementSpend).toBe(1_000_000)
    expect(snapshot?.sourceAssessmentName).toBe('Formal Procurement Assessment 2026')
  })

  it('returns null when the procurement scorecard cannot be read', async () => {
    const { client } = fakeSupabase({ procurement_assessments: [], procurement_suppliers: [] })
    expect(await buildProcurementSnapshot(client, 'missing', 'user-1')).toBeNull()
  })
})

describe('attachProcurementSnapshot', () => {
  it('stores the snapshot, records the attach and marks procurement for recalculation', async () => {
    const { client, writes } = fakeSupabase({
      procurement_assessments: [{ id: SOURCE_ID, assessment_year: 2026, total_measured_procurement_spend: 1000, total_score: 1 }],
      procurement_suppliers: suppliers(3),
    })
    const snapshot = await buildProcurementSnapshot(client, SOURCE_ID, 'user-1')
    await attachProcurementSnapshot({
      supabase: client,
      assessmentId: 'full-1',
      sourceId: SOURCE_ID,
      snapshot: snapshot!,
      userId: 'user-1',
      replacing: false,
      previousSourceId: null,
    })
    expect(writes.map((w) => [w.table, w.op])).toEqual([
      ['scorecard_assessments', 'update'],
      ['scorecard_assessment_audit_log', 'insert'],
      ['scorecard_assessment_elements', 'update'],
      ['scorecard_assessments', 'update'],
    ])
    expect(writes[0].payload).toMatchObject({ procurement_assessment_id: SOURCE_ID })
    expect(writes[1].payload).toMatchObject({ action: 'procurement.snapshot_attached', element_key: 'preferential_procurement' })
  })
})
