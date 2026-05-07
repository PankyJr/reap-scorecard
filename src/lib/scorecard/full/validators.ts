import {
  detectWorkbookSheets,
  REQUIRED_WORKBOOK_SHEETS,
  SUPPORTING_WORKBOOK_SHEETS,
} from './sheet-mapping'
import type {
  ExtractedMetricValue,
  FullWorkbookValidationIssue,
  FullWorkbookValidationResult,
  ParsedWorkbookResult,
} from './types'

export function validateParsedWorkbook(
  parsedWorkbook: ParsedWorkbookResult,
): FullWorkbookValidationResult {
  const detection = detectWorkbookSheets(parsedWorkbook.detectedSheetNames)

  const missingRequiredSheets = detection.required
    .filter((entry) => !entry.detectedName)
    .map((entry) => entry.expectedName)

  const issues: FullWorkbookValidationIssue[] = []

  for (const missing of missingRequiredSheets) {
    issues.push({
      issueType: 'missing_required_sheet',
      severity: 'error',
      sheetName: missing,
      message: `Required sheet "${missing}" is missing.`,
    })
  }

  for (const sheet of parsedWorkbook.sheets) {
    for (const warning of sheet.parseWarnings) {
      issues.push({
        issueType: 'parse_warning',
        severity: 'warning',
        sheetName: sheet.sheetName,
        message: warning,
      })
    }
  }

  return {
    requiredSheets: [...REQUIRED_WORKBOOK_SHEETS],
    supportingSheets: [...SUPPORTING_WORKBOOK_SHEETS],
    detectedSheets: parsedWorkbook.detectedSheetNames,
    missingRequiredSheets,
    issues,
    hasBlockingErrors: missingRequiredSheets.length > 0,
  }
}

export function summarizeMetricValidation(metrics: ExtractedMetricValue[]) {
  let valid = 0
  let warnings = 0
  let errors = 0
  for (const metric of metrics) {
    if (metric.validationState === 'error') errors += 1
    else if (metric.validationState === 'warning') warnings += 1
    else valid += 1
  }
  return {
    extractedMetricCount: metrics.length,
    validMetricCount: valid,
    warningCount: warnings,
    errorCount: errors,
  }
}
