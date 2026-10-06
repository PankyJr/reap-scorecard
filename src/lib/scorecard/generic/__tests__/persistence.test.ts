import { describe, expect, it } from 'vitest'
import { calculateGenericScorecard } from '..'
import {
  assessmentResultColumns,
  buildGenericInputs,
  calculationRunRow,
  hydrateApplicability,
  hydrateFinancialInputs,
  hydrateOwnership,
  priorityResultRows,
} from '../persistence'
import { completeScorecardInputs, sedContribution } from './fixtures'

/** Stored rows for a fully captured assessment, every element row in `status`. */
function storedCompleteAssessment(status = 'ready_to_calculate'): Parameters<typeof buildGenericInputs>[0] {
  return {
  assessment: {
    id: 'a1',
    rule_set_key: 'generic-codes-2019-v1',
    eap_target_set_id: null,
    eap_target_snapshot: {
      name: 'Synthetic EAP',
      version: 1,
      values: [
        { demographic_key: 'african_male', target_value: 43.5 },
        { demographic_key: 'coloured_male', target_value: 4.6 },
        { demographic_key: 'indian_male', target_value: 1.7 },
        { demographic_key: 'african_female', target_value: 37.5 },
        { demographic_key: 'coloured_female', target_value: 4.2 },
        { demographic_key: 'indian_female', target_value: 1.0 },
      ],
    },
    applicability_snapshot: completeScorecardInputs().applicability,
    financial_inputs: completeScorecardInputs().financial,
    ownership_inputs: completeScorecardInputs().ownership,
    procurement_snapshot: completeScorecardInputs().procurementSnapshot,
    scope_mode: 'full',
    selected_elements: [],
  },
  elements: [
    {
      element_key: 'management_control',
      status,
      contextual_inputs: completeScorecardInputs().managementControl,
      import_snapshot: null,
    },
    {
      element_key: 'skills_development',
      status,
      contextual_inputs: completeScorecardInputs().skillsDevelopment,
      import_snapshot: null,
    },
    {
      element_key: 'enterprise_development',
      status,
      contextual_inputs: { bonusConfirmed: true, bonusEvidenceProvided: true },
      import_snapshot: null,
    },
    {
      element_key: 'supplier_development',
      status,
      contextual_inputs: { bonusConfirmed: true, bonusEvidenceProvided: true },
      import_snapshot: null,
    },
  ],
  contributions: [
    {
      id: 'ed-1',
      element_key: 'enterprise_development',
      beneficiary_name: 'Synthetic Beneficiary 001',
      beneficiary_classification: 'eme',
      beneficiary_black_ownership_percentage: 1,
      was_eme_or_qse_at_first_assistance: true,
      years_since_first_assistance: 1,
      contribution_type: 'grant_contribution',
      actual_value: 300_000,
      supplied_benefit_factor: null,
      contribution_date: '2025-09-01',
      evidence_provided: true,
      black_beneficiary_percentage: null,
      notes: null,
    },
    {
      id: 'sd-1',
      element_key: 'supplier_development',
      beneficiary_name: 'Synthetic Beneficiary 002',
      beneficiary_classification: 'eme',
      beneficiary_black_ownership_percentage: 1,
      was_eme_or_qse_at_first_assistance: true,
      years_since_first_assistance: 1,
      contribution_type: 'grant_contribution',
      actual_value: 600_000,
      supplied_benefit_factor: null,
      contribution_date: '2025-09-01',
      evidence_provided: true,
      black_beneficiary_percentage: null,
      notes: null,
    },
    {
      id: 'sed-1',
      element_key: 'socio_economic_development',
      beneficiary_name: 'Synthetic Beneficiary 003',
      beneficiary_classification: 'individual',
      beneficiary_black_ownership_percentage: null,
      was_eme_or_qse_at_first_assistance: null,
      years_since_first_assistance: null,
      contribution_type: 'grant_contribution',
      actual_value: 300_000,
      supplied_benefit_factor: null,
      contribution_date: '2025-09-01',
      evidence_provided: true,
      black_beneficiary_percentage: 1,
      notes: null,
    },
  ],
}
}

