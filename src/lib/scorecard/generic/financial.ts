/**
 * Shared financial inputs for the generic scorecard.
 *
 * Enterprise Development, Supplier Development and Socio-Economic Development
 * all measure contributions against the same NPAT denominator, so it is
 * resolved once, explained once, and snapshotted with the calculation run.
 */

export type NpatSelection = 'actual' | 'deemed' | 'authorised_override' | 'unresolved'

export type NpatDenominatorOverride = {
  selection: Exclude<NpatSelection, 'unresolved'>
  /** Explicit value when the administrator supplies one directly. */
  value: number | null
  reason: string
  overriddenBy: string
  overriddenAt: string
}

export type FinancialInputs = {
  measurementPeriodStart: string | null
  measurementPeriodEnd: string | null
  revenue: number | null
  actualNpat: number | null
  npbt: number | null
  companyTax: number | null
  /** SDL leviable amount for the measurement period. */
  leviableAmount: number | null
  totalPayroll: number | null
  totalEmployees: number | null
  industryClassification: string | null
  /** Industry NPAT margin as a fraction of turnover, e.g. 0.0573. */
  industryNpatMargin: number | null
  industryProfitNormSource: string | null
  industryProfitNormPeriod: string | null
  npatOverride?: NpatDenominatorOverride | null
}

export const EMPTY_FINANCIAL_INPUTS: FinancialInputs = {
  measurementPeriodStart: null,
  measurementPeriodEnd: null,
  revenue: null,
  actualNpat: null,
  npbt: null,
  companyTax: null,
  leviableAmount: null,
  totalPayroll: null,
  totalEmployees: null,
  industryClassification: null,
  industryNpatMargin: null,
  industryProfitNormSource: null,
  industryProfitNormPeriod: null,
  npatOverride: null,
}

/**
 * The deemed-NPAT multiplier: a quarter of the industry NPAT margin, applied to
 * revenue. This mirrors NPAT Calculation!B12 = B10 × 25% in the reference
 * workbook and the "quarter of the industry norm" test in the Codes.
 */
export const DEEMED_NPAT_INDUSTRY_FRACTION = 0.25

export type NpatResolution = {
  actualNpat: number | null
  deemedNpat: number | null
  /** The denominator the engine will actually use, or null when unresolved. */
  applicableNpat: number | null
  selection: NpatSelection
  /** Plain-language reason shown next to every ED, SD and SED score. */
  reason: string
  requiresAuthorisedConfirmation: boolean
  industryNpatMargin: number | null
  industryProfitNormSource: string | null
  industryProfitNormPeriod: string | null
  deemedNpatMultiplier: number | null
  warnings: string[]
}

export function computeDeemedNpat(inputs: Pick<FinancialInputs, 'revenue' | 'industryNpatMargin'>): number | null {
  const { revenue, industryNpatMargin } = inputs
  if (revenue == null || industryNpatMargin == null) return null
  if (!Number.isFinite(revenue) || !Number.isFinite(industryNpatMargin)) return null
  return revenue * industryNpatMargin * DEEMED_NPAT_INDUSTRY_FRACTION
}

/**
 * Resolve the applicable NPAT denominator.
 *
 * Where the measured entity makes a loss, or its NPAT margin falls below a
 * quarter of the industry norm, the deemed NPAT applies. Taking the greater of
 * actual and deemed NPAT produces exactly that outcome, and is what the
 * reference workbook says it does at NPAT Calculation!A25 — even though its
 * B27 formula silently returns actual NPAT instead.
 */
