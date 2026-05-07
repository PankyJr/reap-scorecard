import type { MetricDefinition } from './types'

const REF_PILLAR = 'Full Scorecard Reference'

/** Ownership tab — row-scanned; see `extractors/ownership-sheet.ts` for column layout. */
export const OWNERSHIP_SHEET_METRIC_DEFINITIONS: MetricDefinition[] = [
  ...(
    [
      ['ownership.voting_rights.black_people', 'Voting rights — Black people'],
      ['ownership.voting_rights.black_women', 'Voting rights — Black women'],
      ['ownership.economic_interest.black_people', 'Economic interest — Black people'],
      ['ownership.economic_interest.black_women', 'Economic interest — Black women'],
      ['ownership.economic_interest.designated_groups', 'Economic interest — Designated groups'],
    ] as const
  ).flatMap(
    ([metricPrefix, labelBase]): MetricDefinition[] => [
      {
        metricKey: `${metricPrefix}.percentage`,
        pillar: 'Ownership',
        section: labelBase.split(' — ')[0],
        label: `${labelBase} — actual %`,
        sourceSheet: 'Ownership',
        expectedType: 'percentage',
        required: false,
      },
      {
        metricKey: `${metricPrefix}.target`,
        pillar: 'Ownership',
        section: labelBase.split(' — ')[0],
        label: `${labelBase} — target %`,
        sourceSheet: 'Ownership',
        expectedType: 'percentage',
        required: false,
      },
      {
        metricKey: `${metricPrefix}.available_points`,
        pillar: 'Ownership',
        section: labelBase.split(' — ')[0],
        label: `${labelBase} — available points`,
        sourceSheet: 'Ownership',
        expectedType: 'number',
        unit: 'points',
        required: false,
      },
    ],
  ),
  {
    metricKey: 'ownership.net_value.percentage',
    pillar: 'Ownership',
    section: 'Net Value',
    label: 'Net value — actual %',
    sourceSheet: 'Ownership',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'ownership.net_value.target',
    pillar: 'Ownership',
    section: 'Net Value',
    label: 'Net value — target %',
    sourceSheet: 'Ownership',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'ownership.net_value.available_points',
    pillar: 'Ownership',
    section: 'Net Value',
    label: 'Net value — available points',
    sourceSheet: 'Ownership',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'ownership.total.available_points',
    pillar: 'Ownership',
    section: 'Total',
    label: 'Ownership — total available points (sheet)',
    sourceSheet: 'Ownership',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
]

function mcBlackPeopleWomenDefs(
  metricPrefix: string,
  sectionLabel: string,
  sourceSheet: string,
): MetricDefinition[] {
  return (
    [
      ['black_people', 'Black people'],
      ['black_women', 'Black women'],
    ] as const
  ).flatMap(
    ([suffix, title]): MetricDefinition[] => [
      {
        metricKey: `${metricPrefix}.${suffix}.percentage`,
        pillar: 'Management Control',
        section: sectionLabel,
        label: `${sectionLabel} — ${title} — actual %`,
        sourceSheet,
        expectedType: 'percentage',
        required: false,
      },
      {
        metricKey: `${metricPrefix}.${suffix}.target`,
        pillar: 'Management Control',
        section: sectionLabel,
        label: `${sectionLabel} — ${title} — target %`,
        sourceSheet,
        expectedType: 'percentage',
        required: false,
      },
      {
        metricKey: `${metricPrefix}.${suffix}.available_points`,
        pillar: 'Management Control',
        section: sectionLabel,
        label: `${sectionLabel} — ${title} — available points`,
        sourceSheet,
        expectedType: 'number',
        unit: 'points',
        required: false,
      },
    ],
  )
}

/**
 * Management Control pillar — extracted from `3 Board Members`, `4 Executive Committe`,
 * `Employment Equity`, optionally `Management Control` (totals). See `extractors/management-control-sheets.ts`.
 */
export const MANAGEMENT_CONTROL_SHEET_METRIC_DEFINITIONS: MetricDefinition[] = [
  ...mcBlackPeopleWomenDefs('management_control.board', 'Board', '3 Board Members'),
  ...mcBlackPeopleWomenDefs(
    'management_control.executive_directors',
    'Executive directors',
    '4 Executive Committe',
  ),
  ...mcBlackPeopleWomenDefs(
    'management_control.other_executive_management',
    'Other executive management',
    'Employment Equity',
  ),
  ...mcBlackPeopleWomenDefs('management_control.senior_management', 'Senior management', 'Employment Equity'),
  ...mcBlackPeopleWomenDefs('management_control.middle_management', 'Middle management', 'Employment Equity'),
  ...mcBlackPeopleWomenDefs('management_control.junior_management', 'Junior management', 'Employment Equity'),
  {
    metricKey: 'management_control.employees_with_disabilities.black_people.percentage',
    pillar: 'Management Control',
    section: 'Employees with disabilities',
    label: 'Employees with disabilities — Black people — actual %',
    sourceSheet: 'Employment Equity',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'management_control.employees_with_disabilities.black_people.target',
    pillar: 'Management Control',
    section: 'Employees with disabilities',
    label: 'Employees with disabilities — Black people — target %',
    sourceSheet: 'Employment Equity',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'management_control.employees_with_disabilities.black_people.available_points',
    pillar: 'Management Control',
    section: 'Employees with disabilities',
    label: 'Employees with disabilities — Black people — available points',
    sourceSheet: 'Employment Equity',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'management_control.total.available_points',
    pillar: 'Management Control',
    section: 'Total',
    label: 'Management Control — total available points (sheet)',
    sourceSheet: 'Management Control',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
]

function sdSpendTriples(
  metricStem: 'skills_development.expenditure' | 'skills_development.learnerships',
  sectionTitle: string,
  sourceSheet: string,
): MetricDefinition[] {
  const demos = [
    ['black_people', 'Black people'],
    ['black_women', 'Black women'],
    ['disabled_black_people', 'Disabled — Black people'],
  ] as const
  return demos.flatMap(
    ([suffix, title]): MetricDefinition[] => [
      {
        metricKey: `${metricStem}.${suffix}.percentage`,
        pillar: 'Skills Development',
        section: sectionTitle,
        label: `${sectionTitle} — ${title} — actual %`,
        sourceSheet,
        expectedType: 'percentage',
        required: false,
      },
      {
        metricKey: `${metricStem}.${suffix}.target`,
        pillar: 'Skills Development',
        section: sectionTitle,
        label: `${sectionTitle} — ${title} — target %`,
        sourceSheet,
        expectedType: 'percentage',
        required: false,
      },
      {
        metricKey: `${metricStem}.${suffix}.available_points`,
        pillar: 'Skills Development',
        section: sectionTitle,
        label: `${sectionTitle} — ${title} — available points`,
        sourceSheet,
        expectedType: 'number',
        unit: 'points',
        required: false,
      },
    ],
  )
}

/**
 * Skills Development pillar — see `extractors/skills-development-sheets.ts` for sheet roles and column layout.
 */
export const SKILLS_DEVELOPMENT_SHEET_METRIC_DEFINITIONS: MetricDefinition[] = [
  ...sdSpendTriples('skills_development.expenditure', 'Expenditure', 'Skills Development'),
  ...sdSpendTriples('skills_development.learnerships', 'Learnerships', 'Interns & Learners'),
  {
    metricKey: 'skills_development.bonus.absorption.percentage',
    pillar: 'Skills Development',
    section: 'Bonus',
    label: 'Absorption bonus — actual %',
    sourceSheet: 'Learner summary',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'skills_development.bonus.absorption.target',
    pillar: 'Skills Development',
    section: 'Bonus',
    label: 'Absorption bonus — target %',
    sourceSheet: 'Learner summary',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'skills_development.bonus.absorption.available_points',
    pillar: 'Skills Development',
    section: 'Bonus',
    label: 'Absorption bonus — available points',
    sourceSheet: 'Learner summary',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'skills_development.total.available_points',
    pillar: 'Skills Development',
    section: 'Total',
    label: 'Skills Development — total available points (sheet)',
    sourceSheet: 'Skills Development',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'skills_development.total.bonus_available_points',
    pillar: 'Skills Development',
    section: 'Total',
    label: 'Skills Development — bonus available points (sheet)',
    sourceSheet: 'Learner summary',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'skills_development.leviable_amount',
    pillar: 'Skills Development',
    section: 'EMP201',
    label: 'Leviable amount / payroll base (EMP201)',
    sourceSheet: '13 EMP201',
    expectedType: 'currency',
    required: false,
  },
  {
    metricKey: 'skills_development.total_training_spend',
    pillar: 'Skills Development',
    section: 'Skills Expenditure',
    label: 'Total training spend (Skills Development sheet)',
    sourceSheet: 'Skills Development',
    expectedType: 'currency',
    required: false,
  },
]

const PP_PILLAR = 'Procurement / ESD'

function ppSpendTriple(metricStem: string, sectionTitle: string, sourceSheet: string): MetricDefinition[] {
  return (['percentage', 'target', 'available_points'] as const).map((suffix, idx) => {
    const titles = {
      percentage: 'actual %',
      target: 'target %',
      available_points: 'available points',
    } as const
    const types: Record<typeof suffix, MetricDefinition['expectedType']> = {
      percentage: 'percentage',
      target: 'percentage',
      available_points: 'number',
    }
    const base: MetricDefinition = {
      metricKey: `${metricStem}.${suffix}`,
      pillar: PP_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — ${titles[suffix]}`,
      sourceSheet,
      expectedType: types[suffix],
      required: false,
    }
    if (suffix === 'available_points') {
      return { ...base, unit: 'points' as const }
    }
    return base
  })
}

/**
 * Preferential Procurement — see `extractors/procurement-sheet.ts` and `extractors/tmps-sheet.ts`.
 * Supplier-line spend is not extracted in v1 (summary rows only).
 */
export const PREFERENTIAL_PROCUREMENT_SHEET_METRIC_DEFINITIONS: MetricDefinition[] = [
  ...ppSpendTriple(
    'preferential_procurement.b_bbee_procurement_spend',
    'B-BBEE procurement spend',
    'Procurement',
  ),
  ...ppSpendTriple(
    'preferential_procurement.qse_eme_procurement',
    'QSE / EME procurement',
    'Procurement',
  ),
  ...ppSpendTriple(
    'preferential_procurement.black_owned_procurement',
    'Black-owned procurement',
    'Procurement',
  ),
  ...ppSpendTriple(
    'preferential_procurement.black_women_owned_procurement',
    'Black women-owned procurement',
    'Procurement',
  ),
  ...ppSpendTriple(
    'preferential_procurement.designated_group_procurement',
    'Designated group procurement',
    'Procurement',
  ),
  {
    metricKey: 'preferential_procurement.total_measured_procurement_spend.amount',
    pillar: PP_PILLAR,
    section: 'TMPS summary',
    label: 'Total measured procurement spend',
    sourceSheet: 'TMPS',
    expectedType: 'currency',
    required: false,
  },
  {
    metricKey: 'preferential_procurement.recognised_procurement_spend.amount',
    pillar: PP_PILLAR,
    section: 'TMPS summary',
    label: 'Recognised procurement spend',
    sourceSheet: 'TMPS',
    expectedType: 'currency',
    required: false,
  },
  {
    metricKey: 'preferential_procurement.procurement_recognition.percentage',
    pillar: PP_PILLAR,
    section: 'TMPS summary',
    label: 'Procurement recognition %',
    sourceSheet: 'TMPS',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'preferential_procurement.total.available_points',
    pillar: PP_PILLAR,
    section: 'Total',
    label: 'Preferential procurement — total available points (sheet)',
    sourceSheet: 'Procurement',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
]

const ED_PILLAR = 'Procurement / ESD'

function edValueTripleWithAmount(
  metricStem: 'enterprise_development.annual_value',
  sectionTitle: string,
  sourceSheet: string,
): MetricDefinition[] {
  return [
    {
      metricKey: `${metricStem}.percentage`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — actual %`,
      sourceSheet,
      expectedType: 'percentage',
      required: false,
    },
    {
      metricKey: `${metricStem}.target`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — target %`,
      sourceSheet,
      expectedType: 'percentage',
      required: false,
    },
    {
      metricKey: `${metricStem}.available_points`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — available points`,
      sourceSheet,
      expectedType: 'number',
      unit: 'points',
      required: false,
    },
    {
      metricKey: `${metricStem}.amount`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — amount (currency)`,
      sourceSheet,
      expectedType: 'currency',
      required: false,
    },
  ]
}

function edBonusTriple(
  metricStem: 'enterprise_development.bonus.graduation' | 'enterprise_development.bonus.job_creation',
  sectionTitle: string,
  sourceSheet: string,
): MetricDefinition[] {
  return (['percentage', 'target', 'available_points'] as const).map((suffix) => {
    const titles = { percentage: 'actual %', target: 'target %', available_points: 'available points' } as const
    const types: Record<typeof suffix, MetricDefinition['expectedType']> = {
      percentage: 'percentage',
      target: 'percentage',
      available_points: 'number',
    }
    const base: MetricDefinition = {
      metricKey: `${metricStem}.${suffix}`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — ${titles[suffix]}`,
      sourceSheet,
      expectedType: types[suffix],
      required: false,
    }
    return suffix === 'available_points' ? { ...base, unit: 'points' as const } : base
  })
}

/**
 * Enterprise Development from **`ED & SD`** (not Full Scorecard reference). See `extractors/enterprise-development-sheet.ts`.
 * Supplier Development rows are excluded unless unambiguously ED. Supplier-level detail: TODO.
 */
export const ENTERPRISE_DEVELOPMENT_SHEET_METRIC_DEFINITIONS: MetricDefinition[] = [
  ...edValueTripleWithAmount('enterprise_development.annual_value', 'Enterprise Development — annual value', 'ED & SD'),
  ...edBonusTriple(
    'enterprise_development.bonus.graduation',
    'Enterprise Development — bonus (graduation)',
    'ED & SD',
  ),
  ...edBonusTriple(
    'enterprise_development.bonus.job_creation',
    'Enterprise Development — bonus (job creation)',
    'ED & SD',
  ),
  {
    metricKey: 'enterprise_development.npat.amount',
    pillar: ED_PILLAR,
    section: 'NPAT',
    label: 'NPAT amount (mirror for Enterprise Development)',
    sourceSheet: 'NPAT',
    expectedType: 'currency',
    required: false,
  },
  {
    metricKey: 'enterprise_development.total.available_points',
    pillar: ED_PILLAR,
    section: 'Total',
    label: 'Enterprise Development — total available points (sheet)',
    sourceSheet: 'ED & SD',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
]

function sdValueTripleWithAmount(
  metricStem: 'supplier_development.annual_value',
  sectionTitle: string,
  sourceSheet: string,
): MetricDefinition[] {
  return [
    {
      metricKey: `${metricStem}.percentage`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — actual %`,
      sourceSheet,
      expectedType: 'percentage',
      required: false,
    },
    {
      metricKey: `${metricStem}.target`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — target %`,
      sourceSheet,
      expectedType: 'percentage',
      required: false,
    },
    {
      metricKey: `${metricStem}.available_points`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — available points`,
      sourceSheet,
      expectedType: 'number',
      unit: 'points',
      required: false,
    },
    {
      metricKey: `${metricStem}.amount`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — amount (currency)`,
      sourceSheet,
      expectedType: 'currency',
      required: false,
    },
  ]
}

function sdBonusTriple(
  metricStem: 'supplier_development.bonus.graduation' | 'supplier_development.bonus.job_creation',
  sectionTitle: string,
  sourceSheet: string,
): MetricDefinition[] {
  return (['percentage', 'target', 'available_points'] as const).map((suffix) => {
    const titles = { percentage: 'actual %', target: 'target %', available_points: 'available points' } as const
    const types: Record<typeof suffix, MetricDefinition['expectedType']> = {
      percentage: 'percentage',
      target: 'percentage',
      available_points: 'number',
    }
    const base: MetricDefinition = {
      metricKey: `${metricStem}.${suffix}`,
      pillar: ED_PILLAR,
      section: sectionTitle,
      label: `${sectionTitle} — ${titles[suffix]}`,
      sourceSheet,
      expectedType: types[suffix],
      required: false,
    }
    return suffix === 'available_points' ? { ...base, unit: 'points' as const } : base
  })
}

/**
 * Supplier Development from **`ED & SD`** (not Full Scorecard reference). See `extractors/supplier-development-sheet.ts`.
 */
export const SUPPLIER_DEVELOPMENT_SHEET_METRIC_DEFINITIONS: MetricDefinition[] = [
  ...sdValueTripleWithAmount(
    'supplier_development.annual_value',
    'Supplier Development — annual value',
    'ED & SD',
  ),
  ...sdBonusTriple(
    'supplier_development.bonus.graduation',
    'Supplier Development — bonus (graduation)',
    'ED & SD',
  ),
  ...sdBonusTriple(
    'supplier_development.bonus.job_creation',
    'Supplier Development — bonus (job creation)',
    'ED & SD',
  ),
  {
    metricKey: 'supplier_development.npat.amount',
    pillar: ED_PILLAR,
    section: 'NPAT',
    label: 'NPAT amount (mirror for Supplier Development)',
    sourceSheet: 'NPAT',
    expectedType: 'currency',
    required: false,
  },
  {
    metricKey: 'supplier_development.total.available_points',
    pillar: ED_PILLAR,
    section: 'Total',
    label: 'Supplier Development — total available points (sheet)',
    sourceSheet: 'ED & SD',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
]

/** Socio-Economic Development pillar sheet metrics (not Full Scorecard reference). See `extractors/sed-sheet.ts`. */
export const SOCIO_ECONOMIC_DEVELOPMENT_SHEET_METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    metricKey: 'socio_economic_development.annual_spend.percentage',
    pillar: 'SED',
    section: 'Annual spend',
    label: 'SED — annual spend — actual %',
    sourceSheet: 'SED',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'socio_economic_development.annual_spend.target',
    pillar: 'SED',
    section: 'Annual spend',
    label: 'SED — annual spend — target %',
    sourceSheet: 'SED',
    expectedType: 'percentage',
    required: false,
  },
  {
    metricKey: 'socio_economic_development.annual_spend.available_points',
    pillar: 'SED',
    section: 'Annual spend',
    label: 'SED — annual spend — available points',
    sourceSheet: 'SED',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'socio_economic_development.annual_spend.amount',
    pillar: 'SED',
    section: 'Annual spend',
    label: 'SED — annual spend amount (currency)',
    sourceSheet: 'SED',
    expectedType: 'currency',
    required: false,
  },
  {
    metricKey: 'socio_economic_development.npat.amount',
    pillar: 'SED',
    section: 'NPAT',
    label: 'NPAT amount (mirror for SED context)',
    sourceSheet: 'NPAT',
    expectedType: 'currency',
    required: false,
  },
  {
    metricKey: 'socio_economic_development.total.available_points',
    pillar: 'SED',
    section: 'Total',
    label: 'SED — total available points (sheet)',
    sourceSheet: 'SED',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
]

/** Canonical metrics used by the engine and other sheet extractors (not row-scanned Full Scorecard reference). */
export const ENGINE_METRIC_DEFINITIONS: MetricDefinition[] = [
  ...OWNERSHIP_SHEET_METRIC_DEFINITIONS,
  ...MANAGEMENT_CONTROL_SHEET_METRIC_DEFINITIONS,
  ...SKILLS_DEVELOPMENT_SHEET_METRIC_DEFINITIONS,

  // Procurement / ESD
  {
    metricKey: 'procurement.summary_spend',
    pillar: 'Procurement / ESD',
    section: 'Spend Summary',
    label: 'Procurement spend summary',
    sourceSheet: 'Procurement',
    expectedType: 'currency',
    required: false,
    matcherTokens: ['spend', 'total'],
  },

  ...PREFERENTIAL_PROCUREMENT_SHEET_METRIC_DEFINITIONS,

  ...ENTERPRISE_DEVELOPMENT_SHEET_METRIC_DEFINITIONS,

  ...SUPPLIER_DEVELOPMENT_SHEET_METRIC_DEFINITIONS,

  ...SOCIO_ECONOMIC_DEVELOPMENT_SHEET_METRIC_DEFINITIONS,

  // NPAT
  {
    metricKey: 'npat.value',
    pillar: 'NPAT',
    label: 'NPAT value',
    sourceSheet: 'NPAT',
    expectedType: 'currency',
    required: true,
    matcherTokens: ['npat'],
  },
  {
    metricKey: 'npat.target_base_value',
    pillar: 'NPAT',
    section: 'Target Base',
    label: 'Target/base value used for ED/SD/SED',
    sourceSheet: 'NPAT',
    expectedType: 'currency',
    required: false,
    matcherTokens: ['target', 'base'],
  },
]

/** Excel Full Scorecard tab — comparison only; extracted via row labels + adjacent columns. */
export const FULL_SCORECARD_REFERENCE_METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    metricKey: 'full_scorecard.reference.total_available_points',
    pillar: REF_PILLAR,
    label: 'Reference: total available points',
    sourceSheet: 'Full Scorecard',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'full_scorecard.reference.total_points_achieved',
    pillar: REF_PILLAR,
    label: 'Reference: total points achieved',
    sourceSheet: 'Full Scorecard',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'full_scorecard.reference.total_possible_points_1',
    pillar: REF_PILLAR,
    label: 'Reference: total possible points (1)',
    sourceSheet: 'Full Scorecard',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'full_scorecard.reference.total_possible_points_2',
    pillar: REF_PILLAR,
    label: 'Reference: total possible points (2)',
    sourceSheet: 'Full Scorecard',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'full_scorecard.reference.final_score',
    pillar: REF_PILLAR,
    label: 'Reference: final score',
    sourceSheet: 'Full Scorecard',
    expectedType: 'number',
    unit: 'points',
    required: false,
  },
  {
    metricKey: 'full_scorecard.reference.discounting_applicable',
    pillar: REF_PILLAR,
    label: 'Reference: discounting applicable',
    sourceSheet: 'Full Scorecard',
    expectedType: 'boolean',
    required: false,
  },
  {
    metricKey: 'full_scorecard.reference.bbbee_level',
    pillar: REF_PILLAR,
    label: 'Reference: B-BBEE level',
    sourceSheet: 'Full Scorecard',
    expectedType: 'text',
    required: false,
  },
  {
    metricKey: 'full_scorecard.reference.recognition_percentage',
    pillar: REF_PILLAR,
    label: 'Reference: recognition percentage',
    sourceSheet: 'Full Scorecard',
    expectedType: 'percentage',
    required: false,
  },
  ...(
    [
      'ownership',
      'management_control',
      'skills_development',
      'preferential_procurement',
      'enterprise_development',
      'supplier_development',
      'socio_economic_development',
    ] as const
  ).flatMap((element) => {
    const labelBase = element.replace(/_/g, ' ')
    return [
      {
        metricKey: `full_scorecard.reference.${element}.available_points`,
        label: `Reference: ${labelBase} — available points`,
      },
      {
        metricKey: `full_scorecard.reference.${element}.points_achieved`,
        label: `Reference: ${labelBase} — points achieved`,
      },
      {
        metricKey: `full_scorecard.reference.${element}.possible_points_1`,
        label: `Reference: ${labelBase} — possible points (1)`,
      },
      {
        metricKey: `full_scorecard.reference.${element}.possible_points_2`,
        label: `Reference: ${labelBase} — possible points (2)`,
      },
    ].map(
      (m): MetricDefinition => ({
        metricKey: m.metricKey,
        pillar: REF_PILLAR,
        label: m.label,
        sourceSheet: 'Full Scorecard',
        expectedType: 'number',
        unit: 'points',
        required: false,
      }),
    )
  }),
]

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  ...ENGINE_METRIC_DEFINITIONS,
  ...FULL_SCORECARD_REFERENCE_METRIC_DEFINITIONS,
]
