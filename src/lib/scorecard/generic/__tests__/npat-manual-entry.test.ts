import { describe, expect, it } from 'vitest'
import { calculateGenericScorecard } from '..'
import { EMPTY_FINANCIAL_INPUTS } from '../financial'
import {
  completeScorecardInputs,
  genericApplicability,
  sedContribution,
  grantContribution,
} from './fixtures'
import { EMPTY_OWNERSHIP_INPUTS } from '../elements/ownership'
import { EMPTY_MANAGEMENT_CONTROL_INPUTS } from '../elements/management-control'
import { EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '../elements/skills-development'

/**
 * The manual-entry path: a user who uploads no workbook, types an NPAT on the
 * Financial step, and captures one contribution. This is the journey that
 * scored zero in the client meeting.
 *
 * Value assertions only — a shape assertion here would have hidden the bug.
 */
function manualEntryInputs(args: {
  actualNpat: number | null
  sedContributionValue: number
}) {
  return {
    ...completeScorecardInputs(),
    applicability: genericApplicability(),
    // Nothing but a typed NPAT. No revenue, no industry norm, no workbook.
    financial: {
      ...EMPTY_FINANCIAL_INPUTS,
      actualNpat: args.actualNpat,
    },
    ownership: { ...EMPTY_OWNERSHIP_INPUTS },
    managementControl: { ...EMPTY_MANAGEMENT_CONTROL_INPUTS },
    skillsDevelopment: { ...EMPTY_SKILLS_DEVELOPMENT_INPUTS },
    procurementSnapshot: null,
    enterpriseDevelopment: { records: [], bonusConfirmed: null, bonusEvidenceProvided: false },
    supplierDevelopment: { records: [], bonusConfirmed: null, bonusEvidenceProvided: false },
    socioEconomicDevelopment: {
      records: [sedContribution({ id: 'sed-manual-1', actualValue: args.sedContributionValue })],
    },
  }
}

describe('manual NPAT entry flows into SED scoring', () => {
  it('resolves the denominator from a typed actual NPAT with no other financial inputs', () => {
    const result = calculateGenericScorecard(manualEntryInputs({
      actualNpat: 10_000_000,
      sedContributionValue: 100_000,
    }))

    expect(result.npat.applicableNpat).toBe(10_000_000)
    expect(result.npat.selection).toBe('actual')
    expect(result.contributionTargets.socioEconomicDevelopment).toBe(100_000)
  })

  it('scores SED at full points when the contribution meets the 1% target', () => {
    // Target = 1% of 10m = 100 000. A fully recognised 100 000 grant hits it exactly.
    const result = calculateGenericScorecard(manualEntryInputs({
      actualNpat: 10_000_000,
      sedContributionValue: 100_000,
    }))

    const sed = result.elements.find((element) => element.elementKey === 'socio_economic_development')
    expect(sed).toBeDefined()
    expect(sed!.basePointsAchieved).toBe(5)
    expect(sed!.status).toBe('scored')
  })

  it('scores SED proportionally at half the target', () => {
    const result = calculateGenericScorecard(manualEntryInputs({
      actualNpat: 10_000_000,
      sedContributionValue: 50_000,
    }))

    const sed = result.elements.find((element) => element.elementKey === 'socio_economic_development')
    expect(sed!.basePointsAchieved).toBe(2.5)
  })

  it('scores zero and names NPAT as the missing input when NPAT is absent', () => {
    const result = calculateGenericScorecard(manualEntryInputs({
      actualNpat: null,
      sedContributionValue: 100_000,
    }))

    const sed = result.elements.find((element) => element.elementKey === 'socio_economic_development')
    expect(sed!.basePointsAchieved).toBe(0)
    expect(sed!.missingInputs).toContain('Applicable NPAT denominator')
  })

  it('flows the same denominator into ED and SD', () => {
    const base = manualEntryInputs({ actualNpat: 10_000_000, sedContributionValue: 100_000 })
    const result = calculateGenericScorecard({
      ...base,
      // ED target = 1% = 100 000; SD target = 2% = 200 000.
      enterpriseDevelopment: {
        records: [grantContribution({ id: 'ed-manual-1', actualValue: 100_000 })],
        bonusConfirmed: null,
        bonusEvidenceProvided: false,
      },
      supplierDevelopment: {
        records: [grantContribution({ id: 'sd-manual-1', actualValue: 200_000 })],
        bonusConfirmed: null,
        bonusEvidenceProvided: false,
      },
    })

    expect(result.contributionTargets.enterpriseDevelopment).toBe(100_000)
    expect(result.contributionTargets.supplierDevelopment).toBe(200_000)

    const ed = result.elements.find((element) => element.elementKey === 'enterprise_development')
    const sd = result.elements.find((element) => element.elementKey === 'supplier_development')
    expect(ed!.basePointsAchieved).toBe(5)
    expect(sd!.basePointsAchieved).toBe(10)
  })
})

/**
 * Phase 1: the contribution form writes 'grant_contribution' with no supplied
 * benefit factor, which must resolve to 100% recognition.
 *
 * TODO(phase-2): when the Annexe 400(B) / 500(A) matrix is re-exposed in the
 * UI, this becomes a matrix test rather than a flat-100% test.
 */
describe('phase-1 contributions are recognised at 100%', () => {
  it('recognises a grant contribution at its full actual value', () => {
    const result = calculateGenericScorecard(manualEntryInputs({
      actualNpat: 10_000_000,
      sedContributionValue: 40_000,
    }))

    const sed = result.elements.find((element) => element.elementKey === 'socio_economic_development')
    const evaluated = (sed as { evaluatedContributions?: { benefitFactor: number | null; recognisedValue: number | null }[] })
      .evaluatedContributions

    expect(evaluated).toHaveLength(1)
    expect(evaluated![0].benefitFactor).toBe(1)
    expect(evaluated![0].recognisedValue).toBe(40_000)
  })

  it('exposes an explicit exclusion reason instead of a silent zero', () => {
    const result = calculateGenericScorecard({
      ...manualEntryInputs({ actualNpat: 10_000_000, sedContributionValue: 100_000 }),
      socioEconomicDevelopment: {
        records: [sedContribution({ id: 'sed-no-evidence', actualValue: 100_000, evidenceProvided: false })],
      },
    })

    const sed = result.elements.find((element) => element.elementKey === 'socio_economic_development')
    const evaluated = (sed as { evaluatedContributions?: { recognisedValue: number | null }[] })
      .evaluatedContributions

    expect(sed!.basePointsAchieved).toBe(0)
    expect(evaluated![0].recognisedValue).toBeNull()
    // The UI keys its "Not recognised — scores zero" callout off exactly this.
    expect(sed!.warnings.some((w) => /evidence/i.test(w))).toBe(true)
  })
})
