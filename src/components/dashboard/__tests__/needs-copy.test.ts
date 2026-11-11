import { describe, expect, it } from 'vitest'
import { attentionCopy, nextStepCopy, reasonCopy, withoutRepeatedName } from '../needs-copy'
import { fullStatusChip, procurementCell } from '@/components/status/status-copy'

describe('"Needs you" titles are actions', () => {
  it('the unfinished scorecard', () => {
    expect(nextStepCopy({ company: 'Test Company', next: 'Continue', fallbackTitle: '', fallbackBody: '' })).toEqual({ title: 'Finish Test Company’s scorecard', sub: 'Some information is still missing' })
    expect(nextStepCopy({ company: 'Test Company', next: 'See what is missing', fallbackTitle: '', fallbackBody: '' }).title).toBe('Finish Test Company’s scorecard')
    expect(nextStepCopy({ company: 'Acme Holdings', next: 'Calculate again', fallbackTitle: '', fallbackBody: '' }).title).toBe('Recalculate Acme Holdings’ scorecard')
  })
  it('an EME, from the engine’s applicability reason', () => {
    const reason = 'This entity is an Exempted Micro-Enterprise. The full generic scorecard does not apply to it, so no generic final level is produced.'
    expect(reasonCopy('Test Company', reason, null)).toEqual({ title: 'Test Company is an EME', sub: 'The full scorecard doesn’t apply. Use the EME route.' })
  })
  it('area reasons name the area in the app’s words', () => {
    expect(reasonCopy('Halfway Logistics', 'Management Control is partial.', 'Management control')).toEqual({ title: 'Finish the management control figures', sub: 'Halfway Logistics' })
    expect(reasonCopy('Halfway', 'The applicable NPAT denominator has not been resolved.', 'Financial figures').title).toBe('Add Halfway’s profit after tax')
  })
  it('flagged companies', () => {
    expect(attentionCopy('Halfway', 'Changed since it was calculated').title).toBe('Recalculate Halfway’s scorecard')
    expect(attentionCopy('Halfway', 'An area is below its minimum').title).toBe('Lift Halfway’s weakest area')
  })
  it('anything unrecognised is shown as written', () => {
    expect(reasonCopy('X', 'Something new.', null)).toEqual({ title: 'Something new', sub: 'X' })
    expect(withoutRepeatedName('FY2026 scorecard for Halfway')).toBe('FY2026 scorecard for Halfway')
  })
})

describe('one set of status words on every list', () => {
  it('shortens the status function’s labels and folds tones into four', () => {
    expect(fullStatusChip({ label: 'Finished: Level 4', tone: 'ok' })).toEqual({ label: 'Level 4', tone: 'success' })
    expect(fullStatusChip({ label: 'Calculated, level not final', tone: 'warn' })).toEqual({ label: 'Not final', tone: 'attention' })
    expect(fullStatusChip({ label: 'In progress', tone: 'brand' })).toEqual({ label: 'In progress', tone: 'progress' })
    expect(fullStatusChip({ label: 'Changed since last calculation', tone: 'warn' })).toEqual({ label: 'Recalculate', tone: 'attention' })
    expect(fullStatusChip({ label: 'Workbook not uploaded', tone: 'neutral' })).toEqual({ label: 'No workbook', tone: 'neutral' })
  })
  it('procurement gets its own figure', () => {
    expect(procurementCell({ storedTotal: '23.88' })).toEqual({ achieved: 23.88, cap: null })
    expect(procurementCell({ storedTotal: null })).toBeNull()
  })
})
