/**
 * Company size and the automatic ("deemed") levels, held as data.
 *
 * One place for the turnover bands and the deemed-level rules: the engine
 * (generic/applicability.ts) classifies with these numbers, and the company
 * screens describe the result in plain words from the same rows, so the two
 * can never disagree. Changing a value here changes the scoring; it needs a
 * verification expert's sign-off (see docs/FOR_STUART.md).
 */

import type { RuleSource } from './types'

export const COMPANY_SIZE_SOURCE: RuleSource = {
  citation: 'Amended Code Series 000, Statement 000 §§4, 5 and 7',
  notice: 'GN 306 of 2019, Government Gazette 42496, 31 May 2019',
  url: 'https://www.gov.za/sites/default/files/gcis_document/201905/42496gen306.pdf',
  standing: 'gazetted',
}

export type CompanySizeClass = 'eme' | 'qse' | 'generic'

export type CompanySizeBand = {
  size: CompanySizeClass
  /** The codes' name. */
  name: string
  short: string
  /** Turnover band in rand: above `above` (exclusive) and up to `upTo` (inclusive) or below `below`. */
  above: number | null
  upTo: number | null
  below: number | null
  /** Plain words for the band, e.g. "R10 million to R50 million". */
  bandWords: string
  /** The scorecard a company of this size is measured on, when it is measured. */
  measuredOn: string | null
}

/** EME: up to R10m. QSE: above R10m and below R50m. Large: R50m and above. */
export const COMPANY_SIZE_BANDS: Readonly<Record<CompanySizeClass, CompanySizeBand>> = {
  eme: {
    size: 'eme',
    name: 'Exempted Micro-Enterprise',
    short: 'EME',
    above: null,
    upTo: 10_000_000,
    below: null,
    bandWords: 'R10 million or less',
    measuredOn: null,
  },
  qse: {
    size: 'qse',
    name: 'Qualifying Small Enterprise',
    short: 'QSE',
    above: 10_000_000,
    upTo: null,
    below: 50_000_000,
    bandWords: 'R10 million to R50 million',
    measuredOn: 'the QSE scorecard',
  },
  generic: {
    size: 'generic',
    name: 'Large Enterprise',
    short: 'Large',
    above: null,
    upTo: null,
    below: null,
    bandWords: 'R50 million or more',
    measuredOn: 'the Generic scorecard',
  },
}

/** Largest turnover that is still an EME. */
export const EME_TURNOVER_CEILING = COMPANY_SIZE_BANDS.eme.upTo as number
/** Smallest turnover that is a Large Enterprise; a QSE is below it. */
export const QSE_TURNOVER_CEILING = COMPANY_SIZE_BANDS.qse.below as number

export type DeemedLevelRule = {
  /** Sizes the rule applies to. */
  appliesTo: CompanySizeClass[]
  /** Black ownership needed, as a fraction (0.51 = 51%). Null: any ownership. */
  minBlackOwnership: number | null
  level: string
  recognitionPercentage: number
  /** The engine's wording, kept exactly as before this file existed. */
  engineReason: (sizeName: string) => string
  /** What the company screens say, in plain words. */
  plainReason: string
}

/** First matching rule wins. */
export const DEEMED_LEVEL_RULES: readonly DeemedLevelRule[] = [
  {
    appliesTo: ['eme', 'qse'],
    minBlackOwnership: 1,
    level: 'Level 1',
    recognitionPercentage: 135,
    engineReason: (sizeName) =>
      `A 100% black-owned ${sizeName}, measured on the flow-through principle, is elevated to Level One Contributor.`,
    plainReason: 'A company of this size that is 100% black owned is automatically a Level 1 contributor.',
  },
  {
    appliesTo: ['eme', 'qse'],
    minBlackOwnership: 0.51,
    level: 'Level 2',
    recognitionPercentage: 125,
    engineReason: (sizeName) =>
      `A ${sizeName} that is at least 51% black owned, measured on the flow-through principle, is elevated to Level Two Contributor.`,
    plainReason: 'A company of this size that is at least 51% black owned is automatically a Level 2 contributor.',
  },
  {
    appliesTo: ['eme'],
    minBlackOwnership: null,
    level: 'Level 4',
    recognitionPercentage: 100,
    engineReason: () => 'An Exempted Micro-Enterprise is deemed to be a Level Four Contributor.',
    plainReason: 'A company with turnover of R10 million or less is automatically a Level 4 contributor.',
  },
]

/** The first deemed-level rule that applies, or null (a QSE under 51% black owned, or a Large Enterprise). */
export function matchDeemedLevelRule(size: CompanySizeClass, blackOwnership: number | null): DeemedLevelRule | null {
  return (
    DEEMED_LEVEL_RULES.find(
      (rule) =>
        rule.appliesTo.includes(size) &&
        (rule.minBlackOwnership == null || (blackOwnership != null && blackOwnership >= rule.minBlackOwnership)),
    ) ?? null
  )
}
