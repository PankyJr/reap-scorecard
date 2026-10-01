import { describe, expect, it } from 'vitest'
import { plainMissingInput } from '../ux/display-values'

describe('plainMissingInput', () => {
  it('says a bonus line once when the explanation repeats the label', () => {
    const label = 'Bonus: job creation arising from enterprise and supplier development initiatives'
    expect(plainMissingInput(`${label}: ${label} has not been confirmed either way, so no bonus point is awarded.`)).toBe(
      `${label} has not been confirmed either way, so no bonus point is awarded.`,
    )
  })

  it('leaves an ordinary "label: explanation" line alone', () => {
    expect(plainMissingInput('Net value: enter the verified net value percentage.')).toBe(
      'Net value: enter the verified net value percentage.',
    )
  })

  it('leaves a line with no label alone', () => {
    expect(plainMissingInput('Ownership measurement date')).toBe('Ownership measurement date')
  })
})
