import { describe, expect, it } from 'vitest'
import { homeCompanyRow } from '../home'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'

const company = { id: 'c1', name: 'Mokoena Logistics', annual_turnover: '30000000', black_ownership_percentage: '40', updated_at: '2026-10-01T00:00:00Z' }

function preview(statuses: string[], failed = false): GenericScorecardCalculation {
  return {
    elements: statuses.map((status, i) => ({ elementKey: `e${i}`, status })),
    prioritySubminimums: [{ elementKey: 'e0', evaluated: failed, passed: failed ? false : null }],
  } as unknown as GenericScorecardCalculation
}

describe('a company on Home', () => {
  it('shows "In progress" with how many of the seven areas are done', () => {
    const row = homeCompanyRow({
      company,
      full: { id: 's1', updated_at: '2026-10-05T00:00:00Z', needs_recalculation: true, overall_result_snapshot: null, preview: preview(['scored', 'scored', 'scored', 'scored', 'scored', 'partial', 'not_started']) },
      procurement: null,
    })
    expect(row).toMatchObject({ size: 'QSE', status: 'In progress', progress: '5 of 7 areas done', action: { label: 'Continue', href: '/scorecards/calculator/s1/generic' } })
    expect(row.updatedAt).toBe('2026-10-05T00:00:00Z')
  })

  it('shows the final level and View result once it is calculated and final', () => {
    const row = homeCompanyRow({
      company,
      full: {
        id: 's1',
        updated_at: null,
        needs_recalculation: false,
        overall_result_snapshot: { readiness: { complete: true }, finalLevel: { level: 'Level 4', recognitionPercentage: 100 } },
        preview: preview(Array(7).fill('scored')),
      },
      procurement: null,
    })
    expect(row).toMatchObject({ status: 'Level 4', tone: 'ok', action: { label: 'View result' } })
  })

  it('flags a company that needs attention, and says why', () => {
    const row = homeCompanyRow({ company, full: { id: 's1', updated_at: null, needs_recalculation: false, overall_result_snapshot: null, preview: preview(['partial'], true) }, procurement: null })
    expect(row).toMatchObject({ needsAttention: true, attentionReason: 'An area is below its minimum' })
  })

  it('offers the next step for a company with nothing started, and says nothing about size it does not know', () => {
    const row = homeCompanyRow({ company: { id: 'c2', name: 'New Co' }, full: null, procurement: null })
    expect(row).toMatchObject({ size: null, status: 'Not started', action: { href: '/start?companyId=c2' } })
  })
})
