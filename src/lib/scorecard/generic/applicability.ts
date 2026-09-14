/**
 * Generic-code applicability gate.
 *
 * The full generic scorecard only produces a final B-BBEE level for a Large
 * Enterprise measured under the Generic Codes. Everything else — EMEs, QSEs,
 * and any entity governed by a sector code — is routed away from a generic
 * final level and told what applies instead.
 */

import type { RuleSource } from '../rules/types'

export const EME_REVENUE_CEILING = 10_000_000
export const QSE_REVENUE_CEILING = 50_000_000

const STATEMENT_000: RuleSource = {
  citation: 'Amended Code Series 000, Statement 000 §§4, 5 and 7',
  notice: 'GN 306 of 2019, Government Gazette 42496, 31 May 2019',
  url: 'https://www.gov.za/sites/default/files/gcis_document/201905/42496gen306.pdf',
  standing: 'gazetted',
}

export type EntityClassification = 'eme' | 'qse' | 'generic' | 'unresolved'

export type FullScorecardElection = {
  elected: boolean
  reason: string
  evidence: string | null
  electedBy: string
  electedAt: string
}

export type ApplicabilityInputs = {
  measurementPeriodStart: string | null
  measurementPeriodEnd: string | null
  annualRevenue: number | null
  entityType: string | null
  sector: string | null
  sectorCodeApplies: boolean | null
  sectorCodeName: string | null
  blackOwnershipPercentage: number | null
  blackWomenOwnershipPercentage: number | null
  isStartUp: boolean | null
  /** Set where an EME or QSE elects to be measured on the full generic scorecard. */
  fullScorecardElection?: FullScorecardElection | null
}

export const EMPTY_APPLICABILITY_INPUTS: ApplicabilityInputs = {
  measurementPeriodStart: null,
  measurementPeriodEnd: null,
  annualRevenue: null,
  entityType: null,
  sector: null,
  sectorCodeApplies: null,
  sectorCodeName: null,
  blackOwnershipPercentage: null,
  blackWomenOwnershipPercentage: null,
  isStartUp: null,
  fullScorecardElection: null,
}

export type DeemedStatus = {
  level: string
  recognitionPercentage: number
  reason: string
}

export type ApplicabilityResult = {
  classification: EntityClassification
  classificationReason: string
  /** True when the generic codes govern this entity at all. */
  genericCodeApplies: boolean
  /** True when the full generic scorecard may produce a final level. */
  mayProduceGenericFinalLevel: boolean
  /** Reasons a generic final level is withheld. */
  blockingReasons: string[]
  /** Deemed status for an EME or QSE that is not electing the full scorecard. */
  deemedStatus: DeemedStatus | null
  missingInputs: string[]
  warnings: string[]
  source: RuleSource
}

function classify(revenue: number | null, isStartUp: boolean | null): { classification: EntityClassification; reason: string } {
  if (isStartUp === true) {
    return {
      classification: 'eme',
      reason:
        'Start-up enterprises are ordinarily measured as Exempted Micro-Enterprises unless they tender for work above the EME threshold.',
    }
  }
  if (revenue == null) {
    return { classification: 'unresolved', reason: 'Annual revenue has not been captured.' }
  }
  if (revenue <= EME_REVENUE_CEILING) {
    return {
      classification: 'eme',
      reason: `Annual revenue of R${revenue.toLocaleString('en-ZA')} is at or below the R10 million Exempted Micro-Enterprise ceiling.`,
    }
  }
  if (revenue < QSE_REVENUE_CEILING) {
    return {
      classification: 'qse',
      reason: `Annual revenue of R${revenue.toLocaleString('en-ZA')} falls between R10 million and R50 million, so the Qualifying Small Enterprise scorecard applies.`,
    }
  }
  return {
    classification: 'generic',
    reason: `Annual revenue of R${revenue.toLocaleString('en-ZA')} is at or above R50 million, so the entity is measured as a Large Enterprise on the generic scorecard.`,
  }
}

function deemedStatusFor(
  classification: EntityClassification,
  blackOwnershipPercentage: number | null,
): DeemedStatus | null {
  if (classification !== 'eme' && classification !== 'qse') return null
  const label = classification === 'eme' ? 'Exempted Micro-Enterprise' : 'Qualifying Small Enterprise'

  if (blackOwnershipPercentage != null && blackOwnershipPercentage >= 1) {
    return {
      level: 'Level 1',
      recognitionPercentage: 135,
      reason: `A 100% black-owned ${label}, measured on the flow-through principle, is elevated to Level One Contributor.`,
    }
  }
  if (blackOwnershipPercentage != null && blackOwnershipPercentage >= 0.51) {
    return {
      level: 'Level 2',
      recognitionPercentage: 125,
      reason: `A ${label} that is at least 51% black owned, measured on the flow-through principle, is elevated to Level Two Contributor.`,
    }
  }
  if (classification === 'eme') {
    return {
      level: 'Level 4',
      recognitionPercentage: 100,
      reason: 'An Exempted Micro-Enterprise is deemed to be a Level Four Contributor.',
    }
  }
  return {
    level: 'Requires QSE scorecard',
    recognitionPercentage: 0,
    reason:
      'A Qualifying Small Enterprise that is less than 51% black owned must be measured on the QSE scorecard, which this calculator does not implement.',
  }
}

