import { METRIC_DEFINITIONS } from '../metric-definitions'
import type { CanonicalExtractionResult, ParsedWorkbookResult } from '../types'
import { extractByDefinitions } from './common'

export function extractNpatMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const defs = METRIC_DEFINITIONS.filter((d) => d.pillar === 'NPAT')
  return extractByDefinitions(parsedWorkbook, defs)
}
