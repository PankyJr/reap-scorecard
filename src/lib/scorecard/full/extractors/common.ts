import type {
  CanonicalExtractionResult,
  MetricDefinition,
  ParsedWorkbookResult,
} from '../types'
import {
  buildMetricValidationIssue,
  createMetricValue,
  findValueByTokens,
  findWorkbookSheetByTitle,
  getCellValue,
} from './helpers'

function findSheet(parsedWorkbook: ParsedWorkbookResult, sheetName: string) {
  return findWorkbookSheetByTitle(parsedWorkbook, sheetName)
}

export function extractByDefinitions(
  parsedWorkbook: ParsedWorkbookResult,
  definitions: MetricDefinition[],
): CanonicalExtractionResult {
  const metrics: CanonicalExtractionResult['metrics'] = []
  const issues: CanonicalExtractionResult['issues'] = []

  for (const definition of definitions) {
    const sheet = findSheet(parsedWorkbook, definition.sourceSheet)
    if (!sheet) {
      const validationState = definition.required ? 'error' : 'warning'
      const metric = createMetricValue(definition, {
        value: null,
        sourceSheet: definition.sourceSheet,
        sourceCell: definition.sourceCell ?? null,
        sourceRange: definition.sourceRange ?? null,
        validationState,
        validationMessage: `Source sheet "${definition.sourceSheet}" not found.`,
      })
      metrics.push(metric)
      issues.push({
        issueType: 'required_metric_missing',
        severity: definition.required ? 'error' : 'warning',
        sheetName: definition.sourceSheet,
        metricKey: definition.metricKey,
        message: `Metric "${definition.metricKey}" could not be extracted because source sheet is missing.`,
      })
      continue
    }

    let pickedValue: unknown = null
    let sourceCell: string | null = definition.sourceCell ?? null
    let sourceRange: string | null = definition.sourceRange ?? null

    if (definition.sourceCell) {
      pickedValue = getCellValue(sheet, definition.sourceCell)?.rawValue ?? null
    } else if (definition.matcherTokens?.length) {
      const found = findValueByTokens(sheet, definition.matcherTokens)
      if (found) {
        pickedValue = found.value
        sourceCell = found.sourceCell
        sourceRange = found.sourceRange
      }
    }

    const metric = createMetricValue(definition, {
      value: pickedValue,
      sourceSheet: sheet.sheetName,
      sourceCell,
      sourceRange,
    })

    if (metric.valueType === 'error') {
      const isRequired = definition.required
      metric.validationState = isRequired ? 'error' : 'warning'
      metric.validationMessage = `Excel error "${metric.textValue ?? metric.rawValue ?? 'Unknown'}" in source cell.`
      issues.push(
        buildMetricValidationIssue(
          definition,
          metric,
          metric.validationMessage,
        ),
      )
    } else if (metric.valueType === 'empty') {
      metric.validationState = definition.required ? 'error' : 'warning'
      metric.validationMessage = definition.required
        ? 'Required metric is missing or empty.'
        : 'Optional metric is missing or empty.'
      issues.push(
        buildMetricValidationIssue(
          definition,
          metric,
          metric.validationMessage,
        ),
      )
    } else if (
      metric.numericValue != null &&
      (
        (definition.min != null && metric.numericValue < definition.min) ||
        (definition.max != null && metric.numericValue > definition.max)
      )
    ) {
      metric.validationState = definition.required ? 'error' : 'warning'
      metric.validationMessage = `Value ${metric.numericValue} is outside expected bounds.`
      issues.push(
        buildMetricValidationIssue(
          definition,
          metric,
          metric.validationMessage,
        ),
      )
    }

    metrics.push(metric)
  }

  return { metrics, issues }
}
