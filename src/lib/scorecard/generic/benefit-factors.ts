/**
 * Enterprise Development / Supplier Development Benefit Factor Matrix
 * (Annexe 400(B)) and the Socio-Economic Development equivalent.
 *
 * A raw contribution amount is never the recognised amount: each contribution
 * type carries a benefit factor that converts it. Two factors are rate-based
 * and cannot be expressed as a constant — those are marked `variable` and the
 * practitioner must supply the computed factor with a reason.
 */

import type { RuleSource } from '../rules/types'

const ANNEXE_400B: RuleSource = {
  citation: 'Amended Code Series 400, Annexe 400(B) — Enterprise and Supplier Development Benefit Factor Matrix',
  notice: 'GN 304 of 2019, Government Gazette 42496, 31 May 2019',
  standing: 'gazetted',
}

const ANNEXE_500A: RuleSource = {
  citation: 'Code Series 500, Annexe 500(A) — Socio-Economic Development Benefit Factor Matrix',
  notice: 'Amended Codes of Good Practice, Government Gazette 36928, 11 October 2013',
  standing: 'gazetted',
}

export type BenefitFactorKind = 'fixed' | 'variable'

export type BenefitFactorDefinition = {
  key: string
  label: string
  /** What the contribution amount represents for this type. */
  contributionBasis: string
  kind: BenefitFactorKind
  /** Fixed factor as a fraction; null for variable factors. */
  factor: number | null
  /** How a variable factor is derived. */
  variableFormula?: string
  source: RuleSource
  notes?: string
}

export const ESD_BENEFIT_FACTORS: BenefitFactorDefinition[] = [
  {
    key: 'grant_contribution',
    label: 'Grant contribution',
    contributionBasis: 'Full grant amount',
    kind: 'fixed',
    factor: 1,
    source: ANNEXE_400B,
  },
  {
    key: 'direct_cost',
    label: 'Direct cost incurred in supporting enterprise or supplier development',
    contributionBasis: 'Verifiable cost, monetary and non-monetary',
    kind: 'fixed',
    factor: 1,
    source: ANNEXE_400B,
  },
  {
    key: 'discount',
    label: 'Discount in addition to normal business practice',
    contributionBasis: 'Discount amount above the normal business discount',
    kind: 'fixed',
    factor: 1,
    source: ANNEXE_400B,
  },
  {
    key: 'overhead_cost',
    label: 'Overhead cost incurred in supporting enterprise or supplier development',
    contributionBasis: 'Verifiable cost, monetary and non-monetary',
    kind: 'fixed',
    factor: 0.7,
    source: ANNEXE_400B,
  },
  {
    key: 'interest_free_loan',
    label: 'Interest-free loan with no security requirements',
    contributionBasis: 'Outstanding loan amount',
    kind: 'fixed',
    factor: 0.7,
    source: ANNEXE_400B,
  },
  {
    key: 'standard_loan',
    label: 'Standard loan to a beneficiary',
    contributionBasis: 'Outstanding loan amount',
    kind: 'fixed',
    factor: 0.5,
    source: ANNEXE_400B,
  },
  {
    key: 'guarantee',
    label: 'Guarantee provided on behalf of a beneficiary',
    contributionBasis: 'Guarantee amount',
    kind: 'fixed',
    factor: 0.5,
    source: ANNEXE_400B,
  },
  {
    key: 'lower_interest_rate_loan',
    label: 'Loan at a lower interest rate',
    contributionBasis: 'Outstanding loan amount',
    kind: 'variable',
    factor: null,
    variableFormula: 'Prime rate − actual rate',
    source: ANNEXE_400B,
    notes: 'Supply the computed factor together with the prime rate and actual rate used.',
  },
  {
    key: 'minority_investment',
    label: 'Minority investment in a beneficiary',
    contributionBasis: 'Investment amount',
    kind: 'fixed',
    factor: 0.7,
    source: ANNEXE_400B,
  },
  {
    key: 'investment_lower_dividend',
    label: 'Investment with a lower dividend to the financier',
    contributionBasis: 'Investment amount',
    kind: 'variable',
    factor: null,
    variableFormula: 'Dividend rate of ordinary shareholders − actual dividend rate of the contributor',
    source: ANNEXE_400B,
  },
  {
    key: 'professional_services_free',
    label: 'Professional services rendered at no cost',
    contributionBasis: 'Commercial hourly rate of the professional',
    kind: 'fixed',
    factor: 0.6,
    source: ANNEXE_400B,
  },
  {
    key: 'professional_services_discount',
    label: 'Professional services rendered at a discount',
    contributionBasis: 'Value of the discount against the commercial hourly rate',
    kind: 'fixed',
    factor: 0.6,
    source: ANNEXE_400B,
  },
  {
    key: 'employee_time',
    label: 'Time of employees productively deployed in assisting beneficiaries',
    contributionBasis: 'Monthly salary divided by 160',
    kind: 'fixed',
    factor: 0.6,
    source: ANNEXE_400B,
  },
  {
    key: 'shorter_payment_period',
    label: 'Shorter payment periods (supplier development only)',
    contributionBasis: 'Invoiced amount × (15 days less the days from invoice to payment) × 15%',
    kind: 'variable',
    factor: null,
    variableFormula: 'Percentage of invoiced amount multiplied by 15%',
    source: ANNEXE_400B,
    notes: 'Capped at 15% of the 10 supplier development points.',
  },
]

