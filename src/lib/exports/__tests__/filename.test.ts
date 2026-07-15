import { describe, expect, it } from 'vitest'
import {
  buildProcurementScorecardFilename,
  formatExportDate,
  safeFilenamePart,
} from '../filename'

describe('export filenames', () => {
  it('sanitizes company names for filenames', () => {
    expect(safeFilenamePart('Acme Holdings (Pty) Ltd')).toBe('Acme_Holdings_Pty_Ltd')
  })

  it('builds procurement scorecard filenames with date', () => {
    const date = new Date('2026-07-10T12:00:00.000Z')
    expect(buildProcurementScorecardFilename('Acme Holdings', date)).toBe(
      'REAP_Procurement_Scorecard_Acme_Holdings_2026-07-10.pdf',
    )
  })

  it('formats export dates as YYYY-MM-DD', () => {
    expect(formatExportDate(new Date('2026-01-05T00:00:00.000Z'))).toBe('2026-01-05')
  })
})
