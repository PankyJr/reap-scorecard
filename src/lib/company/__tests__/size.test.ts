import { describe, expect, it } from 'vitest'
import { describeCompanySize } from '../size'

describe('company size in plain words', () => {
  it('says nothing about size until the turnover is known', () => {
    const d = describeCompanySize({ turnover: null, blackOwnershipPercent: 40 })
    expect(d.size).toBeNull()
    expect(d.automaticLevel).toBeNull()
    expect(d.headline).toMatch(/enter the annual turnover/i)
  })

  it('describes a QSE as the agreed design words it', () => {
    const d = describeCompanySize({ turnover: 30_000_000, blackOwnershipPercent: 30 })
    expect(d.size).toBe('qse')
    expect(d.headline).toBe("You're a QSE (Qualifying Small Enterprise): R10 million to R50 million turnover, measured on the QSE scorecard.")
  })

  it('uses the exact band edges from the engine', () => {
    expect(describeCompanySize({ turnover: 10_000_000, blackOwnershipPercent: 0 }).size).toBe('eme')
    expect(describeCompanySize({ turnover: 10_000_001, blackOwnershipPercent: 0 }).size).toBe('qse')
    expect(describeCompanySize({ turnover: 50_000_000, blackOwnershipPercent: 0 }).size).toBe('generic')
  })

  it('offers the automatic level for an EME, a black-owned QSE, and never for a large company', () => {
    expect(describeCompanySize({ turnover: 4_000_000, blackOwnershipPercent: 0 }).automaticLevel).toMatchObject({ level: 'Level 4', recognitionPercentage: 100 })
    expect(describeCompanySize({ turnover: 20_000_000, blackOwnershipPercent: 51 }).automaticLevel).toMatchObject({ level: 'Level 2', recognitionPercentage: 125 })
    expect(describeCompanySize({ turnover: 20_000_000, blackOwnershipPercent: 100 }).automaticLevel).toMatchObject({ level: 'Level 1', recognitionPercentage: 135 })
    expect(describeCompanySize({ turnover: 80_000_000, blackOwnershipPercent: 100 }).automaticLevel).toBeNull()
  })

  it('says plainly when the app cannot work out the level for this size', () => {
    const d = describeCompanySize({ turnover: 20_000_000, blackOwnershipPercent: 50 })
    expect(d.automaticLevel).toBeNull()
    expect(d.limitation).toMatch(/QSE scorecard/)
  })
})
