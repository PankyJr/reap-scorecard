/**
 * Canonical Generic Codes element set for New Scorecard Calculation.
 * Preferential Procurement remains attached via Formal Procurement Assessment.
 */

export const GENERIC_SCORECARD_ELEMENT_KEYS = [
  'ownership',
  'management_control',
  'skills_development',
  'preferential_procurement',
  'enterprise_development',
  'supplier_development',
  'socio_economic_development',
] as const

export type GenericScorecardElementKey = (typeof GENERIC_SCORECARD_ELEMENT_KEYS)[number]

export const GENERIC_SCORECARD_PRODUCT_NAME = 'REAP Generic Scorecard Calculator'
export const GENERIC_SCORECARD_RULE_VERSION = 'generic-codes-2019-v1'
