/**
 * Hand-computed expectations for the golden populated workbook.
 *
 * Fixture: test-fixtures/golden/golden-populated-workbook.xlsx
 * Built by: scripts/build-golden-workbook.mjs
 *
 * EVERY number below was computed by hand from the workbook cells and the rule
 * set in src/lib/scorecard/rules/generic-2019/scorecard.ts. None of it was
 * produced by running the engine and copying its output — that would pin
 * whatever the engine currently does, including its bugs. The arithmetic is
 * shown so a reviewer can re-verify each figure with a calculator.
 *
 * Achieved values were deliberately chosen BELOW their targets so the
 * proportional maths is exercised rather than capped at 100%, and so that no
 * two indicators share a value or a point score — a shared number can hide a
 * transposition or a mis-mapped row.
 */

// ---------------------------------------------------------------------------
// Extracted values — what the importer must read, per cell
// ---------------------------------------------------------------------------

/** Ownership!D4..D11 (verified level), Ownership!B4..B11 (weighting points). */
export const EXPECTED_OWNERSHIP_INPUTS = {
  /** D4 = H22 = 0.5*0.15 + 0.3*0.12 + 0.2*0.0725 = 0.075 + 0.036 + 0.0145 */
  blackVotingRightsPercentage: 0.1255,
  /** D5 = I22 = 0.5*0.08 + 0.3*0.05 + 0.2*0.025 = 0.04 + 0.015 + 0.005 */
  blackWomenVotingRightsPercentage: 0.06,
  /** D6, literal */
  blackEconomicInterestPercentage: 0.2,
  /** D7, literal */
  blackWomenEconomicInterestPercentage: 0.075,
  /** D8 = J22 = 0.5*0.03 + 0.3*0.02 + 0.2*0 = 0.015 + 0.006 */
  designatedGroupsEconomicInterestPercentage: 0.021,
  /** D11, literal */
  netValuePercentage: 0.15,
  /**
   * D10 = K22 = 0.065 IS populated in the sheet, but no metric definition
   * exists for `ownership.economic_interest.new_entrants.percentage`, so the
   * importer cannot read it. Pinned as null to catch the day that changes.
   */
  newEntrantsEconomicInterestPercentage: null,
} as const

/** NPAT Calculation sheet. */
export const EXPECTED_FINANCIAL = {
  /** B15 */
  revenue: 40_000_000,
  /** B23 */
  actualNpat: 2_000_000,
  /** B10, untouched from the real reference file */
  industryNpatMargin: 0.05725310234761103,
  /** 13 EMP201 is left unpopulated, so no leviable amount is importable. */
  leviableAmount: null,
} as const

/**
 * Deemed NPAT = revenue x industry margin x 25%
 *             = 40,000,000 x 0.05725310234761103 x 0.25
 *             = 572,531.0234761103
 * Actual (2,000,000) > deemed (572,531.02), so ACTUAL wins. Chosen
 * deliberately so the greater-of rule is pinned in a known direction.
 */
export const EXPECTED_DEEMED_NPAT = 572_531.0234761103
export const EXPECTED_APPLICABLE_NPAT = 2_000_000
export const EXPECTED_NPAT_SELECTION = 'actual'

/** SED!A13:C15 */
export const EXPECTED_SED_ROWS = [
  { name: 'Golden Test SED Beneficiary A', recognised: 6_000 },
  { name: 'Golden Test SED Beneficiary B', recognised: 4_500 },
  { name: 'Golden Test SED Beneficiary C', recognised: 1_500 },
] as const
/** 6,000 + 4,500 + 1,500 */
export const EXPECTED_SED_RECOGNISED_TOTAL = 12_000

// ---------------------------------------------------------------------------
// Scored values — points per indicator, computed by hand from the rule set
// ---------------------------------------------------------------------------

