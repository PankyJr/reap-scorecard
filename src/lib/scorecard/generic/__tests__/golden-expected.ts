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
  /**
   * Skills Development!H23, cross-checked by 13 EMP201!B32
   * (SDL 100,000 x 100 = 10,000,000; SDL is 1% of the leviable payroll).
   * The metric extractor cannot find it — the EMP201 sheet has no "leviable"
   * label — so it arrives via the Skills Development import.
   */
  leviableAmount: 10_000_000,
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

/**
 * ED & SD beneficiary tables. Amounts live in column C of each table; the
 * sheet's own C39 / C60 totals are checksums only.
 */
export const EXPECTED_ED_ROWS = [
  { name: 'Golden Test ED Beneficiary A', amount: 9_000, sourceCell: 'C25', sourceRowNumber: 25 },
  { name: 'Golden Test ED Beneficiary B', amount: 5_500, sourceCell: 'C26', sourceRowNumber: 26 },
] as const
export const EXPECTED_SD_ROWS = [
  { name: 'Golden Test SD Beneficiary A', amount: 18_000, sourceCell: 'C45', sourceRowNumber: 45 },
  { name: 'Golden Test SD Beneficiary B', amount: 11_000, sourceCell: 'C46', sourceRowNumber: 46 },
] as const
/** 9,000 + 5,500 — matches the sheet's C39. */
export const EXPECTED_ED_TOTAL = 14_500
/** 18,000 + 11,000 — matches the sheet's C60. */
export const EXPECTED_SD_TOTAL = 29_000

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
 * ED and SD follow the same two-stage pattern as SED: the importer leaves
 * evidence unconfirmed, so nothing is recognised until a consultant ticks it.
 *
 * As imported (evidenceProvided = false): 0.00 for both.
 *
 * Once evidence is confirmed, benefit factor 1.0 (phase-1 grants):
 *   ED: recognised 9,000 + 5,500 = 14,500
 *       14,500 / 2,000,000 = 0.00725 achieved against a 0.01 target
 *       0.00725 / 0.01 = 0.725  ->  0.725 x 5 points  = 3.625
 *                                -> roundPoints() 2dp  = 3.63
 *   SD: recognised 18,000 + 11,000 = 29,000
 *       29,000 / 2,000,000 = 0.0145 achieved against a 0.02 target
 *       0.0145 / 0.02 = 0.725   ->  0.725 x 10 points = 7.25
 *
 * Both land on the same 72.5% of target but different point totals, because
 * the elements carry different weightings — a useful pairing: a swap between
 * ED and SD would change the points even though the ratio is identical.
 */
export const EXPECTED_ED_POINTS_AS_IMPORTED = 0
export const EXPECTED_SD_POINTS_AS_IMPORTED = 0
/** 3.625 raw; the engine stores points to 2dp (scoring.ts roundPoints). */
export const EXPECTED_ED_POINTS_WITH_EVIDENCE = 3.63
export const EXPECTED_SD_POINTS_WITH_EVIDENCE = 7.25

/**
 * With evidence confirmed across ED, SD and SED:
 *   ownership 14.80 + ED 3.63 + SD 7.25 + SED 3.00 = 28.68
 * Still below the 40-point floor, so still Non-compliant.
 */
export const EXPECTED_RAW_TOTAL_WITH_EVIDENCE = 28.68

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
/**
 * BEHAVIOURAL CHANGE from the ED/SD row-level import.
 *
 * Before, ED and SD had no contributions at all, so both elements were
 * `not_started` and their priority sub-minimums could not be evaluated:
 *   ED 40% of 5  = 2.00 threshold  -> not evaluated
 *   SD 40% of 10 = 4.00 threshold  -> not evaluated
 *   -> nothing failed, no discount.
 *
 * Now the beneficiaries import, the elements become `partial`, and both
 * sub-minimums ARE evaluated against 0.00 achieved points (evidence is
 * unconfirmed on import, so nothing is recognised):
 *   ED 0.00 < 2.00 -> FAILS
 *   SD 0.00 < 4.00 -> FAILS
 *   -> discountApplied = true.
 *
 * Statement 000 discounts by exactly one level however many sub-minimums
 * fail, and the preliminary level is already the bottom band, so the final
 * level stays Non-compliant.
 */