export function resolveNpatDenominator(inputs: FinancialInputs): NpatResolution {
  const warnings: string[] = []
  const deemedNpat = computeDeemedNpat(inputs)
  const actualNpat = inputs.actualNpat
  const multiplier =
    inputs.industryNpatMargin == null ? null : inputs.industryNpatMargin * DEEMED_NPAT_INDUSTRY_FRACTION

  const base = {
    actualNpat: actualNpat ?? null,
    deemedNpat,
    industryNpatMargin: inputs.industryNpatMargin,
    industryProfitNormSource: inputs.industryProfitNormSource,
    industryProfitNormPeriod: inputs.industryProfitNormPeriod,
    deemedNpatMultiplier: multiplier,
  }

  const override = inputs.npatOverride
  if (override && override.selection) {
    const value =
      override.selection === 'actual'
        ? actualNpat
        : override.selection === 'deemed'
          ? deemedNpat
          : override.value

    if (value == null || !Number.isFinite(value)) {
      return {
        ...base,
        applicableNpat: null,
        selection: 'unresolved',
        reason: `An authorised override selected "${override.selection}" but that value is not available.`,
        requiresAuthorisedConfirmation: true,
        warnings: [...warnings, 'The authorised NPAT override does not resolve to a usable value.'],
      }
    }

    return {
      ...base,
      applicableNpat: value,
      selection: 'authorised_override',
      reason: `Authorised override by ${override.overriddenBy} on ${override.overriddenAt}: ${override.reason}`,
      requiresAuthorisedConfirmation: false,
      warnings,
    }
  }

  if (actualNpat == null && deemedNpat == null) {
    return {
      ...base,
      applicableNpat: null,
      selection: 'unresolved',
      reason:
        'Neither an actual NPAT nor the inputs needed for a deemed NPAT (revenue and an industry profit norm) have been captured.',
      requiresAuthorisedConfirmation: true,
      warnings: [...warnings, 'Capture actual NPAT, or revenue plus an industry NPAT margin, to resolve the denominator.'],
    }
  }

  if (deemedNpat == null) {
    if (actualNpat != null && actualNpat <= 0) {
      return {
        ...base,
        applicableNpat: null,
        selection: 'unresolved',
        reason:
          'Actual NPAT is zero or negative, so a deemed NPAT must be used — but no industry profit norm has been captured to compute one.',
        requiresAuthorisedConfirmation: true,
        warnings: [
          ...warnings,
          'Capture the industry classification and its NPAT margin (with source and period), or record an authorised override with a reason.',
        ],
      }
    }
    return {
      ...base,
      applicableNpat: actualNpat,
      selection: 'actual',
      reason:
        'Actual NPAT is used. No industry profit norm was captured, so the deemed-NPAT comparison could not be performed.',
      requiresAuthorisedConfirmation: true,
      warnings: [
        ...warnings,
        'Without an industry profit norm the engine cannot confirm that actual NPAT is at least a quarter of the industry norm. An authorised user should confirm the denominator.',
      ],
    }
  }

  if (actualNpat == null) {
    return {
      ...base,
      applicableNpat: deemedNpat,
      selection: 'deemed',
      reason: `Actual NPAT has not been captured, so the deemed NPAT applies: revenue × ${(inputs.industryNpatMargin! * 100).toFixed(4)}% industry margin × ${DEEMED_NPAT_INDUSTRY_FRACTION * 100}%.`,
      requiresAuthorisedConfirmation: true,
      warnings: [...warnings, 'Capture actual NPAT so the two values can be compared.'],
    }
  }

  if (deemedNpat > actualNpat) {
    const marginText =
      inputs.revenue && inputs.revenue > 0
        ? ` The actual NPAT margin of ${((actualNpat / inputs.revenue) * 100).toFixed(2)}% is below a quarter of the ${(inputs.industryNpatMargin! * 100).toFixed(2)}% industry norm.`
        : ''
    return {
      ...base,
      applicableNpat: deemedNpat,
      selection: 'deemed',
      reason: `Deemed NPAT applies because it exceeds actual NPAT.${marginText}`,
      requiresAuthorisedConfirmation: false,
      warnings,
    }
  }

  return {
    ...base,
    applicableNpat: actualNpat,
    selection: 'actual',
    reason:
      'Actual NPAT applies because it is at least equal to the deemed NPAT (its margin is at or above a quarter of the industry norm).',
    requiresAuthorisedConfirmation: false,
    warnings,
  }
}

export type ContributionTargets = {
  enterpriseDevelopment: number | null
  supplierDevelopment: number | null
  socioEconomicDevelopment: number | null
}

export function contributionTargets(applicableNpat: number | null): ContributionTargets {
  if (applicableNpat == null || !Number.isFinite(applicableNpat)) {
    return { enterpriseDevelopment: null, supplierDevelopment: null, socioEconomicDevelopment: null }
  }
  return {
    enterpriseDevelopment: applicableNpat * 0.01,
    supplierDevelopment: applicableNpat * 0.02,
    socioEconomicDevelopment: applicableNpat * 0.01,
  }
}

/** Which financial inputs must be present before the scorecard can be completed. */
export function missingFinancialInputs(inputs: FinancialInputs): string[] {
  const missing: string[] = []
  if (inputs.measurementPeriodStart == null || inputs.measurementPeriodEnd == null) {
    missing.push('Measurement period')
  }
  if (inputs.revenue == null) missing.push('Annual revenue')
  if (inputs.actualNpat == null) missing.push('Actual NPAT')
  if (inputs.leviableAmount == null) missing.push('Leviable amount')
  if (inputs.totalEmployees == null) missing.push('Total employees')
  if (inputs.industryClassification == null) missing.push('Industry classification')
  if (inputs.industryNpatMargin == null) missing.push('Industry NPAT margin')
  if (inputs.industryProfitNormSource == null) missing.push('Industry profit norm source')
  return missing
}
