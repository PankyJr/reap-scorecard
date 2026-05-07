import type { CanonicalExtractionResult, ParsedWorkbookResult } from '../types'
import { extractSedSheetMetrics } from './sed-sheet'

export function extractSedMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  return extractSedSheetMetrics(parsedWorkbook)
}