export const EXPECTED_DISCOUNT_APPLIED = true
export const EXPECTED_FAILED_PRIORITY_KEYS = [
  'priority.supplier_development',
  'priority.enterprise_development',
]
export const EXPECTED_READINESS_COMPLETE = false
export const EXPECTED_TOTAL_BASE_AVAILABLE = 109
export const EXPECTED_TOTAL_BONUS_AVAILABLE = 9

// ---------------------------------------------------------------------------
// Skills Development
// ---------------------------------------------------------------------------

/**
 * Inputs read from the 'Skills Development ' sheet's INPUT rows (not its
 * H44/H73/H102 point cells, which hold the workbook's own scoring).
 */
export const EXPECTED_SKILLS_INPUTS = {
  /** H23 (literal) — also 13 EMP201!B32 = SDL 100,000 x 100 */
  leviableAmount: 10_000_000,
  /** H81 (literal) */
  totalEmployees: 2_000,
  /** B23:G23 */
  generalTrainingSpend: {
    african_male: 120_000,
    coloured_male: 12_000,
    indian_male: 4_000,
    african_female: 90_000,
    coloured_female: 9_000,
    indian_female: 2_000,
  },
  /** B52:G52 */
  bursarySpend: {
    african_male: 60_000,
    coloured_male: 6_000,
    indian_male: 2_000,
    african_female: 45_000,
    coloured_female: 4_500,
    indian_female: 1_000,
  },
  /** B81:G81 */
  learnerHeadcount: {
    african_male: 30,
    coloured_male: 3,
    indian_male: 1,
    african_female: 25,
    coloured_female: 3,
    indian_female: 1,
  },
  /** B109 */
  disabilityTrainingSpend: 18_000,
  /** B115 */
  learnersCompleted: 12,
  /** Not in the workbook at all — see the importer docblock. */
  learnersAbsorbed: null,
} as const

/**
 * EAP five-step, per Statement 300. Using the synthetic EAP target set
 * (AM .435, CM .046, IM .017, AF .375, CF .042, IF .010; sum 0.925):
 *
 *   adjustedEAP_b = eap_b / 0.925
 *   share_b       = value_b / denominator
 *   splitTarget_b = adjustedEAP_b x overallTarget
 *   maxPoints_b   = adjustedEAP_b x availablePoints
 *   points_b      = min(share_b / splitTarget_b, 1) x maxPoints_b
 *
 * GENERAL TRAINING — denominator 10,000,000, target 3.5%, 6 points
 *   band | spend   | share    | splitTgt   | ratio    | maxPts   | points
 *   AM   | 120,000 | 0.012    | 0.01645946 | 0.729098 | 2.821622 | 2.057143
 *   CM   |  12,000 | 0.0012   | 0.00174054 | 0.689459 | 0.298378 | 0.205714
 *   IM   |   4,000 | 0.0004   | 0.00064324 | 0.621849 | 0.110270 | 0.068571
 *   AF   |  90,000 | 0.009    | 0.01418919 | 0.634286 | 2.432432 | 1.542857
 *   CF   |   9,000 | 0.0009   | 0.00158919 | 0.566327 | 0.272432 | 0.154286
 *   IF   |   2,000 | 0.0002   | 0.00037838 | 0.528571 | 0.064865 | 0.034286
 *                                            TOTAL = 4.062857 -> 2dp = 4.06
 *
 * BURSARIES — denominator 10,000,000, target 2.5%, 4 points
 *   Every band sits at exactly 0.48 of its split target (spend is half the
 *   general figures against a target 5/7 as large), so
 *   TOTAL = 0.48 x 4 = 1.92 ... computed exactly: 1.896 -> 2dp = 1.90
 *
 * LEARNERSHIPS — denominator 2,000 staff, target 5%, 6 points
 *   band | count | share  | splitTgt   | ratio    | maxPts   | points
 *   AM   |    30 | 0.015  | 0.02351351 | 0.637931 | 2.821622 | 1.80
 *   CM   |     3 | 0.0015 | 0.00248649 | 0.603261 | 0.298378 | 0.18
 *   IM   |     1 | 0.0005 | 0.00091892 | 0.544118 | 0.110270 | 0.06
 *   AF   |    25 | 0.0125 | 0.02027027 | 0.616667 | 2.432432 | 1.50
 *   CF   |     3 | 0.0015 | 0.00227027 | 0.660714 | 0.272432 | 0.18
 *   IF   |     1 | 0.0005 | 0.00054054 | 0.925000 | 0.064865 | 0.06
 *                                             TOTAL = 3.78
 *
 * DISABLED LEARNERS — plain proportional, not EAP-split
 *   18,000 / 10,000,000 = 0.0018 against a 0.003 target
 *   0.0018 / 0.003 = 0.6  ->  0.6 x 4 points = 2.40
 *
 * ABSORPTION BONUS — absorbed learners are not in the workbook, so the
 * indicator stays missing_inputs and the 5 bonus points are not awarded.
 *
 *   element base total = 4.06 + 1.90 + 2.40 + 3.78 = 12.14 of 20
 */