/**
 * Ownership. Voting-rights black people carries `plusOneVote`, and no exact
 * vote counts are supplied, so the engine uses its documented 25.1% fallback.
 *
 *   voting bp        : 0.1255 / 0.251 = 0.5   -> 0.5  x 4 = 2.00
 *   voting bw        : 0.06   / 0.10  = 0.6   -> 0.6  x 2 = 1.20
 *   economic bp      : 0.20   / 0.25  = 0.8   -> 0.8  x 4 = 3.20
 *   economic bw      : 0.075  / 0.10  = 0.75  -> 0.75 x 2 = 1.50
 *   designated groups: 0.021  / 0.03  = 0.7   -> 0.7  x 3 = 2.10
 *   net value        : 0.15   / 0.25  = 0.6   -> 0.6  x 8 = 4.80
 *   new entrants     : input not importable   -> missing_inputs, no points
 *
 *   base total = 2.00 + 1.20 + 3.20 + 1.50 + 2.10 + 4.80 = 14.80 of 25
 */
export const EXPECTED_OWNERSHIP_POINTS = {
  'ownership.voting_rights.black_people': 2.0,
  'ownership.voting_rights.black_women': 1.2,
  'ownership.economic_interest.black_people': 3.2,
  'ownership.economic_interest.black_women': 1.5,
  'ownership.economic_interest.designated_groups': 2.1,
  'ownership.net_value': 4.8,
} as const
export const EXPECTED_OWNERSHIP_BASE_TOTAL = 14.8
export const EXPECTED_OWNERSHIP_BASE_AVAILABLE = 25
/** One indicator (new entrants) cannot be scored, so the element is partial. */
export const EXPECTED_OWNERSHIP_STATUS = 'partial'

/**
 * Priority sub-minimum — ownership net value.
 * Statement 000: 40% of the 8 net-value points -> threshold 8 x 0.4 = 3.20.
 * Achieved 4.80 >= 3.20, so it PASSES and triggers no discount.
 */
export const EXPECTED_NET_VALUE_SUBMINIMUM = {
  key: 'priority.ownership.net_value',
  basisPoints: 8,
  thresholdPoints: 3.2,
  achievedPoints: 4.8,
  evaluated: true,
  passed: true,
} as const

/**
 * Contribution targets from the applicable NPAT of 2,000,000:
 *   enterprise development  1% = 20,000
 *   supplier development    2% = 40,000
 *   socio-economic dev      1% = 20,000
 */
export const EXPECTED_CONTRIBUTION_TARGETS = {
  enterpriseDevelopment: 20_000,
  supplierDevelopment: 40_000,
  socioEconomicDevelopment: 20_000,
} as const

/**
 * SED as imported. The importer sets `evidenceProvided: false` on every row
 * (evidence must be confirmed by a human), so no contribution is recognised
 * and the element scores zero despite 12,000 of recognised amounts being read.
 */
export const EXPECTED_SED_POINTS_AS_IMPORTED = 0

/**
 * SED once evidence is confirmed — pins the arithmetic itself.
 * Benefit factor 1.0 (phase 1 grants), black beneficiary share 100%:
 *   recognised = 6,000 + 4,500 + 1,500 = 12,000
 *   12,000 / 2,000,000 = 0.006 achieved against a 0.01 target
 *   0.006 / 0.01 = 0.6  ->  0.6 x 5 points = 3.00
 */
export const EXPECTED_SED_POINTS_WITH_EVIDENCE = 3.0

/**
 * Whole-scorecard outcome. Only ownership contributes points; management
 * control, skills, procurement, ED and SD are unpopulated or not importable.
 *   raw total = 14.80  ->  below the 40-point floor  ->  Non-compliant, 0%
 * No sub-minimum FAILS (net value passes; the rest cannot be evaluated), so no
 * one-level discount is applied.
 */
export const EXPECTED_RAW_TOTAL_POINTS = 14.8
export const EXPECTED_PRELIMINARY_LEVEL = 'Non-compliant'
export const EXPECTED_RECOGNITION_PERCENTAGE = 0
export const EXPECTED_DISCOUNT_APPLIED = false
export const EXPECTED_READINESS_COMPLETE = false
export const EXPECTED_TOTAL_BASE_AVAILABLE = 109
export const EXPECTED_TOTAL_BONUS_AVAILABLE = 9
