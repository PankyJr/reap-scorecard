export type IndicatorCalculationType =
  | 'summary_reference'
  | 'not_implemented'
  | 'proportional_points'
  | 'sum_indicators'

export interface ProportionalRowSpec {
  percentageKey: string
  targetKey: string
  availablePointsKey: string
}

export interface FullIndicatorConfig {
  key: string
  pillarKey: string
  sectionKey: string
  label: string
  /** Static cap used for display only where metrics supply real available points. */
  availablePoints: number | null
  requiredMetricKeys: string[]
  optionalMetricKeys: string[]
  /** Excel reference row: points achieved (reconciliation / summary indicators only). */
  referenceAchievedMetricKey?: string
  /** Sub-rows scored as min(%/target,1)*available, then summed. */
  proportionalRows?: ProportionalRowSpec[]
  /** For sum_indicators: child indicator keys (same engine run). */
  sumChildIndicatorKeys?: string[]
  calculationType: IndicatorCalculationType
  notes: string
  /**
   * When false, achieved/available from this indicator are not summed into the pillar rollup
   * (sub-indicators aggregated by a parent `sum_indicators` row).
   */
  includeInPillarAggregate?: boolean
}

export const INDICATOR_CONFIGS: FullIndicatorConfig[] = [
  {
    key: 'ownership.voting_rights',
    pillarKey: 'ownership',
    sectionKey: 'voting_rights',
    label: 'Ownership — Voting rights',
    availablePoints: 8,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'ownership.voting_rights.black_people.percentage',
        targetKey: 'ownership.voting_rights.black_people.target',
        availablePointsKey: 'ownership.voting_rights.black_people.available_points',
      },
      {
        percentageKey: 'ownership.voting_rights.black_women.percentage',
        targetKey: 'ownership.voting_rights.black_women.target',
        availablePointsKey: 'ownership.voting_rights.black_women.available_points',
      },
    ],
    notes: 'Voting rights scored from Ownership sheet rows (not Full Scorecard reference).',
  },
  {
    key: 'ownership.economic_interest',
    pillarKey: 'ownership',
    sectionKey: 'economic_interest',
    label: 'Ownership — Economic interest',
    availablePoints: 4,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'ownership.economic_interest.black_people.percentage',
        targetKey: 'ownership.economic_interest.black_people.target',
        availablePointsKey: 'ownership.economic_interest.black_people.available_points',
      },
      {
        percentageKey: 'ownership.economic_interest.black_women.percentage',
        targetKey: 'ownership.economic_interest.black_women.target',
        availablePointsKey: 'ownership.economic_interest.black_women.available_points',
      },
      {
        percentageKey: 'ownership.economic_interest.designated_groups.percentage',
        targetKey: 'ownership.economic_interest.designated_groups.target',
        availablePointsKey: 'ownership.economic_interest.designated_groups.available_points',
      },
    ],
    notes: 'Economic interest scored from Ownership sheet rows.',
  },
  {
    key: 'ownership.net_value',
    pillarKey: 'ownership',
    sectionKey: 'net_value',
    label: 'Ownership — Net value',
    availablePoints: 3,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'ownership.net_value.percentage',
        targetKey: 'ownership.net_value.target',
        availablePointsKey: 'ownership.net_value.available_points',
      },
    ],
    notes: 'Net value scored from Ownership sheet row.',
  },
  {
    key: 'ownership.total',
    pillarKey: 'ownership',
    sectionKey: 'ownership_total',
    label: 'Ownership — Total',
    availablePoints: 25,
    requiredMetricKeys: [],
    optionalMetricKeys: ['ownership.total.available_points'],
    calculationType: 'sum_indicators',
    includeInPillarAggregate: true,
    sumChildIndicatorKeys: [
      'ownership.voting_rights',
      'ownership.economic_interest',
      'ownership.net_value',
    ],
    notes: 'Sums calculated ownership indicators; optional sheet total for available points display.',
  },
  {
    key: 'management_control.board',
    pillarKey: 'management_control',
    sectionKey: 'board',
    label: 'Management Control — Board members',
    availablePoints: 4,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'management_control.board.black_people.percentage',
        targetKey: 'management_control.board.black_people.target',
        availablePointsKey: 'management_control.board.black_people.available_points',
      },
      {
        percentageKey: 'management_control.board.black_women.percentage',
        targetKey: 'management_control.board.black_women.target',
        availablePointsKey: 'management_control.board.black_women.available_points',
      },
    ],
    notes: 'Board composition from 3 Board Members sheet (not Full Scorecard reference).',
  },
  {
    key: 'management_control.executive_directors',
    pillarKey: 'management_control',
    sectionKey: 'executive_directors',
    label: 'Management Control — Executive directors',
    availablePoints: 2,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'management_control.executive_directors.black_people.percentage',
        targetKey: 'management_control.executive_directors.black_people.target',
        availablePointsKey: 'management_control.executive_directors.black_people.available_points',
      },
      {
        percentageKey: 'management_control.executive_directors.black_women.percentage',
        targetKey: 'management_control.executive_directors.black_women.target',
        availablePointsKey: 'management_control.executive_directors.black_women.available_points',
      },
    ],
    notes: 'Executive directors from 4 Executive Committe sheet.',
  },
  {
    key: 'management_control.other_executive_management',
    pillarKey: 'management_control',
    sectionKey: 'other_executive_management',
    label: 'Management Control — Other executive management',
    availablePoints: 2,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'management_control.other_executive_management.black_people.percentage',
        targetKey: 'management_control.other_executive_management.black_people.target',
        availablePointsKey: 'management_control.other_executive_management.black_people.available_points',
      },
      {
        percentageKey: 'management_control.other_executive_management.black_women.percentage',
        targetKey: 'management_control.other_executive_management.black_women.target',
        availablePointsKey: 'management_control.other_executive_management.black_women.available_points',
      },
    ],
    notes: 'Other executive management from Employment Equity section headers.',
  },
  {
    key: 'management_control.senior_management',
    pillarKey: 'management_control',
    sectionKey: 'senior_management',
    label: 'Management Control — Senior management',
    availablePoints: 2,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'management_control.senior_management.black_people.percentage',
        targetKey: 'management_control.senior_management.black_people.target',
        availablePointsKey: 'management_control.senior_management.black_people.available_points',
      },
      {
        percentageKey: 'management_control.senior_management.black_women.percentage',
        targetKey: 'management_control.senior_management.black_women.target',
        availablePointsKey: 'management_control.senior_management.black_women.available_points',
      },
    ],
    notes: 'Senior management from Employment Equity.',
  },
  {
    key: 'management_control.middle_management',
    pillarKey: 'management_control',
    sectionKey: 'middle_management',
    label: 'Management Control — Middle management',
    availablePoints: 2,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'management_control.middle_management.black_people.percentage',
        targetKey: 'management_control.middle_management.black_people.target',
        availablePointsKey: 'management_control.middle_management.black_people.available_points',
      },
      {
        percentageKey: 'management_control.middle_management.black_women.percentage',
        targetKey: 'management_control.middle_management.black_women.target',
        availablePointsKey: 'management_control.middle_management.black_women.available_points',
      },
    ],
    notes: 'Middle management from Employment Equity.',
  },
  {
    key: 'management_control.junior_management',
    pillarKey: 'management_control',
    sectionKey: 'junior_management',
    label: 'Management Control — Junior management',
    availablePoints: 1,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'management_control.junior_management.black_people.percentage',
        targetKey: 'management_control.junior_management.black_people.target',
        availablePointsKey: 'management_control.junior_management.black_people.available_points',
      },
      {
        percentageKey: 'management_control.junior_management.black_women.percentage',
        targetKey: 'management_control.junior_management.black_women.target',
        availablePointsKey: 'management_control.junior_management.black_women.available_points',
      },
    ],
    notes: 'Junior management from Employment Equity.',
  },
  {
    key: 'management_control.employees_with_disabilities',
    pillarKey: 'management_control',
    sectionKey: 'employees_with_disabilities',
    label: 'Management Control — Employees with disabilities',
    availablePoints: 1,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'management_control.employees_with_disabilities.black_people.percentage',
        targetKey: 'management_control.employees_with_disabilities.black_people.target',
        availablePointsKey: 'management_control.employees_with_disabilities.black_people.available_points',
      },
    ],
    notes: 'Disability representation (Black people row only per schema) from Employment Equity.',
  },
  {
    key: 'management_control.total',
    pillarKey: 'management_control',
    sectionKey: 'management_control_total',
    label: 'Management Control — Total',
    availablePoints: 19,
    requiredMetricKeys: [],
    optionalMetricKeys: ['management_control.total.available_points'],
    calculationType: 'sum_indicators',
    includeInPillarAggregate: true,
    sumChildIndicatorKeys: [
      'management_control.board',
      'management_control.executive_directors',
      'management_control.other_executive_management',
      'management_control.senior_management',
      'management_control.middle_management',
      'management_control.junior_management',
      'management_control.employees_with_disabilities',
    ],
    notes: 'Sums calculated MC indicators; optional Management Control sheet total for available points.',
  },
  {
    key: 'skills_development.expenditure',
    pillarKey: 'skills_development',
    sectionKey: 'skills_expenditure',
    label: 'Skills Development — Expenditure',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'skills_development.expenditure.black_people.percentage',
        targetKey: 'skills_development.expenditure.black_people.target',
        availablePointsKey: 'skills_development.expenditure.black_people.available_points',
      },
      {
        percentageKey: 'skills_development.expenditure.black_women.percentage',
        targetKey: 'skills_development.expenditure.black_women.target',
        availablePointsKey: 'skills_development.expenditure.black_women.available_points',
      },
      {
        percentageKey: 'skills_development.expenditure.disabled_black_people.percentage',
        targetKey: 'skills_development.expenditure.disabled_black_people.target',
        availablePointsKey: 'skills_development.expenditure.disabled_black_people.available_points',
      },
    ],
    notes: 'Expenditure scored from Skills Development sheet rows (not Full Scorecard reference).',
  },
  {
    key: 'skills_development.learnerships',
    pillarKey: 'skills_development',
    sectionKey: 'learnerships_internships',
    label: 'Skills Development — Learnerships / Apprenticeships / Internships',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'skills_development.learnerships.black_people.percentage',
        targetKey: 'skills_development.learnerships.black_people.target',
        availablePointsKey: 'skills_development.learnerships.black_people.available_points',
      },
      {
        percentageKey: 'skills_development.learnerships.black_women.percentage',
        targetKey: 'skills_development.learnerships.black_women.target',
        availablePointsKey: 'skills_development.learnerships.black_women.available_points',
      },
      {
        percentageKey: 'skills_development.learnerships.disabled_black_people.percentage',
        targetKey: 'skills_development.learnerships.disabled_black_people.target',
        availablePointsKey: 'skills_development.learnerships.disabled_black_people.available_points',
      },
    ],
    notes: 'Learnership-style compliance from Interns & Learners sheet.',
  },
  {
    key: 'skills_development.absorption_bonus',
    pillarKey: 'skills_development',
    sectionKey: 'absorption_bonus',
    label: 'Skills Development — Absorption bonus',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'skills_development.bonus.absorption.percentage',
        targetKey: 'skills_development.bonus.absorption.target',
        availablePointsKey: 'skills_development.bonus.absorption.available_points',
      },
    ],
    notes: 'Single proportional row from Learner summary when an unambiguous absorption row exists.',
  },
  {
    key: 'skills_development.total',
    pillarKey: 'skills_development',
    sectionKey: 'skills_development_total',
    label: 'Skills Development — Total',
    availablePoints: 25,
    requiredMetricKeys: [],
    optionalMetricKeys: [
      'skills_development.total.available_points',
      'skills_development.leviable_amount',
      'skills_development.total_training_spend',
      'skills_development.total.bonus_available_points',
    ],
    calculationType: 'sum_indicators',
    includeInPillarAggregate: true,
    sumChildIndicatorKeys: [
      'skills_development.expenditure',
      'skills_development.learnerships',
      'skills_development.absorption_bonus',
    ],
    notes:
      'Sums calculated SD indicators; optional sheet totals and context metrics (leviable amount, training spend, bonus pool) attach as source refs for audit only.',
  },
  {
    key: 'procurement.preferential_b_bbee',
    pillarKey: 'procurement_esd',
    sectionKey: 'preferential_procurement',
    label: 'Preferential Procurement — B-BBEE procurement spend',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'preferential_procurement.b_bbee_procurement_spend.percentage',
        targetKey: 'preferential_procurement.b_bbee_procurement_spend.target',
        availablePointsKey: 'preferential_procurement.b_bbee_procurement_spend.available_points',
      },
    ],
    notes: 'From Procurement sheet (not Full Scorecard reference).',
  },
  {
    key: 'procurement.preferential_qse_eme',
    pillarKey: 'procurement_esd',
    sectionKey: 'preferential_procurement',
    label: 'Preferential Procurement — QSE / EME procurement',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'preferential_procurement.qse_eme_procurement.percentage',
        targetKey: 'preferential_procurement.qse_eme_procurement.target',
        availablePointsKey: 'preferential_procurement.qse_eme_procurement.available_points',
      },
    ],
    notes: 'From Procurement sheet.',
  },
  {
    key: 'procurement.preferential_black_owned',
    pillarKey: 'procurement_esd',
    sectionKey: 'preferential_procurement',
    label: 'Preferential Procurement — Black-owned procurement',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'preferential_procurement.black_owned_procurement.percentage',
        targetKey: 'preferential_procurement.black_owned_procurement.target',
        availablePointsKey: 'preferential_procurement.black_owned_procurement.available_points',
      },
    ],
    notes: 'From Procurement sheet.',
  },
  {
    key: 'procurement.preferential_black_women_owned',
    pillarKey: 'procurement_esd',
    sectionKey: 'preferential_procurement',
    label: 'Preferential Procurement — Black women-owned procurement',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'preferential_procurement.black_women_owned_procurement.percentage',
        targetKey: 'preferential_procurement.black_women_owned_procurement.target',
        availablePointsKey: 'preferential_procurement.black_women_owned_procurement.available_points',
      },
    ],
    notes: 'From Procurement sheet.',
  },
  {
    key: 'procurement.preferential_designated_group',
    pillarKey: 'procurement_esd',
    sectionKey: 'preferential_procurement',
    label: 'Preferential Procurement — Designated group procurement',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'preferential_procurement.designated_group_procurement.percentage',
        targetKey: 'preferential_procurement.designated_group_procurement.target',
        availablePointsKey: 'preferential_procurement.designated_group_procurement.available_points',
      },
    ],
    notes: 'From Procurement sheet.',
  },
  {
    key: 'procurement.preferential_total',
    pillarKey: 'procurement_esd',
    sectionKey: 'preferential_procurement_total',
    label: 'Preferential Procurement — Total',
    availablePoints: 25,
    requiredMetricKeys: [],
    optionalMetricKeys: [
      'preferential_procurement.total.available_points',
      'preferential_procurement.total_measured_procurement_spend.amount',
      'preferential_procurement.recognised_procurement_spend.amount',
      'preferential_procurement.procurement_recognition.percentage',
      'procurement.summary_spend',
    ],
    calculationType: 'sum_indicators',
    includeInPillarAggregate: false,
    sumChildIndicatorKeys: [
      'procurement.preferential_b_bbee',
      'procurement.preferential_qse_eme',
      'procurement.preferential_black_owned',
      'procurement.preferential_black_women_owned',
      'procurement.preferential_designated_group',
    ],
    notes:
      'Sums Preferential Procurement sub-indicators; TMPS summary metrics attach as optional source refs for audit.',
  },
  {
    key: 'esd.enterprise_development_annual_value',
    pillarKey: 'procurement_esd',
    sectionKey: 'enterprise_development',
    label: 'Enterprise Development — Annual value',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'enterprise_development.annual_value.percentage',
        targetKey: 'enterprise_development.annual_value.target',
        availablePointsKey: 'enterprise_development.annual_value.available_points',
      },
    ],
    notes: 'From ED & SD sheet (not Full Scorecard reference).',
  },
  {
    key: 'esd.enterprise_development_bonus_graduation',
    pillarKey: 'procurement_esd',
    sectionKey: 'enterprise_development_bonus',
    label: 'Enterprise Development — Bonus (graduation)',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'enterprise_development.bonus.graduation.percentage',
        targetKey: 'enterprise_development.bonus.graduation.target',
        availablePointsKey: 'enterprise_development.bonus.graduation.available_points',
      },
    ],
    notes: 'Optional single graduation bonus row on ED & SD when clearly labelled.',
  },
  {
    key: 'esd.enterprise_development_bonus_job_creation',
    pillarKey: 'procurement_esd',
    sectionKey: 'enterprise_development_bonus',
    label: 'Enterprise Development — Bonus (job creation)',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'enterprise_development.bonus.job_creation.percentage',
        targetKey: 'enterprise_development.bonus.job_creation.target',
        availablePointsKey: 'enterprise_development.bonus.job_creation.available_points',
      },
    ],
    notes: 'Optional single job-creation bonus row on ED & SD when clearly labelled.',
  },
  {
    key: 'esd.enterprise_development_total',
    pillarKey: 'procurement_esd',
    sectionKey: 'enterprise_development_total',
    label: 'Enterprise Development — Total',
    availablePoints: 5,
    requiredMetricKeys: [],
    optionalMetricKeys: [
      'enterprise_development.total.available_points',
      'enterprise_development.annual_value.amount',
      'enterprise_development.npat.amount',
      'npat.target_base_value',
    ],
    calculationType: 'sum_indicators',
    includeInPillarAggregate: false,
    sumChildIndicatorKeys: [
      'esd.enterprise_development_annual_value',
      'esd.enterprise_development_bonus_graduation',
      'esd.enterprise_development_bonus_job_creation',
    ],
    notes:
      'Sums ED indicators; bonus rows contribute only when extracted; NPAT mirror and target base attach for audit.',
  },
  {
    key: 'esd.supplier_development_annual_value',
    pillarKey: 'procurement_esd',
    sectionKey: 'supplier_development',
    label: 'Supplier Development — Annual value',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'supplier_development.annual_value.percentage',
        targetKey: 'supplier_development.annual_value.target',
        availablePointsKey: 'supplier_development.annual_value.available_points',
      },
    ],
    notes: 'From ED & SD sheet (not Full Scorecard reference).',
  },
  {
    key: 'esd.supplier_development_bonus_graduation',
    pillarKey: 'procurement_esd',
    sectionKey: 'supplier_development_bonus',
    label: 'Supplier Development — Bonus (graduation)',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'supplier_development.bonus.graduation.percentage',
        targetKey: 'supplier_development.bonus.graduation.target',
        availablePointsKey: 'supplier_development.bonus.graduation.available_points',
      },
    ],
    notes: 'Optional graduation bonus row on ED & SD when clearly labelled for Supplier Development.',
  },
  {
    key: 'esd.supplier_development_bonus_job_creation',
    pillarKey: 'procurement_esd',
    sectionKey: 'supplier_development_bonus',
    label: 'Supplier Development — Bonus (job creation)',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'supplier_development.bonus.job_creation.percentage',
        targetKey: 'supplier_development.bonus.job_creation.target',
        availablePointsKey: 'supplier_development.bonus.job_creation.available_points',
      },
    ],
    notes: 'Optional job creation bonus row on ED & SD when clearly labelled for Supplier Development.',
  },
  {
    key: 'esd.supplier_development_total',
    pillarKey: 'procurement_esd',
    sectionKey: 'supplier_development_total',
    label: 'Supplier Development — Total',
    availablePoints: 10,
    requiredMetricKeys: [],
    optionalMetricKeys: [
      'supplier_development.total.available_points',
      'supplier_development.annual_value.amount',
      'supplier_development.npat.amount',
      'npat.target_base_value',
    ],
    calculationType: 'sum_indicators',
    includeInPillarAggregate: false,
    sumChildIndicatorKeys: [
      'esd.supplier_development_annual_value',
      'esd.supplier_development_bonus_graduation',
      'esd.supplier_development_bonus_job_creation',
    ],
    notes:
      'Sums SD indicators; bonus rows contribute only when extracted; NPAT mirror and target base attach for audit.',
  },
  {
    key: 'procurement_esd.combined_total',
    pillarKey: 'procurement_esd',
    sectionKey: 'procurement_esd_total',
    label: 'Procurement / ESD — Combined total',
    availablePoints: null,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'sum_indicators',
    includeInPillarAggregate: true,
    sumChildIndicatorKeys: [
      'procurement.preferential_total',
      'esd.enterprise_development_total',
      'esd.supplier_development_total',
    ],
    notes:
      'Rolls Preferential Procurement + Enterprise Development + Supplier Development into one pillar line; section totals are not double-counted in the Procurement / ESD pillar.',
  },
  {
    key: 'sed.annual_spend',
    pillarKey: 'sed',
    sectionKey: 'annual_spend',
    label: 'SED — Annual spend',
    availablePoints: 5,
    requiredMetricKeys: [],
    optionalMetricKeys: [],
    calculationType: 'proportional_points',
    includeInPillarAggregate: false,
    proportionalRows: [
      {
        percentageKey: 'socio_economic_development.annual_spend.percentage',
        targetKey: 'socio_economic_development.annual_spend.target',
        availablePointsKey: 'socio_economic_development.annual_spend.available_points',
      },
    ],
    notes: 'Scored from SED sheet compliance row (B–D), not Full Scorecard reference.',
  },
  {
    key: 'sed.total',
    pillarKey: 'sed',
    sectionKey: 'sed_total',
    label: 'SED — Total',
    availablePoints: 5,
    requiredMetricKeys: [],
    optionalMetricKeys: [
      'socio_economic_development.total.available_points',
      'socio_economic_development.annual_spend.amount',
      'socio_economic_development.npat.amount',
    ],
    calculationType: 'sum_indicators',
    includeInPillarAggregate: true,
    sumChildIndicatorKeys: ['sed.annual_spend'],
    notes:
      'Single child today; optional sheet total and context metrics (spend amount, NPAT mirror) for audit display only.',
  },
]
