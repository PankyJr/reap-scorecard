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
    const inputs = buildGenericInputs({
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
          status: 'ready_to_calculate',
          contextual_inputs: completeScorecardInputs().managementControl,
          import_snapshot: null,
        },
        {
          element_key: 'skills_development',
          status: 'ready_to_calculate',
          contextual_inputs: completeScorecardInputs().skillsDevelopment,
          import_snapshot: null,
        },
        {
          element_key: 'enterprise_development',
          status: 'ready_to_calculate',
          contextual_inputs: { bonusConfirmed: true, bonusEvidenceProvided: true },
          import_snapshot: null,
        },
        {
          element_key: 'supplier_development',
          status: 'ready_to_calculate',
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
    })

    const result = calculateGenericScorecard(inputs)
    expect(result.readiness.complete).toBe(true)
    expect(inputs.managementControl.eapDistribution?.african_male).toBeCloseTo(0.435, 6)
    expect(inputs.skillsDevelopment.eapTargetSetLabel).toMatch(/Synthetic EAP/)
  })

  it('blocks readiness when an element import still needs review', () => {
    const complete = completeScorecardInputs()
    const inputs = buildGenericInputs({
      assessment: {
        id: 'a1',
        rule_set_key: 'generic-codes-2019-v1',
        eap_target_set_id: null,
        eap_target_snapshot: null,
        applicability_snapshot: complete.applicability,
        financial_inputs: complete.financial,
        ownership_inputs: complete.ownership,
        procurement_snapshot: complete.procurementSnapshot,
        scope_mode: 'full',
        selected_elements: [],
      },
      elements: [
        {
          element_key: 'management_control',
          status: 'needs_review',
          contextual_inputs: complete.managementControl,
          import_snapshot: null,
        },
      ],
      contributions: [],
    })
    const result = calculateGenericScorecard(inputs)
    expect(result.readiness.complete).toBe(false)
    expect(result.readiness.reasons.join(' ')).toMatch(/awaiting review/i)
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
