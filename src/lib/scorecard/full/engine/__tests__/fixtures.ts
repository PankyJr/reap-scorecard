import type { FullScorecardEngineInput } from '../types'
import type { FullScorecardPillarResult } from '../types'

export const SAMPLE_WORKBOOK_ID = '11111111-1111-1111-1111-111111111111'
export const SAMPLE_COMPANY_ID = '22222222-2222-2222-2222-222222222222'

type MetricRow = {
  metric_key: string
  pillar?: string
  numeric_value?: number | null
  text_value?: string | null
  boolean_value?: boolean | null
  value_type?: string
  validation_state?: 'valid' | 'warning' | 'error'
  validation_message?: string | null
  source_sheet?: string
  source_cell?: string | null
  source_range?: string | null
}

export function validMetricRow(overrides: MetricRow): {
  metric_key: string
  pillar: string
  numeric_value: number | null
  text_value: string | null
  boolean_value: boolean | null
  value_type: string
  validation_state: 'valid' | 'warning' | 'error'
  validation_message: string | null
  source_sheet: string
  source_cell: string | null
  source_range: string | null
} {
  return {
    metric_key: overrides.metric_key,
    pillar: overrides.pillar ?? 'Ownership',
    numeric_value: overrides.numeric_value ?? null,
    text_value: overrides.text_value ?? null,
    boolean_value: overrides.boolean_value ?? null,
    value_type: overrides.value_type ?? 'number',
    validation_state: overrides.validation_state ?? 'valid',
    validation_message: overrides.validation_message ?? null,
    source_sheet: overrides.source_sheet ?? 'Full Scorecard',
    source_cell: overrides.source_cell ?? 'A1',
    source_range: overrides.source_range ?? null,
  }
}

export function errorMetricRow(overrides: MetricRow) {
  return validMetricRow({
    ...overrides,
    value_type: 'error',
    validation_state: 'error',
    text_value: overrides.text_value ?? '#REF!',
  })
}

export function minimalInputForEngine(): FullScorecardEngineInput {
  return {
    byPillar: {
      Ownership: [],
    },
    byMetricKey: {},
    warnings: [],
    errors: [],
  }
}

export function pillarWithOwnershipSummary(
  overrides: Partial<{
    availablePoints: number | null
    achievedPoints: number | null
    status: 'calculated' | 'not_calculated'
  }> = {},
): FullScorecardPillarResult {
  const availablePoints =
    overrides.availablePoints !== undefined ? overrides.availablePoints : 25
  const achievedPoints =
    overrides.achievedPoints !== undefined ? overrides.achievedPoints : 20
  const status = overrides.status ?? 'calculated'
  return {
    key: 'ownership',
    label: 'Ownership',
    availablePoints,
    achievedPoints,
    possiblePoints1: null,
    possiblePoints2: null,
    status,
    sections: [
      {
        key: 'ownership_total',
        label: 'ownership total',
        indicators: [
          {
            key: 'ownership.total',
            label: 'Ownership — Total',
            target: null,
            percentageAchieved: null,
            availablePoints,
            achievedPoints,
            possiblePoints1: null,
            possiblePoints2: null,
            status,
            missingMetricKeys: [],
            sourceMetrics: [],
            warnings: [],
          },
        ],
      },
    ],
    warnings: [],
  }
}
