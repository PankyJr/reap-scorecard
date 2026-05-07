import type { CanonicalExtractionResult, ParsedWorkbookResult } from '../types'
import { extractOwnershipMetrics } from './ownership'
import { extractManagementControlMetrics } from './management-control'
import { extractSkillsDevelopmentMetrics } from './skills-development'
import { extractProcurementMetrics } from './procurement'
import { extractEdSdMetrics } from './ed-sd'
import { extractSedMetrics } from './sed'
import { extractNpatMetrics } from './npat'
import { extractFullScorecardReference } from './full-scorecard-reference'

function mergeResults(results: CanonicalExtractionResult[]): CanonicalExtractionResult {
  const metrics: CanonicalExtractionResult['metrics'] = []
  const issues: CanonicalExtractionResult['issues'] = []
  for (const result of results) {
    metrics.push(...result.metrics)
    issues.push(...result.issues)
  }
  return { metrics, issues }
}

export function extractCanonicalMetrics(
  parsedWorkbook: ParsedWorkbookResult,
): CanonicalExtractionResult {
  return mergeResults([
    extractOwnershipMetrics(parsedWorkbook),
    extractManagementControlMetrics(parsedWorkbook),
    extractSkillsDevelopmentMetrics(parsedWorkbook),
    extractProcurementMetrics(parsedWorkbook),
    extractEdSdMetrics(parsedWorkbook),
    extractSedMetrics(parsedWorkbook),
    extractNpatMetrics(parsedWorkbook),
    extractFullScorecardReference(parsedWorkbook),
  ])
}
