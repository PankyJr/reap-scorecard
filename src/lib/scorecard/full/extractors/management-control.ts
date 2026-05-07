import type { CanonicalExtractionResult, ParsedWorkbookResult } from '../types'
import { extractManagementControlSheetMetrics } from './management-control-sheets'

export function extractManagementControlMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  return extractManagementControlSheetMetrics(parsedWorkbook)
}
