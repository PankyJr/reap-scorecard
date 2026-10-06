import { EMPTY_APPLICABILITY_INPUTS, type ApplicabilityInputs } from '@/lib/scorecard/generic/applicability'
import { measurementPeriodFor } from './industries'

/**
 * The scorecard year to suggest: the latest financial year that has already
 * ended. February year-end in October 2026 → 2026; December year-end in
 * October 2026 → 2025. Without a year end, the current calendar year.
 */
export function suggestedScorecardYear(yearEndMonth: number | null, today = new Date()): number {
  const year = today.getFullYear()
  if (yearEndMonth == null) return year
  const month = today.getMonth() + 1
  return month > yearEndMonth ? year : year - 1
}

export type PrefillCompany = {
  industry: string | null
  financial_year_end_month: number | null
  annual_turnover: number | string | null
  black_ownership_percentage: number | string | null
}

export type PrefillSource = { kind: 'previous_scorecard'; year: number } | { kind: 'company_details' } | null

/**
 * "Company size and sector" for a new scorecard, pre-filled so nobody types
 * last year's figures twice: from the company's most recent earlier scorecard
 * when there is one, otherwise from the company's own details. The answer to
 * "does a sector code apply" is never pre-filled: it must be confirmed.
 */
export function prefillApplicability(args: {
  measurementYear: number
  company: PrefillCompany
  previous: { measurement_year: number; applicability_snapshot: unknown } | null
}): { snapshot: ApplicabilityInputs; source: PrefillSource } {
  const month = args.company.financial_year_end_month
  const period = month ? measurementPeriodFor(args.measurementYear, month) : null
  const base: ApplicabilityInputs = {
    ...EMPTY_APPLICABILITY_INPUTS,
    measurementPeriodStart: period?.start ?? null,
    measurementPeriodEnd: period?.end ?? null,
  }

  const prev = (args.previous?.applicability_snapshot ?? null) as Partial<ApplicabilityInputs> | null
  if (args.previous && prev && (prev.annualRevenue != null || prev.blackOwnershipPercentage != null)) {
    return {
      snapshot: {
        ...base,
        annualRevenue: prev.annualRevenue ?? null,
        entityType: prev.entityType ?? null,
        sector: prev.sector ?? args.company.industry ?? null,
        blackOwnershipPercentage: prev.blackOwnershipPercentage ?? null,
        blackWomenOwnershipPercentage: prev.blackWomenOwnershipPercentage ?? null,
        isStartUp: prev.isStartUp ?? null,
      },
      source: { kind: 'previous_scorecard', year: args.previous.measurement_year },
    }
  }

  const turnover = args.company.annual_turnover == null ? null : Number(args.company.annual_turnover)
  const ownership = args.company.black_ownership_percentage == null ? null : Number(args.company.black_ownership_percentage)
  if (turnover != null || ownership != null) {
    return {
      snapshot: {
        ...base,
        annualRevenue: Number.isFinite(turnover) ? turnover : null,
        sector: args.company.industry ?? null,
        blackOwnershipPercentage: ownership != null && Number.isFinite(ownership) ? ownership / 100 : null,
      },
      source: { kind: 'company_details' },
    }
  }

  return { snapshot: { ...base, sector: args.company.industry ?? null }, source: null }
}
