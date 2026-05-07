import { ENGINE_METRIC_DEFINITIONS } from '../metric-definitions'
import type {
  FullEngineError,
  FullEngineWarning,
  FullScorecardEngineInput,
  FullScorecardEngineInputMetric,
} from './types'

type MetricRow = {
  metric_key: string
  pillar: string
  numeric_value: number | null
  text_value: string | null
  boolean_value: boolean | null
  value_type: string
  validation_state: 'valid' | 'warning' | 'error'
  validation_message?: string | null
  source_sheet: string
  source_cell: string | null
  source_range: string | null
}

export function buildEngineInputs(
  metricRows: MetricRow[],
): FullScorecardEngineInput {
  const byPillar: Record<string, FullScorecardEngineInputMetric[]> = {}
  const byMetricKey: Record<string, FullScorecardEngineInputMetric> = {}
  const warnings: FullEngineWarning[] = []
  const errors: FullEngineError[] = []

  for (const row of metricRows) {
    if (row.validation_state === 'error') {
      warnings.push({
        code: 'metric_ignored_error_state',
        message: `Metric "${row.metric_key}" ignored because it is in error state.`,
        pillar: row.pillar,
      })
      continue
    }

    const metric: FullScorecardEngineInputMetric = {
      metricKey: row.metric_key,
      pillar: row.pillar,
      numericValue: row.numeric_value,
      textValue: row.text_value,
      booleanValue: row.boolean_value,
      valueType: row.value_type,
      validationState: row.validation_state,
      validationMessage: row.validation_message ?? null,
      sourceSheet: row.source_sheet,
      sourceCell: row.source_cell,
      sourceRange: row.source_range,
    }

    byMetricKey[metric.metricKey] = metric
    if (!byPillar[metric.pillar]) byPillar[metric.pillar] = []
    byPillar[metric.pillar].push(metric)
  }

  for (const def of ENGINE_METRIC_DEFINITIONS) {
    if (!def.required) continue
    const metric = byMetricKey[def.metricKey]
    if (!metric) {
      warnings.push({
        code: 'required_metric_missing',
        message: `Required metric "${def.metricKey}" is missing for pillar "${def.pillar}".`,
        pillar: def.pillar,
      })
      continue
    }

    const hasValue =
      metric.numericValue != null ||
      (metric.textValue != null && metric.textValue !== '') ||
      metric.booleanValue != null

    if (!hasValue) {
      warnings.push({
        code: 'required_metric_empty',
        message: `Required metric "${def.metricKey}" is empty and will block strict calculations.`,
        pillar: def.pillar,
      })
    }
  }

  return {
    byPillar,
    byMetricKey,
    warnings,
    errors,
  }
}
