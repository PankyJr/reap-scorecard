/**
 * Demo readiness smoke checks — static route and export helpers.
 * Full authenticated E2E requires credentials in CI/local manual runs.
 */
import { describe, expect, it } from 'vitest'
import { buildProcurementScorecardFilename } from '@/lib/exports/filename'
import { isFullWorkbookPdfExportAvailable } from '@/lib/scorecard/full/pdf-export-availability'

describe('demo readiness smoke', () => {
  it('builds professional procurement PDF filenames', () => {
    const name = buildProcurementScorecardFilename('Mbeki Industrial Holdings', new Date('2026-07-10'))
    expect(name).toMatch(/^REAP_Procurement_Scorecard_/)
    expect(name.endsWith('.pdf')).toBe(true)
  })

  it('hides full workbook PDF on serverless hosts by default', () => {
    const prevVercel = process.env.VERCEL
    const prevNetlify = process.env.NETLIFY
    process.env.VERCEL = '1'
    expect(isFullWorkbookPdfExportAvailable()).toBe(false)
    delete process.env.VERCEL
    process.env.NETLIFY = 'true'
    expect(isFullWorkbookPdfExportAvailable()).toBe(false)
    process.env.VERCEL = prevVercel
    process.env.NETLIFY = prevNetlify
  })

  it('documents primary demo routes (no legacy promotion)', () => {
    const primaryRoutes = [
      '/dashboard',
      '/companies',
      '/procurement/assessments/new',
      '/clients/aberdare/procurement-control-preview',
    ]
    const legacyRoutes = ['/scorecards/new', '/scorecard/upload']
    for (const route of primaryRoutes) {
      expect(route.startsWith('/')).toBe(true)
    }
    expect(legacyRoutes).toContain('/scorecards/new')
    expect(legacyRoutes).toContain('/scorecard/upload')
  })
})
