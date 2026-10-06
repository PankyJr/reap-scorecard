import { describe, expect, it } from 'vitest'
import { EMPTY_OWNERSHIP_INPUTS } from '../elements/ownership'
import { EMPTY_MANAGEMENT_CONTROL_INPUTS } from '../elements/management-control'
import { EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '../elements/skills-development'
import { EMPTY_APPLICABILITY_INPUTS } from '../applicability'
import { applicabilityWarnings, financialWarnings, managementControlWarnings, ownershipWarnings, skillsWarnings } from '../ux/sanity'
import type { FinancialInputs } from '../financial'

describe('"is that right?" checks next to fields', () => {
  it('says nothing about figures that make sense, or are not filled in', () => {
    expect(ownershipWarnings({ ...EMPTY_OWNERSHIP_INPUTS, blackVotingRightsPercentage: 0.3, blackWomenVotingRightsPercentage: 0.1 })).toEqual({})
    expect(managementControlWarnings({ ...EMPTY_MANAGEMENT_CONTROL_INPUTS })).toEqual({})
    expect(applicabilityWarnings({ ...EMPTY_APPLICABILITY_INPUTS })).toEqual({})
  })

  it('asks when a part is bigger than its whole', () => {
    expect(ownershipWarnings({ ...EMPTY_OWNERSHIP_INPUTS, blackVotingRightsPercentage: 0.2, blackWomenVotingRightsPercentage: 0.3 })).toHaveProperty(
      'blackWomenVotingRightsPercentage',
      'This is more than black voting rights overall. Is that right?',
    )
    const mc = { ...EMPTY_MANAGEMENT_CONTROL_INPUTS, board: { total: 10, black: 12, blackWomen: 2 } }
    expect(managementControlWarnings(mc)).toHaveProperty('boardBlack')
    expect(applicabilityWarnings({ ...EMPTY_APPLICABILITY_INPUTS, blackOwnershipPercentage: 0.3, blackWomenOwnershipPercentage: 0.4 })).toHaveProperty('blackWomenOwnershipPercentage')
  })

  it('asks when management groups add up to more than the level’s total', () => {
    const mc = {
      ...EMPTY_MANAGEMENT_CONTROL_INPUTS,
      seniorManagement: { total: 10, byDemographic: { african_male: 8, african_female: 5 } },
    } as typeof EMPTY_MANAGEMENT_CONTROL_INPUTS
    expect(managementControlWarnings(mc).seniorTotal).toBe('The groups below add up to 13, more than this total. Is that right?')
  })

  it('asks when profit is bigger than revenue, or training spend bigger than payroll', () => {
    expect(financialWarnings({ revenue: 1_000_000, actualNpat: 2_000_000 } as FinancialInputs)).toHaveProperty('actualNpat')
    const skills = { ...EMPTY_SKILLS_DEVELOPMENT_INPUTS, leviableAmount: 100_000, generalTrainingSpendByDemographic: { african_male: 150_000 } } as typeof EMPTY_SKILLS_DEVELOPMENT_INPUTS
    expect(skillsWarnings(skills)).toHaveProperty('leviableAmount')
  })
})