/**
 * Annexe 500(A) only covers Grant and Related Contributions and human-resource
 * capacity. Loans, guarantees, equity and shorter payment periods are ESD-only
 * (Annexe 400(B)) and must not appear here.
 */
export const SED_BENEFIT_FACTORS: BenefitFactorDefinition[] = [
  {
    key: 'grant_contribution',
    label: 'Grant contribution',
    contributionBasis: 'Full grant amount',
    kind: 'fixed',
    factor: 1,
    source: ANNEXE_500A,
  },
  {
    key: 'direct_cost',
    label: 'Direct cost incurred in supporting socio-economic development, sector specific initiatives or Qualifying Socio-Economic Development Contributions',
    contributionBasis: 'Verifiable cost, monetary and non-monetary',
    kind: 'fixed',
    factor: 1,
    source: ANNEXE_500A,
  },
  {
    key: 'discount',
    label: 'Discount in addition to normal business practice supporting socio-economic development',
    contributionBasis: 'Discount amount in addition to the normal business discount',
    kind: 'fixed',
    factor: 1,
    source: ANNEXE_500A,
  },
  {
    key: 'overhead_cost',
    label: 'Overhead cost incurred in supporting socio-economic development',
    contributionBasis: 'Verifiable cost, monetary and non-monetary',
    kind: 'fixed',
    factor: 0.8,
    source: ANNEXE_500A,
  },
  {
    key: 'professional_services_free',
    label: 'Professional services rendered at no cost',
    contributionBasis: 'Commercial hourly rate of the professional',
    kind: 'fixed',
    factor: 0.8,
    source: ANNEXE_500A,
  },
  {
    key: 'professional_services_discount',
    label: 'Professional services rendered at a discount',
    contributionBasis: 'Value of the discount against the commercial hourly rate',
    kind: 'fixed',
    factor: 0.8,
    source: ANNEXE_500A,
  },
  {
    key: 'employee_time',
    label: 'Time of employees productively deployed on socio-economic development',
    contributionBasis: 'Monthly salary divided by 160',
    kind: 'fixed',
    factor: 0.8,
    source: ANNEXE_500A,
  },
]

export type ContributionScope = 'esd' | 'sed'

export function benefitFactorsFor(scope: ContributionScope): BenefitFactorDefinition[] {
  return scope === 'sed' ? SED_BENEFIT_FACTORS : ESD_BENEFIT_FACTORS
}

export function findBenefitFactor(scope: ContributionScope, key: string): BenefitFactorDefinition | null {
  return benefitFactorsFor(scope).find((definition) => definition.key === key) ?? null
}

export type BenefitFactorResolution = {
  factor: number | null
  definition: BenefitFactorDefinition | null
  warnings: string[]
}

/**
 * Resolve the benefit factor for one contribution. A supplied factor wins for
 * variable types; for fixed types a mismatch is reported rather than silently
 * accepted, because the matrix is not negotiable.
 */
export function resolveBenefitFactor(args: {
  scope: ContributionScope
  contributionType: string | null
  suppliedFactor: number | null
}): BenefitFactorResolution {
  const { scope, contributionType, suppliedFactor } = args
  const warnings: string[] = []

  if (!contributionType) {
    return {
      factor: null,
      definition: null,
      warnings: ['No contribution type was supplied, so the benefit factor could not be resolved from the matrix.'],
    }
  }

  const definition = findBenefitFactor(scope, contributionType)
  if (!definition) {
    return {
      factor: null,
      definition: null,
      warnings: [`Contribution type "${contributionType}" is not in the benefit factor matrix.`],
    }
  }

  if (definition.kind === 'variable') {
    if (suppliedFactor == null || !Number.isFinite(suppliedFactor)) {
      return {
        factor: null,
        definition,
        warnings: [
          `"${definition.label}" uses a rate-based benefit factor (${definition.variableFormula}). Supply the computed factor before this contribution can be recognised.`,
        ],
      }
    }
    if (suppliedFactor < 0 || suppliedFactor > 1) {
      warnings.push(`The supplied benefit factor of ${(suppliedFactor * 100).toFixed(2)}% for "${definition.label}" is outside 0–100%.`)
    }
    return { factor: suppliedFactor, definition, warnings }
  }

  if (suppliedFactor != null && Number.isFinite(suppliedFactor) && Math.abs(suppliedFactor - definition.factor!) > 1e-9) {
    warnings.push(
      `A benefit factor of ${(suppliedFactor * 100).toFixed(0)}% was supplied for "${definition.label}", but the matrix fixes it at ${(definition.factor! * 100).toFixed(0)}%. The matrix value was used.`,
    )
  }

  return { factor: definition.factor, definition, warnings }
}
