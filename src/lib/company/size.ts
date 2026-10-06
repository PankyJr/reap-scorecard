import { EMPTY_APPLICABILITY_INPUTS, evaluateApplicability } from '@/lib/scorecard/generic/applicability'
import { COMPANY_SIZE_BANDS, matchDeemedLevelRule, type CompanySizeClass } from '@/lib/scorecard/rules/company-size'

export type CompanySizeDescription = {
  /** Null until a turnover is known. */
  size: CompanySizeClass | null
  /** One plain sentence, e.g. "You're a QSE: R10 million to R50 million turnover, measured on the QSE scorecard." */
  headline: string
  /** When the codes give an automatic level, so a full scorecard may not be needed. */
  automaticLevel: { level: string; recognitionPercentage: number; reason: string } | null
  /** Something this app cannot do for a company of this size, said plainly. */
  limitation: string | null
}

/**
 * The company's size in plain words, from the engine's own classification and
 * the size rules held as data (lib/scorecard/rules/company-size.ts). Nothing
 * here is a setting the user can get wrong: it follows from turnover and
 * black ownership alone.
 *
 * @param blackOwnershipPercent 0 to 100, or null when not known.
 */
export function describeCompanySize(args: {
  turnover: number | null
  blackOwnershipPercent: number | null
}): CompanySizeDescription {
  const ownership = args.blackOwnershipPercent == null ? null : args.blackOwnershipPercent / 100
  const result = evaluateApplicability({
    ...EMPTY_APPLICABILITY_INPUTS,
    annualRevenue: args.turnover,
    blackOwnershipPercentage: ownership,
    isStartUp: false,
  })

  if (result.classification === 'unresolved') {
    return {
      size: null,
      headline: 'Enter the annual turnover to see which size of company this is.',
      automaticLevel: null,
      limitation: null,
    }
  }

  const size = result.classification
  const band = COMPANY_SIZE_BANDS[size]
  const headline =
    size === 'eme'
      ? `You're an EME (${band.name}): ${band.bandWords} turnover.`
      : size === 'qse'
        ? `You're a QSE (${band.name}): ${band.bandWords} turnover, measured on ${band.measuredOn}.`
        : `You're a large company: ${band.bandWords} turnover, measured on ${band.measuredOn}.`

  const rule = matchDeemedLevelRule(size, ownership)
  const deemed = result.deemedStatus
  const automaticLevel =
    rule && deemed && deemed.level === rule.level
      ? {
          level: deemed.level,
          recognitionPercentage: deemed.recognitionPercentage,
          reason: `${rule.plainReason} Clients can claim ${deemed.recognitionPercentage}% of what they spend with it.`,
        }
      : null

  const limitation =
    size === 'qse' && !automaticLevel
      ? 'A QSE that is less than 51% black owned is measured on the QSE scorecard. This app works out the Generic scorecard only, so its full-scorecard level would not apply to this company.'
      : null

  return { size, headline, automaticLevel, limitation }
}