export function evaluateApplicability(inputs: ApplicabilityInputs): ApplicabilityResult {
  const missingInputs: string[] = []
  const warnings: string[] = []
  const blockingReasons: string[] = []

  if (inputs.measurementPeriodStart == null || inputs.measurementPeriodEnd == null) {
    missingInputs.push('Measurement period')
  }
  if (inputs.annualRevenue == null) missingInputs.push('Annual revenue')
  if (inputs.entityType == null) missingInputs.push('Entity type')
  if (inputs.sector == null) missingInputs.push('Sector')
  if (inputs.sectorCodeApplies == null) missingInputs.push('Whether a sector code applies')
  if (inputs.blackOwnershipPercentage == null) missingInputs.push('Black ownership percentage')
  if (inputs.isStartUp == null) missingInputs.push('Whether the entity is a start-up')

  const { classification, reason } = classify(inputs.annualRevenue, inputs.isStartUp)
  const election = inputs.fullScorecardElection ?? null

  if (inputs.sectorCodeApplies === true) {
    const sectorName = inputs.sectorCodeName?.trim() || 'the applicable sector code'
    blockingReasons.push(
      `${sectorName} applies to this entity, so the generic codes do not produce its B-BBEE level. Measure the entity under its sector code.`,
    )
    return {
      classification,
      classificationReason: reason,
      genericCodeApplies: false,
      mayProduceGenericFinalLevel: false,
      blockingReasons,
      deemedStatus: null,
      missingInputs,
      warnings,
      source: STATEMENT_000,
    }
  }

  if (classification === 'unresolved') {
    blockingReasons.push('The entity could not be classified because annual revenue has not been captured.')
    return {
      classification,
      classificationReason: reason,
      genericCodeApplies: false,
      mayProduceGenericFinalLevel: false,
      blockingReasons,
      deemedStatus: null,
      missingInputs,
      warnings,
      source: STATEMENT_000,
    }
  }

  const deemedStatus = deemedStatusFor(classification, inputs.blackOwnershipPercentage)

  if (classification !== 'generic') {
    const label = classification === 'eme' ? 'Exempted Micro-Enterprise' : 'Qualifying Small Enterprise'
    if (!election?.elected) {
      blockingReasons.push(
        `This entity is an ${label}. The full generic scorecard does not apply to it, so no generic final level is produced.`,
      )
      return {
        classification,
        classificationReason: reason,
        genericCodeApplies: true,
        mayProduceGenericFinalLevel: false,
        blockingReasons,
        deemedStatus,
        missingInputs,
        warnings,
        source: STATEMENT_000,
      }
    }

    if (!election.reason?.trim() || !election.evidence?.trim()) {
      blockingReasons.push(
        `A full scorecard election for this ${label} requires both a recorded reason and supporting evidence.`,
      )
      return {
        classification,
        classificationReason: reason,
        genericCodeApplies: true,
        mayProduceGenericFinalLevel: false,
        blockingReasons,
        deemedStatus,
        missingInputs,
        warnings,
        source: STATEMENT_000,
      }
    }

    warnings.push(
      `This ${label} has elected to be measured on the full generic scorecard (recorded by ${election.electedBy} on ${election.electedAt}). Its deemed status is not applied.`,
    )
    return {
      classification,
      classificationReason: reason,
      genericCodeApplies: true,
      mayProduceGenericFinalLevel: missingInputs.length === 0,
      blockingReasons: missingInputs.length === 0 ? [] : [`Applicability inputs are incomplete: ${missingInputs.join(', ')}.`],
      deemedStatus,
      missingInputs,
      warnings,
      source: STATEMENT_000,
    }
  }

  if (missingInputs.length > 0) {
    blockingReasons.push(`Applicability inputs are incomplete: ${missingInputs.join(', ')}.`)
  }

  return {
    classification,
    classificationReason: reason,
    genericCodeApplies: true,
    mayProduceGenericFinalLevel: blockingReasons.length === 0,
    blockingReasons,
    deemedStatus: null,
    missingInputs,
    warnings,
    source: STATEMENT_000,
  }
}
