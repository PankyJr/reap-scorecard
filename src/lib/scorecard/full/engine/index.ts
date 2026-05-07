import { buildEngineInputs } from './build-inputs'
import { calculateFullScorecard } from './calculate'
import { buildValidationSummary } from './validation-summary'
import type { FullScorecardEngineResult } from './types'

export const FULL_SCORECARD_ENGINE_VERSION = 'full-v0-scaffold'

type EngineMetricRow = Parameters<typeof buildEngineInputs>[0][number]

export function runFullScorecardEngine(metricRows: EngineMetricRow[]): FullScorecardEngineResult {
  const input = buildEngineInputs(metricRows)
  const result = calculateFullScorecard({
    input,
    engineVersion: FULL_SCORECARD_ENGINE_VERSION,
  })
  return {
    ...result,
    validationSummary: buildValidationSummary(input, result),
  }
}

export * from './types'
export { buildValidationSummary } from './validation-summary'
