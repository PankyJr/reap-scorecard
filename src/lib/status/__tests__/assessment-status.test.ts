import { describe, expect, it } from 'vitest'
import { fullScorecardStatus, procurementStatus, formatScore } from '../assessment-status'

const id = 'a1'
const base = `/scorecards/calculator/${id}/generic`

describe('fullScorecardStatus', () => {
  it('starts by asking for the workbook', () => {
    expect(fullScorecardStatus({ id, scope_mode: 'full', workbook_import_status: 'no_workbook_uploaded' })).toMatchObject({
      label: 'Workbook not uploaded',
      next: 'Upload the workbook',
      href: base,
      finished: false,
    })
  })

  it('sends a pending import to the check screen', () => {
    expect(fullScorecardStatus({ id, scope_mode: 'full', workbook_import_status: 'review_required' }).href).toBe(`${base}/workbook-review`)
  })

  it('says "in progress" once the import is confirmed and nothing is calculated', () => {
    expect(fullScorecardStatus({ id, scope_mode: 'full', workbook_import_status: 'imported_with_warnings' })).toMatchObject({
      label: 'In progress',
      href: base,
    })
  })

  it('names the level when the calculation is final', () => {
    const s = fullScorecardStatus({
      id,
      scope_mode: 'full',
      workbook_import_status: 'imported',
      overall_result_snapshot: {},
      readiness_complete: true,
      final_level: 'Level 8',
      needs_recalculation: false,
    })
    expect(s).toMatchObject({ label: 'Finished: Level 8', finished: true, href: `${base}/result` })
  })

  it('asks to calculate again after a change', () => {
    const s = fullScorecardStatus({ id, scope_mode: 'full', overall_result_snapshot: {}, needs_recalculation: true, readiness_complete: true, final_level: 'Level 8' })
    expect(s).toMatchObject({ next: 'Calculate again', href: `${base}/review`, finished: false })
  })

  it('points a calculated-but-incomplete scorecard at what is missing', () => {
    const s = fullScorecardStatus({ id, scope_mode: 'full', workbook_import_status: 'imported', overall_result_snapshot: {}, readiness_complete: false })
    expect(s).toMatchObject({ label: 'Calculated, level not final', href: `${base}/review` })
  })

  it('opens the selected-elements calculator for that kind of assessment', () => {
    expect(fullScorecardStatus({ id, scope_mode: 'selected' }).href).toBe(`/scorecards/calculator/${id}`)
  })
})

describe('procurementStatus', () => {
  it('is finished as soon as it is saved', () => {
    expect(procurementStatus({ id: 'p1', total_score: 12 })).toMatchObject({ finished: true, href: '/procurement/assessments/p1' })
  })
})

describe('formatScore', () => {
  it('formats numbers and numeric strings, and shows a dash for nothing', () => {
    expect(formatScore(25.666)).toBe('25.67')
    expect(formatScore('3')).toBe('3.00')
    expect(formatScore(null)).toBe('—')
  })
})