export const EXPECTED_SKILLS_POINTS_WITH_GATES = {
  'skills_development.expenditure.black_people': 4.06,
  'skills_development.bursaries.black_students': 1.9,
  'skills_development.expenditure.disabled_black_people': 2.4,
  'skills_development.learnerships': 3.78,
} as const
export const EXPECTED_SKILLS_BASE_TOTAL_WITH_GATES = 12.14
export const EXPECTED_SKILLS_BONUS_WITH_GATES = 0

/**
 * As imported the four eligibility gates are unconfirmed (they are nowhere in
 * the workbook), so every indicator is blocked and the element scores zero.
 */
export const EXPECTED_SKILLS_POINTS_AS_IMPORTED = 0

/**
 * Skills priority sub-minimum: 40% of the 20 available points -> 8.00.
 * With gates confirmed, 12.14 >= 8.00 -> PASSES.
 * As imported the indicators are blocked, so it cannot be evaluated at all.
 */
export const EXPECTED_SKILLS_SUBMINIMUM = {
  key: 'priority.skills_development',
  basisPoints: 20,
  thresholdPoints: 8,
  achievedPointsWithGates: 12.14,
  passedWithGates: true,
} as const

/**
 * Everything confirmed — evidence on ED/SD/SED and the four skills gates:
 *   ownership 14.80 + skills 12.14 + ED 3.63 + SD 7.25 + SED 3.00 = 40.82
 * That clears the 40-point floor, so the level moves off Non-compliant to
 * Level 8 (40 <= points < 55) at 10% recognition.
 */
export const EXPECTED_RAW_TOTAL_ALL_CONFIRMED = 40.82
export const EXPECTED_LEVEL_ALL_CONFIRMED = 'Level 8'
export const EXPECTED_RECOGNITION_ALL_CONFIRMED = 10

// ---------------------------------------------------------------------------
// Management Control
// ---------------------------------------------------------------------------

/**
 * Inputs. Board / executives come from 'Management Control'!G4:G20; the
 * occupational bands and disabilities from 'Employment Equity'.
 */
export const EXPECTED_MC_INPUTS = {
  board: { total: 20, black: 8, blackWomen: 3 },
  executiveDirectors: { total: 8, black: 3, blackWomen: 1 },
  otherExecutiveManagement: { total: 50, black: 21, blackWomen: 11 },
  seniorManagementTotal: 200,
  middleManagementTotal: 500,
  juniorManagementTotal: 1_000,
  blackEmployeesWithDisabilities: 13,
  totalEmployees: 2_000,
} as const

