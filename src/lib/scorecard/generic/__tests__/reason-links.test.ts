import { describe, expect, it } from 'vitest'
import { reasonLink } from '../ux/reason-links'

const at = (reason: string) => reasonLink('a1', reason)?.href.split('/').pop()

describe('reasonLink: every missing item points to where it is fixed', () => {
  it('maps the engine reasons seen on a real assessment', () => {
    expect(at('The entity could not be classified because annual revenue has not been captured.')).toBe('applicability')
    expect(at('Ownership is partial.')).toBe('ownership')
    expect(at('Management Control is partial.')).toBe('management-control')
    expect(at('Skills Development is missing inputs.')).toBe('skills-development')
    expect(at('Preferential Procurement is not started.')).toBe('procurement')
    expect(at('Supplier Development is partial.')).toBe('supplier-development')
    expect(at('Enterprise Development is partial.')).toBe('enterprise-development')
    expect(at('Socio-Economic Development is pending confirmation.')).toBe('socio-economic-development')
    expect(at('The Skills Development priority sub-minimum could not be tested.')).toBe('skills-development')
    expect(at('Applicable NPAT could not be resolved.')).toBe('financial')
  })

  it('returns nothing for a reason it cannot place', () => {
    expect(reasonLink('a1', 'Something unexpected.')).toBeNull()
  })
})
