import type { CanonicalExtractionResult, ParsedWorkbookResult } from '../types'
import { extractOwnershipSheetMetrics } from './ownership-sheet'

export function extractOwnershipMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  return extractOwnershipSheetMetrics(parsedWorkbook)
}