/**
 * DIRECT groups — plain proportional, no EAP.
 *
 *   board black        :  8/20  = 0.40   / 0.50 = 0.80  -> 0.80 x 2 = 1.60
 *   board women        :  3/20  = 0.15   / 0.25 = 0.60  -> 0.60 x 1 = 0.60
 *   exec dir black     :  3/8   = 0.375  / 0.50 = 0.75  -> 0.75 x 2 = 1.50
 *   exec dir women     :  1/8   = 0.125  / 0.25 = 0.50  -> 0.50 x 1 = 0.50
 *   other exec black   : 21/50  = 0.42   / 0.60 = 0.70  -> 0.70 x 2 = 1.40
 *   other exec women   : 11/50  = 0.22   / 0.30 = 0.7333 -> x 1     = 0.73
 *
 * EAP BANDS — the same five-step as Skills, with the female indicators
 * re-normalising the EAP over the three female bands (sum 0.427).
 * Counts and denominators were chosen so NO band caps, so every one of the
 * six figures is genuinely proportional:
 *
 *   senior (200)  people 60% / 2pts -> 1.350000 -> 1.35
 *                 women  30% / 1pt  -> 0.583333 -> 0.58
 *   middle (500)  people 75% / 2pts -> 1.456000 -> 1.46
 *                 women  38% / 1pt  -> 0.657895 -> 0.66
 *   junior (1000) people 88% / 1pt  -> 0.797727 -> 0.80
 *                 women  44% / 1pt  -> 0.743182 -> 0.74
 *
 * DISABILITIES — proportional, no EAP.
 *   13/2000 = 0.0065 / 0.02 = 0.325  -> 0.325 x 2 = 0.65
 *
 *   element total = 1.60 + 0.60 + 1.50 + 0.50 + 1.40 + 0.73
 *                 + 1.35 + 0.58 + 1.46 + 0.66 + 0.80 + 0.74 + 0.65
 *                 = 12.57 of 19
 *
 * All thirteen point values are distinct, so a swapped indicator cannot hide.
 */
export const EXPECTED_MC_POINTS_WITH_EAP = {
  'management_control.board.black_people': 1.6,
  'management_control.board.black_women': 0.6,
  'management_control.executive_directors.black_people': 1.5,
  'management_control.executive_directors.black_women': 0.5,
  'management_control.other_executive_management.black_people': 1.4,
  'management_control.other_executive_management.black_women': 0.73,
  'management_control.senior_management.black_people': 1.35,
  'management_control.senior_management.black_women': 0.58,
  'management_control.middle_management.black_people': 1.46,
  'management_control.middle_management.black_women': 0.66,
  'management_control.junior_management.black_people': 0.8,
  'management_control.junior_management.black_women': 0.74,
  'management_control.employees_with_disabilities.black_people': 0.65,
} as const
export const EXPECTED_MC_BASE_TOTAL_WITH_EAP = 12.57
export const EXPECTED_MC_BASE_AVAILABLE = 19

/**
 * Without an EAP target set the six band indicators are blocked, but the seven
 * non-EAP indicators still score:
 *   1.60 + 0.60 + 1.50 + 0.50 + 1.40 + 0.73 + 0.65 = 6.98
 */
export const EXPECTED_MC_BASE_TOTAL_NO_EAP = 6.98

/**
 * The EAP row the workbook itself asserts, at Employment Equity!B30:G30.
 * These are the CLIENT's figures, not verified Stats SA published data.
 */
export const EXPECTED_WORKBOOK_EAP = {
  african_male: 0.435,
  coloured_male: 0.046,
  indian_male: 0.017,
  african_female: 0.375,
  coloured_female: 0.042,
  indian_female: 0.01,
} as const

/**
 * Everything confirmed, including MC with an EAP set:
 *   ownership 14.80 + skills 12.14 + MC 12.57 + ED 3.63 + SD 7.25 + SED 3.00
 *   = 53.39  ->  Level 8 (40 <= points < 55) at 10% recognition
 */
export const EXPECTED_RAW_TOTAL_WITH_MC = 53.39
export const EXPECTED_LEVEL_WITH_MC = 'Level 8'
