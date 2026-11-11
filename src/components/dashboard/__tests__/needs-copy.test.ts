import { describe, expect, it } from 'vitest'
import { plainReason, withoutRepeatedName } from '../needs-copy'

describe('"Needs you" in plain English', () => {
  it('says what an area is waiting for, in the app\'s own area names', () => {
    expect(plainReason('Management Control is partial.', 'Management control')).toBe('Management control: some figures are still missing')
    expect(plainReason('Skills Development is missing inputs.', 'Skills development')).toBe('Skills development: figures are still needed')
    expect(plainReason('Ownership is not started.', 'Ownership')).toBe('Ownership: not started yet')
    expect(plainReason('Enterprise Development is pending confirmation.', 'Enterprise development')).toBe('Enterprise development: evidence is waiting for you to confirm it')
  })
  it('turns the profit-after-tax messages into one plain line each', () => {
    expect(plainReason('The applicable NPAT denominator has not been resolved.', 'Financial figures')).toBe('Profit after tax is still needed')
    expect(plainReason('The applicable NPAT denominator still requires authorised confirmation.', null)).toBe('Profit after tax needs a REAP administrator to confirm it')
  })
  it('keeps any reason it does not recognise, word for word (less the full stop)', () => {
    expect(plainReason('Something new the engine says.', null)).toBe('Something new the engine says')
  })
  it('drops a repeated company name from the next-step title', () => {
    expect(withoutRepeatedName('Halfway Logistics FY2026 scorecard for Halfway Logistics (Pty) Ltd')).toBe('Halfway Logistics FY2026 scorecard')
    expect(withoutRepeatedName('FY2026 scorecard for Halfway Logistics (Pty) Ltd')).toBe('FY2026 scorecard for Halfway Logistics (Pty) Ltd')
  })
})
