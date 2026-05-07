/**
 * **`ED & SD`** extraction for the full-scorecard path: merges **Enterprise Development** and
 * **Supplier Development** metrics from the same sheet (see `enterprise-development-sheet.ts` and
 * `supplier-development-sheet.ts` for row-level layout and classification rules).
 */
import type { CanonicalExtractionResult, ParsedWorkbookResult } from '../types'
import { extractEnterpriseDevelopmentSheetMetrics } from './enterprise-development-sheet'
import { extractSupplierDevelopmentSheetMetrics } from './supplier-development-sheet'

function merge(a: CanonicalExtractionResult, b: CanonicalExtractionResult): CanonicalExtractionResult {
  return {
    metrics: [...a.metrics, ...b.metrics],
    issues: [...a.issues, ...b.issues],
  }
}

export function extractEdSdMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  return merge(
    extractEnterpriseDevelopmentSheetMetrics(parsedWorkbook),
    extractSupplierDevelopmentSheetMetrics(parsedWorkbook),
  )
}