describe('persistence hydration', () => {
  it('fills missing fields from typed defaults', () => {
    expect(hydrateOwnership({})).toMatchObject({ netValuePercentage: null, evidenceSource: null })
    expect(hydrateFinancialInputs({ revenue: 1 })).toMatchObject({ revenue: 1, actualNpat: null })
    expect(hydrateApplicability({ annualRevenue: 10 })).toMatchObject({
      annualRevenue: 10,
      sectorCodeApplies: null,
    })
  })

  it('rebuilds engine inputs from stored assessment rows', () => {
    const inputs = buildGenericInputs(storedCompleteAssessment())

    const result = calculateGenericScorecard(inputs)
    expect(result.readiness.complete).toBe(true)
    expect(inputs.managementControl.eapDistribution?.african_male).toBeCloseTo(0.435, 6)
    expect(inputs.skillsDevelopment.eapTargetSetLabel).toMatch(/Synthetic EAP/)
  })

  it('gives the final level on the FIRST calculation after an import', () => {
    // Every element row is still flagged `needs_review`, as it is straight
    // after a workbook import. The flag used to block readiness until a second
    // calculation had written `calculated` back; it no longer does.
    const result = calculateGenericScorecard(buildGenericInputs(storedCompleteAssessment('needs_review')))
    expect(result.readiness.complete).toBe(true)
    expect(result.readiness.reasons.join(' ')).not.toMatch(/awaiting review/i)
    expect(result.finalLevel.level).toBeTruthy()
  })

  it('matches exactly what the old second calculation produced', () => {
    // The old path: blockers for every `needs_review` row, then the statuses a
    // calculation writes back, then a second calculation.
    const stored = storedCompleteAssessment('needs_review')
    const firstInputs = buildGenericInputs(stored)
    const oldFirst = calculateGenericScorecard({
      ...firstInputs,
      additionalReadinessBlockers: stored.elements
        .filter((e) => e.status === 'needs_review')
        .map((e) => `${e.element_key} has an import awaiting review.`),
    })
    expect(oldFirst.readiness.complete).toBe(false)
    const writtenBack = stored.elements.map((row) => {
      const el = oldFirst.elements.find((e) => e.elementKey === row.element_key)
      const status = !el ? row.status : el.status === 'scored' ? 'calculated' : el.status === 'not_started' ? 'not_started' : 'needs_review'
      return { ...row, status }
    })
    const oldSecond = calculateGenericScorecard(buildGenericInputs({ ...stored, elements: writtenBack }))

    const now = calculateGenericScorecard(buildGenericInputs(stored))
    expect(now.readiness.complete).toBe(oldSecond.readiness.complete)
    expect(now.finalLevel).toEqual(oldSecond.finalLevel)
    expect(now.rawTotalPoints).toBe(oldSecond.rawTotalPoints)
    expect(now.rawTotalPoints).toBe(oldFirst.rawTotalPoints)
  })

  it('still withholds the final level when an element is genuinely incomplete', () => {
    const stored = storedCompleteAssessment('needs_review')
    const result = calculateGenericScorecard(
      buildGenericInputs({ ...stored, contributions: stored.contributions.filter((c) => c.element_key !== 'supplier_development') }),
    )
    expect(result.readiness.complete).toBe(false)
    expect(result.finalLevel.level == null || result.readiness.reasons.length > 0).toBe(true)
  })
})

describe('persisted calculation shape', () => {
  it('writes every field a calculation run must store', () => {
    const inputs = completeScorecardInputs()
    const result = calculateGenericScorecard(inputs)
    const columns = assessmentResultColumns(result)
    expect(columns.rule_set_key).toBe('generic-codes-2019-v1')
    expect(columns.needs_recalculation).toBe(false)
    expect(columns.readiness_complete).toBe(true)
    expect(columns.final_level).toBe(result.finalLevel.level)

    const run = calculationRunRow({
      assessmentId: 'a1',
      userId: 'u1',
      result,
      inputs,
      eapTargetSetVersion: '1',
    })
    expect(run.formula_breakdown).toHaveLength(7)
    expect(run.subminimum_snapshot).toHaveLength(5)
    expect(run.raw_total_points).toBe(result.rawTotalPoints)

    const priorities = priorityResultRows({ assessmentId: 'a1', calculationRunId: 'r1', result })
    expect(priorities.every((row) => row.assessment_id === 'a1')).toBe(true)
    expect(priorities.map((row) => row.priority_key)).toContain('priority.ownership.net_value')
  })

  it('stores a null final level for a partial scorecard', () => {
    const result = calculateGenericScorecard(
      completeScorecardInputs({ elementKeys: ['ownership'], procurementSnapshot: null }),
    )
    const columns = assessmentResultColumns(result)
    expect(columns.readiness_complete).toBe(false)
    expect(columns.final_level).toBeNull()
    expect(columns.recognition_percentage).toBeNull()
  })
})

describe('claimed column preservation', () => {
  it('keeps the SED Claimed value as raw optional input and never scores it', () => {
    const contribution = sedContribution({ actualValue: 200_000 })
    const result = calculateGenericScorecard(
      completeScorecardInputs({
        socioEconomicDevelopment: { records: [contribution] },
      }),
    )
    const sed = result.elements.find((element) => element.elementKey === 'socio_economic_development')!
    expect(sed.basePointsAchieved).toBeCloseTo(5, 6)
    // The Claimed column is a persistence concern, not an engine input.
    expect(JSON.stringify(result)).not.toMatch(/claimed_raw|Claimed/)
  })
})
