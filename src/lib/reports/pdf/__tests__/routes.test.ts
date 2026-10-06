import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyseGenericScorecardWorkbook } from '@/lib/scorecard/generic/workbook-import'
import { calculateGenericScorecard, EMPTY_MANAGEMENT_CONTROL_INPUTS, EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '@/lib/scorecard/generic'
import { genericApplicability } from '@/lib/scorecard/generic/__tests__/fixtures'
import { scorecardPdfInput } from '../from-app'

const mocks = vi.hoisted(() => ({ load: vi.fn(), tenant: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/load', () => ({ loadGenericAssessment: mocks.load }))
vi.mock('@/lib/admin/tenant-read-context', () => ({ resolveTenantReadContext: mocks.tenant }))

import { GET as scorecardPdf } from '@/app/api/scorecards/calculator/[assessmentId]/pdf/route'
import { GET as procurementPdf } from '@/app/api/procurement/assessments/[id]/pdf/route'

const GOLDEN = resolve(process.cwd(), 'test-fixtures/golden/golden-populated-workbook.xlsx')

function goldenCalculation() {
  const buffer = readFileSync(GOLDEN)
  const analysis = analyseGenericScorecardWorkbook({ filename: 'golden.xlsx', buffer, fileSize: buffer.length })
  return calculateGenericScorecard({
    applicability: genericApplicability(),
    financial: analysis.financial,
    ownership: analysis.ownership,
    managementControl: { ...EMPTY_MANAGEMENT_CONTROL_INPUTS },
    skillsDevelopment: { ...EMPTY_SKILLS_DEVELOPMENT_INPUTS },
    procurementSnapshot: null,
    enterpriseDevelopment: { records: analysis.enterpriseDevelopmentContributions },
    supplierDevelopment: { records: analysis.supplierDevelopmentContributions },
    socioEconomicDevelopment: { records: analysis.socioEconomicDevelopmentContributions },
  })
}

const ctx = (id: string) => ({ params: Promise.resolve({ id, assessmentId: id }) })
const isPdf = async (res: Response) => Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString() === '%PDF-'

describe.skipIf(!existsSync(GOLDEN))('full scorecard PDF download', () => {
  beforeEach(() => mocks.load.mockReset())

  it('gives the owner a PDF of the saved calculation', async () => {
    mocks.load.mockResolvedValue({
      assessment: { name: 'FY2026 scorecard', measurement_year: 2026, overall_result_snapshot: goldenCalculation(), needs_recalculation: false },
      company: { id: 'c1', name: 'Golden Sample Manufacturing (Pty) Ltd' },
    })
    const res = await scorecardPdf(new Request('http://x'), ctx('a1') as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="reap-b-bbee-scorecard-golden-sample-manufacturing-pty-ltd-2026\.pdf"/)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(await isPdf(res)).toBe(true)
  })

  it('refuses anyone who does not own the scorecard', async () => {
    mocks.load.mockResolvedValue(null)
    expect((await scorecardPdf(new Request('http://x'), ctx('a1') as never)).status).toBe(404)
  })

  it('carries the engine’s figures into the PDF unchanged', () => {
    const calc = goldenCalculation()
    const input = scorecardPdfInput({ companyName: 'Co', assessmentName: 'FY2026', measurementYear: 2026, stored: calc, needsRecalculation: false, generatedAt: new Date() })
    expect(input.totalPoints).toBe(calc.totalBasePointsAchieved)
    expect(input.elements.find((e) => e.key === 'ownership')?.points).toBe(16.1)
    expect(input.priorityResults.find((p) => p.name === 'Supplier development')).toMatchObject({ met: false, requirement: 'At least 4.00 of 10 points' })
    expect(input.level.isFinal).toBe(false)
  })
})

describe('procurement PDF download', () => {
  const assessment = {
    id: 'p1',
    name: 'Procurement 2026',
    assessment_year: 2026,
    total_measured_procurement_spend: 1_000_000,
    company: { id: 'c1', name: 'Mokoena Logistics', owner_id: 'owner' },
  }
  function db(rowsFor: Record<string, unknown[]>, single: unknown) {
    const seen: string[] = []
    const client = {
      seen,
      from(table: string) {
        seen.push(table)
        const q = {
          select: () => q,
          eq: () => q,
          order: () => q,
          range: () => q,
          maybeSingle: async () => ({ data: single, error: null }),
          then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: rowsFor[table] ?? [], error: null }),
        }
        return q
      },
    }
    return client
  }

  it('gives the owner a PDF', async () => {
    const client = db(
      {
        procurement_suppliers: [{ supplier_name: 'Steel Co', level: '1', supplier_type: 'Generic', value_ex_vat: 450000, bbbee_spend: 607500, is_51_black_owned: true, is_30_black_women_owned: false, expiry: '2027-01-31' }],
        procurement_results: [{ category_key: 'all_bbbee_suppliers', category_name: 'All B-BBEE Suppliers', target_percent: 0.8, available_points: 5, achieved_percent: 0.6, points_achieved: 3.75, numerator_value: 607500, denominator_value: 1000000 }],
      },
      assessment,
    )
    mocks.tenant.mockResolvedValue({ user: { id: 'owner' }, db: client, isReapInternalAdmin: false })
    const res = await procurementPdf(new Request('http://x'), ctx('p1') as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(await isPdf(res)).toBe(true)
  })

  it('refuses another customer, without reading the suppliers', async () => {
    const client = db({}, assessment)
    mocks.tenant.mockResolvedValue({ user: { id: 'someone-else' }, db: client, isReapInternalAdmin: false })
    const res = await procurementPdf(new Request('http://x'), ctx('p1') as never)
    expect(res.status).toBe(404)
    expect(client.seen).toEqual(['procurement_assessments'])
  })

  it('lets a REAP administrator download it', async () => {
    mocks.tenant.mockResolvedValue({ user: { id: 'staff' }, db: db({}, assessment), isReapInternalAdmin: true })
    expect((await procurementPdf(new Request('http://x'), ctx('p1') as never)).status).toBe(200)
  })
})
