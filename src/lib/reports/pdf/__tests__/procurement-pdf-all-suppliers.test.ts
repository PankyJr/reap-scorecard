import { describe, expect, it, vi } from 'vitest'

// The database returns at most 1,000 rows per read. The 8,000-supplier run on
// staging found the procurement PDF held only the first 1,000 suppliers.
const captured = vi.hoisted(() => ({ suppliers: -1 }))
const mocks = vi.hoisted(() => ({ tenant: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/tenant-read-context', () => ({ resolveTenantReadContext: mocks.tenant }))
vi.mock('@/lib/reports/pdf/from-app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reports/pdf/from-app')>()
  return {
    ...actual,
    procurementPdfInput: (args: Parameters<typeof actual.procurementPdfInput>[0]) => {
      captured.suppliers = args.suppliers.length
      return actual.procurementPdfInput(args)
    },
  }
})

import { GET } from '@/app/api/procurement/assessments/[id]/pdf/route'

const MAX_ROWS_PER_READ = 1000
const suppliers = Array.from({ length: 2500 }, (_, i) => ({
  id: `s${String(i).padStart(5, '0')}`,
  supplier_name: `Supplier ${i}`,
  level: '2',
  supplier_type: 'QSE',
  value_ex_vat: 1000,
  bbbee_spend: 1250,
  is_51_black_owned: false,
  is_30_black_women_owned: false,
}))
const assessment = { id: 'p1', name: 'Procurement 2026', assessment_year: 2026, total_measured_procurement_spend: 2_500_000, company: { id: 'c1', name: 'Big Buyer', owner_id: 'owner' } }

/** A stand-in for the database that, like the real one, never returns more than 1,000 rows per read. */
function cappedDb() {
  return {
    from(table: string) {
      let range: [number, number] | null = null
      const rows = table === 'procurement_suppliers' ? suppliers : []
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        range: (from: number, to: number) => ((range = [from, to]), q),
        maybeSingle: async () => ({ data: assessment, error: null }),
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => {
          const [from, to] = range ?? [0, Number.MAX_SAFE_INTEGER]
          resolve({ data: rows.slice(from, Math.min(to + 1, from + MAX_ROWS_PER_READ)), error: null })
        },
      }
      return q
    },
  }
}

describe('procurement PDF', () => {
  it('includes every supplier, not only the first 1,000', async () => {
    mocks.tenant.mockResolvedValue({ user: { id: 'owner' }, db: cappedDb(), isReapInternalAdmin: false })
    const res = await GET(new Request('http://x'), { params: Promise.resolve({ id: 'p1' }) } as never)
    expect(res.status).toBe(200)
    expect(captured.suppliers).toBe(2500)
  })
})
