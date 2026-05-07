import { ENGINE_METRIC_DEFINITIONS } from '../metric-definitions'
import type { CanonicalExtractionResult, ParsedWorkbookResult } from '../types'
import { extractByDefinitions } from './common'
import { extractProcurementSheetPreferentialMetrics } from './procurement-sheet'
import { extractTmpsSheetPreferentialMetrics } from './tmps-sheet'

function merge(a: CanonicalExtractionResult, b: CanonicalExtractionResult): CanonicalExtractionResult {
  return {
    metrics: [...a.metrics, ...b.metrics],
    issues: [...a.issues, ...b.issues],
  }
}

export function extractProcurementMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  const legacy = extractByDefinitions(
    parsedWorkbook,
    ENGINE_METRIC_DEFINITIONS.filter((d) => d.metricKey === 'procurement.summary_spend'),
  )
  const preferentialProcurement = extractProcurementSheetPreferentialMetrics(parsedWorkbook)
  const tmps = extractTmpsSheetPreferentialMetrics(parsedWorkbook)
  return merge(merge(legacy, preferentialProcurement), tmps)
}
