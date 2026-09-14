/**
 * Seed the PUBLIC DEMO instance with fabricated supplier data.
 *
 *   npx tsx scripts/seed-demo-data.ts
 *
 * ── WHY THIS SCRIPT REFUSES TO RUN BY DEFAULT ───────────────────────────────
 *
 * This writes rows. Pointed at the wrong project it would inject fake suppliers
 * into a database holding real client data. So it is fail-closed: it will not
 * run unless the operator NAMES the target project ref in DEMO_SUPABASE_PROJECT_REF
 * and that ref matches the URL being used. Naming the wrong thing is a typo;
 * naming nothing is an accident, and an accident must not be enough.
 *
 * It additionally hard-refuses the known production and staging refs, so even a
 * correct-looking pair of variables cannot reach them.
 *
 * ── REQUIRED ENVIRONMENT ────────────────────────────────────────────────────
 *
 *   NEXT_PUBLIC_SUPABASE_URL       the DEMO project URL
 *   SUPABASE_SERVICE_ROLE_KEY      the DEMO project service-role key
 *   DEMO_SUPABASE_PROJECT_REF      the demo project ref, typed deliberately
 *
 * Keep these in a gitignored file (e.g. .env.demo.local) and load it:
 *   set -a; . ./.env.demo.local; set +a; npx tsx scripts/seed-demo-data.ts
 *
 * ── DATA ────────────────────────────────────────────────────────────────────
 *
 * Every company and supplier name below is invented and carries a "(Demo)"
 * suffix so it can never be mistaken for a real registered entity. Spend
 * figures are plausible but fictional.
 *
 * Recognition percentages and B-BBEE spend are NOT hardcoded: they are produced
 * by the application's own calculateSupplierRow(), so seeded data cannot drift
 * away from what the engine would compute.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { calculateSupplierRow, type ProcurementSupplierInput } from '../src/lib/procurement/rows'
import { calculateProcurementResults } from '../src/lib/procurement/assessment'
import { DEMO_USER_EMAIL } from '../src/lib/demo/demoMode'
import { calculateGenericScorecard } from '../src/lib/scorecard/generic'
import {
  assessmentResultColumns,
  buildGenericInputs,
  calculationRunRow,
  priorityResultRows,
  type StoredAssessmentRow,
  type StoredContributionRow,
  type StoredElementRow,
} from '../src/lib/scorecard/generic/persistence'
import {
  GENERIC_SCORECARD_ELEMENT_KEYS,
  GENERIC_SCORECARD_PRODUCT_NAME,
  GENERIC_SCORECARD_RULE_VERSION,
} from '../src/lib/scorecard/generic/entry'
import { normaliseSourceProcurementPoints } from '../src/lib/scorecard/generic/elements/procurement'
import type { ProcurementSnapshot } from '../src/lib/scorecard/generic/elements/procurement'
import { validateEapSetForGenericEngine } from '../src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/eap-target-validation'

// Projects this script must never touch, whatever the environment says.
const FORBIDDEN_REFS: Record<string, string> = {
  pmjuiynjelhjlpyohbvk: 'PRODUCTION (real REAP Solutions client data)',
  jzvqyryblsfxlinvoiuf: 'STAGING (shared QA data)',
}

const DEMO_COMPANY_NAME = 'Karoo Ridge Manufacturing (Demo)'
const ASSESSMENT_YEAR = 2026

/**
 * Fabricated suppliers, spread deliberately across levels so that changing one
 * assumption visibly moves the score in the what-if modelling screen:
 *  - large Level 4 spend at 100% recognition is the obvious upgrade candidate
 *  - two non-compliant suppliers create clear headroom
 *  - EME/QSE mix exercises the separate EME and QSE category targets
 */
