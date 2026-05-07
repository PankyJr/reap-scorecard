import type { CanonicalExtractionResult, ParsedWorkbookResult } from '../types'
import { extractSkillsDevelopmentSheetMetrics } from './skills-development-sheets'

export function extractSkillsDevelopmentMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  return extractSkillsDevelopmentSheetMetrics(parsedWorkbook)
}