export const SUPPLIERS: ProcurementSupplierInput[] = [
  // Large, compliant, the backbone of the spend
  { supplier_name: 'Thornveld Steel Supplies (Demo)', supplier_type: 'Generic', level: '4', value_ex_vat: 8_400_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Blue Crane Industrial Coatings (Demo)', supplier_type: 'Generic', level: '2', value_ex_vat: 6_150_000, is_51_black_owned: true, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Silverthorn Freight Systems (Demo)', supplier_type: 'Generic', level: '4', value_ex_vat: 5_720_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Highveld Precision Castings (Demo)', supplier_type: 'Generic', level: '3', value_ex_vat: 4_980_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },

  // The obvious improvement targets — large spend, poor recognition
  { supplier_name: 'Graymoor Bulk Chemicals (Demo)', supplier_type: 'Generic', level: '8', value_ex_vat: 3_640_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Ironbark Import Agency (Demo)', supplier_type: 'Generic', level: 'Non-Compliant', value_ex_vat: 2_910_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Meridian Tooling Imports (Demo)', supplier_type: 'Generic', level: '7', value_ex_vat: 1_480_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },

  // QSEs — exercise the QSE category target
  { supplier_name: 'Umdoni Valley Packaging (Demo)', supplier_type: 'QSE', level: '1', value_ex_vat: 2_340_000, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: false, is_51_percent_flow_through: true },
  { supplier_name: 'Rooiberg Fabrication Works (Demo)', supplier_type: 'QSE', level: '2', value_ex_vat: 1_875_000, is_51_black_owned: true, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Stillwater Calibration Services (Demo)', supplier_type: 'QSE', level: '4', value_ex_vat: 1_260_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Nkosazana Technical Cleaning (Demo)', supplier_type: 'QSE', level: '1', value_ex_vat: 980_000, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true, is_51_percent_flow_through: false },

  // EMEs — exercise the EME category target
  { supplier_name: 'Sandstone Courier Collective (Demo)', supplier_type: 'EME', level: '1', value_ex_vat: 845_000, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: false, is_51_percent_flow_through: true },
  { supplier_name: 'Wildeklawer Catering Co-op (Demo)', supplier_type: 'EME', level: '1', value_ex_vat: 612_000, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true, is_51_percent_flow_through: false },
  { supplier_name: 'Bushbuck Signage Studio (Demo)', supplier_type: 'EME', level: '2', value_ex_vat: 487_500, is_51_black_owned: true, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Klipfontein Safety Wear (Demo)', supplier_type: 'EME', level: '1', value_ex_vat: 396_000, is_51_black_owned: true, is_30_black_women_owned: false, is_51_bdgs: true, is_51_percent_flow_through: false },
  { supplier_name: 'Loeriesfontein Plant Hire (Demo)', supplier_type: 'EME', level: '4', value_ex_vat: 318_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },

  // Mid-range, mixed
  { supplier_name: 'Drakensberg IT Managed Services (Demo)', supplier_type: 'Generic', level: '5', value_ex_vat: 1_640_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Tsitsikamma Timber Products (Demo)', supplier_type: 'Generic', level: '6', value_ex_vat: 1_205_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
]

function assertDemoTarget(url: string): string {
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)
  if (!match) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a Supabase project URL: ${url}`)
  }
  const ref = match[1]

  const forbidden = FORBIDDEN_REFS[ref]
  if (forbidden) {
    throw new Error(
      `REFUSING TO SEED. The target project ${ref} is ${forbidden}.\n` +
        'This script only ever writes to a dedicated demo project.',
    )
  }

  const declared = (process.env.DEMO_SUPABASE_PROJECT_REF ?? '').trim()
  if (!declared) {
    throw new Error(
      'REFUSING TO SEED. Set DEMO_SUPABASE_PROJECT_REF to the demo project ref.\n' +
        'Naming the target is deliberate: it is what stops this running against the wrong database by accident.',
    )
  }
  if (declared !== ref) {
    throw new Error(
      `REFUSING TO SEED. DEMO_SUPABASE_PROJECT_REF is "${declared}" but the URL points at "${ref}".`,
    )
  }

  return ref
}

// ===========================================================================
// Pass 2 — one completed Generic scorecard assessment
// ===========================================================================
//
// Without this the demo lands on empty screens for everything migrations 13-17
// build: the Assessment Hub, the seven element screens, the Result page and the
// what-if modelling.
//
// NOTHING BELOW HARDCODES A SCORE. The inputs are fabricated; the points, the
// level, the discount and the priority sub-minimum outcomes are all produced by
// the application's own engine via calculateGenericScorecard(), and persisted
// through the same helpers the calculate action uses. Seeded data therefore
// cannot drift away from what the app computes, and this doubles as an
// end-to-end exercise of the generic engine.
//
// The inputs are tuned to land on Level 4 with ONE priority sub-minimum missed
// (Skills Development). That is deliberately not a flattering result: a Level 1
// demo has no headroom, and the what-if modelling screen is the most
// interesting thing here only when there is something left to improve.

const GENERIC_ASSESSMENT_NAME = 'Karoo Ridge 2026 Generic Scorecard (Demo)'
const EAP_TARGET_SET_NAME = 'Demo EAP targets 2026'

/**
 * Economically Active Population shares driving the EAP five-step in Management
 * Control and Skills Development. Plausible national proportions; fabricated,
 * like everything else here. Only the six black demographics are carried — the
 * engine renormalises across the bands in scope, so the absolute scale is not
 * load-bearing.
 */
/**
 * `eap_target_set_values.band_key` is NOT NULL because the table is shared with
 * the Management Control admin grid, which stores band_key x {black_people,
 * black_women} — a different model entirely (see eap-target-set.ts, which calls
 * this out as a known conflict).
 *
 * The generic engine's six population shares are not band-scoped. buildEapSnapshot
 * selects only demographic_key and target_value, so band_key is ignored on read;
 * a single constant satisfies the constraint and keeps the six rows unique under
 * (target_set_id, band_key, demographic_key).
 */
const GENERIC_EAP_BAND_KEY = 'overall'

export const DEMO_EAP_VALUES: Array<{ demographic_key: string; target_value: number }> = [
  { demographic_key: 'african_male', target_value: 0.429 },
  { demographic_key: 'african_female', target_value: 0.353 },
  { demographic_key: 'coloured_male', target_value: 0.052 },
  { demographic_key: 'coloured_female', target_value: 0.047 },
  { demographic_key: 'indian_male', target_value: 0.018 },
  { demographic_key: 'indian_female', target_value: 0.011 },
]

const FINANCIAL_INPUTS = {
  measurementPeriodStart: `${ASSESSMENT_YEAR}-03-01`,
  measurementPeriodEnd: `${ASSESSMENT_YEAR + 1}-02-28`,
  revenue: 92_400_000,
  actualNpat: 7_850_000,
  npbt: 10_900_000,
  companyTax: 3_050_000,
  leviableAmount: 24_600_000,
  totalPayroll: 26_800_000,
  totalEmployees: 148,
  industryClassification: 'Manufacturing',
  // Present so the deemed-NPAT comparison can actually be performed. Without an
  // industry norm the engine can only say "actual NPAT, unconfirmed", which
  // leaves the denominator awaiting authorised confirmation and blocks a final
  // level. Deemed NPAT here is R1.96m, below the R7.85m actual, so actual
  // applies and no override is needed.
  industryNpatMargin: 0.085,
  industryProfitNormSource: 'Demo industry profit norm (fabricated)',
  industryProfitNormPeriod: `${ASSESSMENT_YEAR}`,
  npatOverride: null,
}

const APPLICABILITY_INPUTS = {
  measurementPeriodStart: FINANCIAL_INPUTS.measurementPeriodStart,
  measurementPeriodEnd: FINANCIAL_INPUTS.measurementPeriodEnd,
  annualRevenue: FINANCIAL_INPUTS.revenue,
  entityType: 'private_company',
  sector: 'Manufacturing',
  sectorCodeApplies: false,
  sectorCodeName: null,
  blackOwnershipPercentage: 0.32,
  blackWomenOwnershipPercentage: 0.13,
  isStartUp: false,
  fullScorecardElection: null,
}

const OWNERSHIP_INPUTS = {
  totalExercisableVotes: 1_000,
  blackExercisableVotes: 320,
  blackWomenExercisableVotes: 130,
  blackVotingRightsPercentage: null,
  blackWomenVotingRightsPercentage: null,
  blackEconomicInterestPercentage: 0.305,
  blackWomenEconomicInterestPercentage: 0.121,
  designatedGroupsEconomicInterestPercentage: 0.032,
  newEntrantsEconomicInterestPercentage: 0.026,
  netValuePercentage: 0.238,
  evidenceSource: 'Demo shareholder register (fabricated)',
  practitionerNotes: null,
  measurementDate: FINANCIAL_INPUTS.measurementPeriodEnd,
  modifiedFlowThroughApplied: false,
  exclusionPrincipleApplied: false,
}

const MANAGEMENT_CONTROL_INPUTS = {
  board: { total: 7, black: 3, blackWomen: 1 },
  executiveDirectors: { total: 4, black: 2, blackWomen: 1 },
  otherExecutiveManagement: { total: 6, black: 3, blackWomen: 1 },
  seniorManagement: {
    total: 14,
    byDemographic: {
      african_male: 4,
      african_female: 2,
      coloured_male: 1,
      coloured_female: 1,
      indian_male: 1,
      indian_female: 0,
    },
  },
  middleManagement: {
    total: 29,
    byDemographic: {
      african_male: 9,
      african_female: 6,
      coloured_male: 2,
      coloured_female: 2,
      indian_male: 1,
      indian_female: 1,
    },
  },
  juniorManagement: {
    total: 46,
    byDemographic: {
      african_male: 16,
      african_female: 12,
      coloured_male: 3,
      coloured_female: 3,
      indian_male: 1,
      indian_female: 1,
    },
  },
  blackEmployeesWithDisabilities: 3,
  totalEmployees: FINANCIAL_INPUTS.totalEmployees,
  eapDistribution: null,
  eapTargetSetLabel: null,
}

/**
 * Deliberately short of the Skills Development priority sub-minimum (40% of the
 * element's 20 base points). This is what produces the one-level discount, and
 * it is the single most common real-world reason a scorecard drops a level.
 */
const SKILLS_DEVELOPMENT_INPUTS = {
  leviableAmount: FINANCIAL_INPUTS.leviableAmount,
  totalEmployees: FINANCIAL_INPUTS.totalEmployees,
  // All three mandatory requirements are met, so the element scores normally.
  // Leaving any of them false withholds ALL 20 points and makes the priority
  // sub-minimum untestable — which reads as a broken demo, not a near miss.
  wspAtrSetaApproved: true,
  pivotalReportSubmitted: true,
  prioritySkillsProgrammeImplemented: true,
  trainingRegisterMaintained: true,
  generalTrainingSpendByDemographic: {
    african_male: 96_000,
    african_female: 72_000,
    coloured_male: 14_000,
    coloured_female: 12_000,
    indian_male: 6_000,
    indian_female: 3_000,
  },
  bursarySpendByDemographic: {
    african_male: 21_000,
    african_female: 18_000,
  },
  disabilityTrainingSpend: 8_000,
  learnerHeadcountByDemographic: {
    african_male: 4,
    african_female: 3,
    coloured_male: 1,
    coloured_female: 0,
  },
  totalSkillsDevelopmentSpend: 248_000,
  informalWorkplaceLearningSpend: 21_000,
  trainingAdministrationCost: 26_000,
  learnersCompleted: 8,
  learnersAbsorbed: 2,
  eapDistribution: null,
  eapTargetSetLabel: null,
}

type DemoContribution = {
  elementKey: 'enterprise_development' | 'supplier_development' | 'socio_economic_development'
  beneficiary_name: string
  beneficiary_classification: string
  beneficiary_black_ownership_percentage: number | null
  was_eme_or_qse_at_first_assistance: boolean | null
  years_since_first_assistance: number | null
  contribution_type: string
  actual_value: number
  contribution_date: string
  evidence_provided: boolean
  /** Left null on some records so the evidence-confirmation flow has both states. */
  evidence_reference: string | null
  black_beneficiary_percentage: number | null
  notes: string | null
}

const CONTRIBUTIONS: DemoContribution[] = [
  // Supplier Development — beneficiaries that are also suppliers.
  {
    elementKey: 'supplier_development',
    beneficiary_name: 'Nkosazana Technical Cleaning (Demo)',
    beneficiary_classification: 'eme',
    beneficiary_black_ownership_percentage: 0.74,
    was_eme_or_qse_at_first_assistance: true,
    years_since_first_assistance: 2,
    contribution_type: 'grant_contribution',
    actual_value: 96_000,
    contribution_date: `${ASSESSMENT_YEAR}-06-18`,
    evidence_provided: true,
    evidence_reference: 'SD-2026-014 — signed grant letter',
    black_beneficiary_percentage: null,
    notes: 'Equipment grant to a supplier on the procurement register.',
  },
  {
    elementKey: 'supplier_development',
    beneficiary_name: 'Sandstone Courier Collective (Demo)',
    beneficiary_classification: 'eme',
    beneficiary_black_ownership_percentage: 0.81,
    was_eme_or_qse_at_first_assistance: true,
    years_since_first_assistance: 1,
    contribution_type: 'interest_free_loan',
    actual_value: 140_000,
    contribution_date: `${ASSESSMENT_YEAR}-08-02`,
    evidence_provided: true,
    evidence_reference: 'SD-2026-021 — loan agreement',
    black_beneficiary_percentage: null,
    notes: null,
  },
  {
    elementKey: 'supplier_development',
    beneficiary_name: 'Klipfontein Safety Wear (Demo)',
    beneficiary_classification: 'qse',
    beneficiary_black_ownership_percentage: 0.63,
    was_eme_or_qse_at_first_assistance: true,
    years_since_first_assistance: 3,
    contribution_type: 'grant_contribution',
    actual_value: 58_000,
    contribution_date: `${ASSESSMENT_YEAR}-10-11`,
    // Unconfirmed on purpose: the evidence-confirmation flow needs a record
    // sitting in the "not yet referenced" state to be worth demonstrating.
    evidence_provided: false,
    evidence_reference: null,
    black_beneficiary_percentage: null,
    notes: 'Awaiting the signed grant letter.',
  },

  // Enterprise Development — beneficiaries that are not suppliers.
  {
    elementKey: 'enterprise_development',
    beneficiary_name: 'Motheo Tooling Start-up (Demo)',
    beneficiary_classification: 'eme',
    beneficiary_black_ownership_percentage: 1,
    was_eme_or_qse_at_first_assistance: true,
    years_since_first_assistance: 1,
    contribution_type: 'grant_contribution',
    actual_value: 64_000,
    contribution_date: `${ASSESSMENT_YEAR}-05-09`,
    evidence_provided: true,
    evidence_reference: 'ED-2026-003 — grant approval memo',
    black_beneficiary_percentage: null,
    notes: null,
  },
  {
    elementKey: 'enterprise_development',
    beneficiary_name: 'Bokamoso Welding Academy (Demo)',
    beneficiary_classification: 'eme',
    beneficiary_black_ownership_percentage: 0.92,
    was_eme_or_qse_at_first_assistance: true,
    years_since_first_assistance: 2,
    contribution_type: 'grant_contribution',
    actual_value: 37_500,
    contribution_date: `${ASSESSMENT_YEAR}-09-23`,
    evidence_provided: true,
    evidence_reference: 'ED-2026-008 — payment confirmation',
    black_beneficiary_percentage: null,
    notes: null,
  },

  // Socio-Economic Development — measured on black beneficiary proportion.
  {
    elementKey: 'socio_economic_development',
    beneficiary_name: 'Karoo Ridge Community Numeracy Fund (Demo)',
    beneficiary_classification: null as unknown as string,
    beneficiary_black_ownership_percentage: null,
    was_eme_or_qse_at_first_assistance: null,
    years_since_first_assistance: null,
    contribution_type: 'grant_contribution',
    actual_value: 61_000,
    contribution_date: `${ASSESSMENT_YEAR}-07-04`,
    evidence_provided: true,
    evidence_reference: 'SED-2026-002 — beneficiary schedule',
    black_beneficiary_percentage: 0.94,
    notes: null,
  },
  {
    elementKey: 'socio_economic_development',
    beneficiary_name: 'Thusano Clinic Outreach (Demo)',
    beneficiary_classification: null as unknown as string,
    beneficiary_black_ownership_percentage: null,
    was_eme_or_qse_at_first_assistance: null,
    years_since_first_assistance: null,
    contribution_type: 'grant_contribution',
    actual_value: 24_500,
    contribution_date: `${ASSESSMENT_YEAR}-11-15`,
    evidence_provided: false,
    evidence_reference: null,
    black_beneficiary_percentage: 0.88,
    notes: 'Beneficiary schedule still being collated.',
  },
]

/**
 * Freeze the seeded procurement assessment into the snapshot shape the generic
 * engine reads. Mirrors buildProcurementSnapshot() in the calculate action —
 * the engine re-scores from the recognised spend either way, so the demo shows
 * the same procurement points the app would compute.
 */
export function buildDemoProcurementSnapshot(args: {
  sourceAssessmentId: string
  userId: string
  totalMeasuredSpend: number
  calculated: ReturnType<typeof calculateSupplierRow>[]
}): ProcurementSnapshot {
  const { calculated, totalMeasuredSpend } = args
  const sumOf = (key: 'bbbee_spend' | 'eme_amount' | 'qse_amount' | 'black_owned_amount' | 'black_women_amount' | 'bdgs_amount') =>
    calculated.reduce((sum, row) => {
      const value = Number(row[key] ?? 0)
      return Number.isFinite(value) ? sum + value : sum
    }, 0)

  const recognisedSpend = {
    'preferential_procurement.all_empowering_suppliers': sumOf('bbbee_spend'),
    'preferential_procurement.qse': sumOf('qse_amount'),
    'preferential_procurement.eme': sumOf('eme_amount'),
    'preferential_procurement.black_owned_51': sumOf('black_owned_amount'),
    'preferential_procurement.black_women_owned_30': sumOf('black_women_amount'),
    'preferential_procurement.bonus.designated_group': sumOf('bdgs_amount'),
  }

  const formal = calculateProcurementResults({
    totals: {
      all_bbbee_suppliers: recognisedSpend['preferential_procurement.all_empowering_suppliers'],
      all_qses: recognisedSpend['preferential_procurement.qse'],
      all_emes: recognisedSpend['preferential_procurement.eme'],
      black_owned_51: recognisedSpend['preferential_procurement.black_owned_51'],
      black_women_30: recognisedSpend['preferential_procurement.black_women_owned_30'],
      bdgs_51: recognisedSpend['preferential_procurement.bonus.designated_group'],
    },
    totalMeasuredSpend,
  })
  const categoryBonus = formal.categories.find((category) => category.key === 'bdgs_51')?.pointsAchieved ?? 0
  const categoryBase = formal.categories
    .filter((category) => category.key !== 'bdgs_51')
    .reduce((sum, category) => sum + category.pointsAchieved, 0)
  const normalised = normaliseSourceProcurementPoints({
    combinedTotal: formal.totalScore,
    categoryBasePoints: categoryBase,
    categoryBonusPoints: categoryBonus,
  })

  return {
    sourceAssessmentId: args.sourceAssessmentId,
    sourceAssessmentName: `Formal Procurement Assessment ${ASSESSMENT_YEAR}`,
    measurementPeriodStart: FINANCIAL_INPUTS.measurementPeriodStart,
    measurementPeriodEnd: FINANCIAL_INPUTS.measurementPeriodEnd,
    capturedAt: new Date().toISOString(),
    capturedBy: args.userId,
    totalMeasuredProcurementSpend: totalMeasuredSpend > 0 ? totalMeasuredSpend : null,
    recognisedSpend,
    flowThroughApplied: false,
    sourceReportedBasePoints: normalised.sourceReportedBasePoints,
    sourceReportedBonusPoints: normalised.sourceReportedBonusPoints,
    sourceReportedCombinedPoints: normalised.sourceReportedCombinedPoints,
    sourceNormalisationWarning: normalised.sourceNormalisationWarning,
  }
}

/**
 * Assemble the stored-row shapes the app would have written, so the engine is
 * fed through exactly the same path a real assessment takes.
 *
 * Exported so the numbers can be checked without a database: the calculation is
 * pure, and running it needs no Supabase connection at all.
 */
export function buildDemoGenericStoredRows(args: {
  assessmentId: string
  eapSnapshot: unknown
  procurementSnapshot: ProcurementSnapshot
}): {
  assessment: StoredAssessmentRow
  elements: StoredElementRow[]
  contributions: StoredContributionRow[]
} {
  const assessment: StoredAssessmentRow = {
    id: args.assessmentId,
    rule_set_key: GENERIC_SCORECARD_RULE_VERSION,
    rule_set_snapshot: null,
    eap_target_set_id: null,
    eap_target_snapshot: args.eapSnapshot,
    applicability_snapshot: APPLICABILITY_INPUTS,
    financial_inputs: FINANCIAL_INPUTS,
    ownership_inputs: OWNERSHIP_INPUTS,
    procurement_snapshot: args.procurementSnapshot,
    scope_mode: 'full',
    selected_elements: [...GENERIC_SCORECARD_ELEMENT_KEYS],
    workbook_import_status: 'no_workbook_uploaded',
  }

  const contextualFor = (elementKey: string): Record<string, unknown> => {
    if (elementKey === 'management_control') return MANAGEMENT_CONTROL_INPUTS
    if (elementKey === 'skills_development') return SKILLS_DEVELOPMENT_INPUTS
    if (elementKey === 'socio_economic_development') return { targetPercent: 0.01, availablePoints: 5 }
    // An explicit "no" to the ESD bonus. Left unanswered the bonus indicator
    // stays unscored, which holds both elements at 'partial' and stops the
    // scorecard ever reaching a final level.
    if (elementKey === 'enterprise_development' || elementKey === 'supplier_development') {
      return { bonusConfirmed: false, bonusEvidenceProvided: false }
    }
    return {}
  }

  const elements: StoredElementRow[] = GENERIC_SCORECARD_ELEMENT_KEYS.map((element_key) => ({
    element_key,
    // One of the seven values the element status check constraint allows.
    status: 'ready_to_calculate',
    contextual_inputs: contextualFor(element_key),
    import_snapshot: null,
  }))

  const contributions: StoredContributionRow[] = CONTRIBUTIONS.map((row, index) => ({
    id: `demo-contribution-${index + 1}`,
    element_key: row.elementKey,
    beneficiary_name: row.beneficiary_name,
    beneficiary_classification: row.beneficiary_classification,
    beneficiary_black_ownership_percentage: row.beneficiary_black_ownership_percentage,
    was_eme_or_qse_at_first_assistance: row.was_eme_or_qse_at_first_assistance,
    years_since_first_assistance: row.years_since_first_assistance,
    contribution_type: row.contribution_type,
    actual_value: row.actual_value,
    supplied_benefit_factor: null,
    contribution_date: row.contribution_date,
    evidence_provided: row.evidence_provided,
    evidence_reference: row.evidence_reference,
    black_beneficiary_percentage: row.black_beneficiary_percentage,
    notes: row.notes,
  }))

  return { assessment, elements, contributions }
}

async function main() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the DEMO project.')
  }

  const ref = assertDemoTarget(url)
  console.log(`Seeding demo project ${ref}`)

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ---------------------------------------------------------------------
  // Demo user
  // ---------------------------------------------------------------------
  const password = process.env.DEMO_USER_PASSWORD
  if (!password) {
    throw new Error('Set DEMO_USER_PASSWORD (never hardcode a password in this repo).')
  }

  const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  let userId = existingUsers?.users?.find((u) => u.email === DEMO_USER_EMAIL)?.id
  if (userId) {
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
    console.log(`  user  ${DEMO_USER_EMAIL} (updated)`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_USER_EMAIL,
      password,
      email_confirm: true,
    })
    if (error) throw error
    userId = data.user!.id
    console.log(`  user  ${DEMO_USER_EMAIL} (created)`)
  }

  // ---------------------------------------------------------------------
  // Company — idempotent by name
  // ---------------------------------------------------------------------
  const { data: existingCompany } = await admin
    .from('companies')
    .select('id')
    .eq('name', DEMO_COMPANY_NAME)
    .maybeSingle()

  let companyId = existingCompany?.id as string | undefined
  if (!companyId) {
    const { data, error } = await admin
      .from('companies')
      .insert({
        name: DEMO_COMPANY_NAME,
        owner_id: userId,
        contact_person: 'Demo Operator',
        email: DEMO_USER_EMAIL,
        industry: 'Manufacturing',
        notes: 'Seeded demo data. Fabricated suppliers. Contains no client information.',
      })
      .select('id')
      .single()
    if (error) throw error
    companyId = data.id
    console.log(`  company  ${DEMO_COMPANY_NAME} (created)`)
  } else {
    await admin.from('companies').update({ owner_id: userId }).eq('id', companyId)
    console.log(`  company  ${DEMO_COMPANY_NAME} (reused)`)
  }

  // ---------------------------------------------------------------------
  // Procurement assessment — replaced wholesale so re-running is clean
  // ---------------------------------------------------------------------
  const { data: oldAssessments } = await admin
    .from('procurement_assessments')
    .select('id')
    .eq('company_id', companyId)
    .eq('assessment_year', ASSESSMENT_YEAR)

  for (const old of oldAssessments ?? []) {
    // suppliers cascade on delete
    await admin.from('procurement_assessments').delete().eq('id', old.id)
  }

  const calculated = SUPPLIERS.map(calculateSupplierRow)
  const totalSpend = calculated.reduce((sum, row) => sum + row.value_ex_vat, 0)

  const { data: assessment, error: assessmentError } = await admin
    .from('procurement_assessments')
    .insert({
      company_id: companyId,
      assessment_year: ASSESSMENT_YEAR,
      total_measured_procurement_spend: totalSpend,
      tmps_purchase_of_goods: Math.round(totalSpend * 0.62),
      tmps_purchase_of_services: Math.round(totalSpend * 0.38),
      status: 'draft',
      created_by: userId,
    })
    .select('id')
    .single()
  if (assessmentError) throw assessmentError

  const { error: suppliersError } = await admin.from('procurement_suppliers').insert(
    calculated.map((row) => ({
      assessment_id: assessment.id,
      supplier_name: row.supplier_name,
      supplier_type: row.supplier_type,
      level: row.level,
      recognition_percent: row.recognition_percent,
      value_ex_vat: row.value_ex_vat,
      bbbee_spend: row.bbbee_spend,
      is_51_black_owned: row.is_51_black_owned,
      is_30_black_women_owned: row.is_30_black_women_owned,
      is_51_bdgs: row.is_51_bdgs,
      is_51_percent_flow_through: row.is_51_percent_flow_through ?? false,
      eme_amount: row.eme_amount,
      qse_amount: row.qse_amount,
      black_owned_amount: row.black_owned_amount,
      black_women_amount: row.black_women_amount,
      bdgs_amount: row.bdgs_amount,
    })),
  )
  if (suppliersError) throw suppliersError

  const rand = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 })
  console.log(`  assessment ${ASSESSMENT_YEAR}: ${calculated.length} suppliers`)
  console.log(`  total measured procurement spend: R ${rand(totalSpend)}`)
  console.log(`  recognised B-BBEE spend:          R ${rand(calculated.reduce((s, r) => s + r.bbbee_spend, 0))}`)

  // -------------------------------------------------------------------------
  // Pass 2 — the Generic scorecard assessment
  // -------------------------------------------------------------------------
  if (!userId || !companyId) {
    throw new Error('Demo user or company id is missing after pass 1; refusing to seed the scorecard.')
  }

  await seedGenericAssessment({
    admin,
    companyId,
    userId,
    procurementAssessmentId: assessment.id,
    totalMeasuredSpend: totalSpend,
    calculated,
  })

  console.log('Done.')
}

async function seedGenericAssessment(args: {
  admin: SupabaseClient
  companyId: string
  userId: string
  procurementAssessmentId: string
  totalMeasuredSpend: number
  calculated: ReturnType<typeof calculateSupplierRow>[]
}) {
  const { admin, companyId, userId } = args

  // ---- EAP target set -----------------------------------------------------
  // Management Control and Skills Development cannot score without one.
  let eapSetId: string
  const { data: existingEap } = await admin
    .from('eap_target_sets')
    .select('id')
    .eq('name', EAP_TARGET_SET_NAME)
    .maybeSingle()

  if (existingEap?.id) {
    eapSetId = existingEap.id as string
    await admin.from('eap_target_set_values').delete().eq('target_set_id', eapSetId)
  } else {
    const { data, error } = await admin
      .from('eap_target_sets')
      .insert({
        name: EAP_TARGET_SET_NAME,
        year: ASSESSMENT_YEAR,
        version: 1,
        geography: 'National',
        status: 'active',
        created_by: userId,
      })
      .select('id')
      .single()
    if (error) throw error
    eapSetId = data.id
  }

  const { error: eapValuesError } = await admin.from('eap_target_set_values').insert(
    DEMO_EAP_VALUES.map((value) => ({
      target_set_id: eapSetId,
      band_key: GENERIC_EAP_BAND_KEY,
      ...value,
    })),
  )
  if (eapValuesError) throw eapValuesError

  const validation = validateEapSetForGenericEngine(DEMO_EAP_VALUES)
  if (!validation.ok) throw new Error(`Demo EAP target set is unusable: ${validation.error}`)

  const eapSnapshot = {
    id: eapSetId,
    name: EAP_TARGET_SET_NAME,
    year: ASSESSMENT_YEAR,
    version: 1,
    geography: 'National',
    status: 'active',
    values: DEMO_EAP_VALUES,
    snapped_at: new Date().toISOString(),
  }
  console.log(`  eap target set ${EAP_TARGET_SET_NAME}`)

  // ---- Assessment shell ---------------------------------------------------
  // Replaced wholesale so re-running is clean; children cascade on delete.
  const { data: oldAssessments } = await admin
    .from('scorecard_assessments')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', GENERIC_ASSESSMENT_NAME)
  for (const old of oldAssessments ?? []) {
    await admin.from('scorecard_assessments').delete().eq('id', old.id)
  }

  const procurementSnapshot = buildDemoProcurementSnapshot({
    sourceAssessmentId: args.procurementAssessmentId,
    userId,
    totalMeasuredSpend: args.totalMeasuredSpend,
    calculated: args.calculated,
  })

  const { data: created, error: createError } = await admin
    .from('scorecard_assessments')
    .insert({
      company_id: companyId,
      created_by: userId,
      name: GENERIC_ASSESSMENT_NAME,
      measurement_year: ASSESSMENT_YEAR,
      // Only 'draft' and 'final' pass the status check constraint.
      status: 'draft',
      scope_mode: 'full',
      selected_elements: [...GENERIC_SCORECARD_ELEMENT_KEYS],
      rule_version: GENERIC_SCORECARD_RULE_VERSION,
      rule_set_key: GENERIC_SCORECARD_RULE_VERSION,
      workbook_import_status: 'no_workbook_uploaded',
      needs_recalculation: true,
      eap_target_set_id: eapSetId,
      eap_target_snapshot: eapSnapshot,
      applicability_snapshot: APPLICABILITY_INPUTS,
      financial_inputs: FINANCIAL_INPUTS,
      ownership_inputs: OWNERSHIP_INPUTS,
      procurement_assessment_id: args.procurementAssessmentId,
      procurement_snapshot: procurementSnapshot,
      notes: 'Seeded demo assessment. Fabricated inputs. Contains no client information.',
      metadata: {
        product_name: GENERIC_SCORECARD_PRODUCT_NAME,
        workflow: 'generic_full_workbook',
        seeded_demo: true,
      },
    })
    .select('id')
    .single()
  if (createError) throw createError
  const assessmentId = created.id as string

  // ---- Element rows and contributions -------------------------------------
  const stored = buildDemoGenericStoredRows({ assessmentId, eapSnapshot, procurementSnapshot })

  const { error: elementsError } = await admin.from('scorecard_assessment_elements').insert(
    stored.elements.map((element) => ({
      assessment_id: assessmentId,
      element_key: element.element_key,
      status: element.status,
      contextual_inputs: element.contextual_inputs,
    })),
  )
  if (elementsError) throw elementsError

  const { data: insertedContributions, error: contributionsError } = await admin
    .from('scorecard_contribution_records')
    .insert(
      CONTRIBUTIONS.map((row) => ({
        assessment_id: assessmentId,
        element_key: row.elementKey,
        beneficiary_name: row.beneficiary_name,
        beneficiary_classification: row.beneficiary_classification,
        beneficiary_black_ownership_percentage: row.beneficiary_black_ownership_percentage,
        was_eme_or_qse_at_first_assistance: row.was_eme_or_qse_at_first_assistance,
        years_since_first_assistance: row.years_since_first_assistance,
        contribution_type: row.contribution_type,
        actual_value: row.actual_value,
        contribution_date: row.contribution_date,
        evidence_provided: row.evidence_provided,
        evidence_reference: row.evidence_reference,
        black_beneficiary_percentage: row.black_beneficiary_percentage,
        notes: row.notes,
      })),
    )
    .select('*')
  if (contributionsError) throw contributionsError

  // ---- Calculate, using the application's own engine -----------------------
  // The contributions are re-read from the database rather than reused from the
  // literals above, so the engine scores exactly what was persisted.
  const inputs = buildGenericInputs({
    assessment: stored.assessment,
    elements: stored.elements,
    contributions: (insertedContributions ?? []) as unknown as StoredContributionRow[],
  })
  const result = calculateGenericScorecard(inputs)

  const { data: run, error: runError } = await admin
    .from('scorecard_calculation_runs')
    .insert(
      calculationRunRow({
        assessmentId,
        userId,
        result,
        inputs,
        eapTargetSetVersion: String(eapSnapshot.version),
      }),
    )
    .select('id')
    .single()
  if (runError) throw runError

  const { error: updateError } = await admin
    .from('scorecard_assessments')
    .update(assessmentResultColumns(result))
    .eq('id', assessmentId)
  if (updateError) throw updateError

  const priorityRows = priorityResultRows({ assessmentId, calculationRunId: run?.id ?? null, result })
  if (priorityRows.length > 0) {
    const { error } = await admin.from('scorecard_priority_results').insert(priorityRows)
    if (error) throw error
  }

  for (const element of result.elements) {
    await admin
      .from('scorecard_assessment_elements')
      .update({
        result_snapshot: element as unknown as Record<string, unknown>,
        rule_set_key: result.ruleSetKey,
        rule_set_version: result.ruleSetVersion,
        calculation_rule_version: result.ruleSetKey,
        base_points_achieved: element.basePointsAchieved,
        bonus_points_achieved: element.bonusPointsAchieved,
        base_points_available: element.basePointsAvailable,
        bonus_points_available: element.bonusPointsAvailable,
        missing_inputs: element.missingInputs,
        warnings: element.warnings,
        status:
          element.status === 'scored'
            ? 'calculated'
            : element.status === 'not_started'
              ? 'not_started'
              : 'needs_review',
        calculated_at: new Date().toISOString(),
        calculated_by: userId,
        needs_recalculation: false,
      })
      .eq('assessment_id', assessmentId)
      .eq('element_key', element.elementKey)
  }

  await admin.from('scorecard_assessment_audit_log').insert({
    assessment_id: assessmentId,
    action: 'scorecard.calculated',
    actor: userId,
    detail: {
      runId: run?.id ?? null,
      preliminaryLevel: result.preliminaryLevel.level,
      finalLevel: result.readiness.complete ? result.finalLevel.level : null,
      discountApplied: result.discountApplied,
      seeded: true,
    },
  })

  const failed = result.prioritySubminimums.filter((outcome) => outcome.evaluated && !outcome.passed)
  console.log(`  generic assessment ${GENERIC_ASSESSMENT_NAME}`)
  console.log(`    raw points:        ${result.rawTotalPoints}`)
  console.log(`    preliminary level: ${result.preliminaryLevel.level}`)
  console.log(`    discount applied:  ${result.discountApplied}`)
  console.log(`    final level:       ${result.readiness.complete ? result.finalLevel.level : '(readiness incomplete)'}`)
  console.log(`    sub-minimums missed: ${failed.length === 0 ? 'none' : failed.map((f) => f.label).join(', ')}`)
}

/**
 * Only seed when this file is the process entry point.
 *
 * Without this guard the module cannot be imported at all: main() would run on
 * import and the target guard would throw. Keeping it importable is what allows
 * the calculation to be checked on its own — the engine is pure, so the demo's
 * points and level can be verified with no database connection anywhere.
 */
const invokedDirectly = (process.argv[1] ?? '').includes('seed-demo-data')

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
