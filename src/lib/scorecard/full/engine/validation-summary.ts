/**
 * Builds a structured variance / reconciliation debug payload stored on `result_json.validationSummary`.
 * For optional workbook smoke tests, set `FULL_SCORECARD_SAMPLE_XLSX` (see `sample-workbook.integration.test.ts`).
 */
import type {
  FullScorecardEngineInput,
  FullScorecardEngineResult,
  FullScorecardPillarResult,
  FullScorecardValidationElementSummary,
  FullScorecardValidationSourceRef,
  FullScorecardValidationSummary,
} from './types'
import {
  FULL_SCORECARD_ELEMENT_RECONCILIATION_ROUTING,
  findIndicatorInPillars,
} from './reconciliation'

function dedupeSourceRefs(refs: FullScorecardValidationSourceRef[]): FullScorecardValidationSourceRef[] {
  const seen = new Set<string>()
  const out: FullScorecardValidationSourceRef[] = []
  for (const r of refs) {
    const k = `${r.metricKey}|${r.sourceSheet}|${r.sourceCell ?? ''}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

function collectPillarDebug(
  input: FullScorecardEngineInput,
  pillar: FullScorecardPillarResult,
): Pick<FullScorecardValidationElementSummary, 'sourceMetricRefs' | 'indicatorMissingMetricKeys' | 'indicatorWarnings'> {
  const refs: FullScorecardValidationSourceRef[] = []
  const missing: string[] = []
  const warns: string[] = []
  for (const section of pillar.sections) {
    for (const ind of section.indicators) {
      for (const sm of ind.sourceMetrics ?? []) {
        const m = input.byMetricKey[sm.metricKey]
        refs.push({
          metricKey: sm.metricKey,
          sourceSheet: sm.sourceSheet,
          sourceCell: sm.sourceCell ?? null,
          validationState: m?.validationState,
        })
      }
      missing.push(...ind.missingMetricKeys)
      warns.push(...ind.warnings)
    }
  }
  return {
    sourceMetricRefs: dedupeSourceRefs(refs),
    indicatorMissingMetricKeys: [...new Set(missing)],
    indicatorWarnings: [...new Set(warns)],
  }
}

function collectIndicatorDebug(
  input: FullScorecardEngineInput,
  pillars: FullScorecardPillarResult[],
  pillarKey: string,
  indicatorKey: string,
): Pick<FullScorecardValidationElementSummary, 'sourceMetricRefs' | 'indicatorMissingMetricKeys' | 'indicatorWarnings'> {
  const ind = findIndicatorInPillars(pillars, pillarKey, indicatorKey)
  if (!ind) {
    return { sourceMetricRefs: [], indicatorMissingMetricKeys: [], indicatorWarnings: ['Indicator not found in engine output.'] }
  }
  const refs: FullScorecardValidationSourceRef[] = []
  for (const sm of ind.sourceMetrics ?? []) {
    const m = input.byMetricKey[sm.metricKey]
    refs.push({
      metricKey: sm.metricKey,
      sourceSheet: sm.sourceSheet,
      sourceCell: sm.sourceCell ?? null,
      validationState: m?.validationState,
    })
  }
  return {
    sourceMetricRefs: dedupeSourceRefs(refs),
    indicatorMissingMetricKeys: [...new Set(ind.missingMetricKeys)],
    indicatorWarnings: [...new Set(ind.warnings)],
  }
}

export function buildValidationSummary(
  input: FullScorecardEngineInput,
  result: FullScorecardEngineResult,
): FullScorecardValidationSummary {
  const { reconciliation, overall, pillars, warnings } = result

  const metrics = Object.values(input.byMetricKey)
  const inputMetricQuality = metrics.reduce(
    (acc, m) => {
      acc.totalKeys += 1
      if (m.validationState === 'valid') acc.valid += 1
      else if (m.validationState === 'warning') acc.warning += 1
      else acc.error += 1
      return acc
    },
    { totalKeys: 0, valid: 0, warning: 0, error: 0 },
  )

  const referenceMetricIssues = metrics
    .filter((m) => m.metricKey.startsWith('full_scorecard.reference.'))
    .filter((m) => m.validationState !== 'valid')
    .map((m) => ({
      metricKey: m.metricKey,
      validationState: m.validationState,
      validationMessage: m.validationMessage ?? null,
      sourceCell: m.sourceCell ?? null,
    }))

  const elements: FullScorecardValidationElementSummary[] = FULL_SCORECARD_ELEMENT_RECONCILIATION_ROUTING.map(
    (route) => {
      const row = reconciliation.elements.find((e) => e.elementKey === route.elementKey)
      const pillar = pillars.find((p) => p.key === route.pillarKey)
      const debug =
        route.usePillarTotals && pillar
          ? collectPillarDebug(input, pillar)
          : route.indicatorKey
            ? collectIndicatorDebug(input, pillars, route.pillarKey, route.indicatorKey)
            : { sourceMetricRefs: [], indicatorMissingMetricKeys: [], indicatorWarnings: [] }

      return {
        elementKey: route.elementKey,
        label: route.label,
        referenceAchievedPoints: row?.referenceAchievedPoints ?? null,
        referenceAchievedSourceCell: row?.referenceAchievedSourceCell ?? null,
        referenceAvailablePoints: row?.referenceAvailablePoints ?? null,
        referenceAvailableSourceCell: row?.referenceAvailableSourceCell ?? null,
        calculatedAchievedPoints: row?.calculatedAchievedPoints ?? null,
        calculatedAvailablePoints: row?.calculatedAvailablePoints ?? null,
        achievedVariance: row?.achievedVariance ?? null,
        reconciliationStatus: row?.status ?? 'not_calculated',
        reconciliationReason: row?.reason ?? null,
        ...debug,
      }
    },
  )

  const interpretationHints: string[] = []
  if (overall.scoreCompleteness === 'partial') {
    interpretationHints.push(
      'Overall score is partial: Excel final score reconciliation can disagree because the engine only sums pillars that calculated.',
    )
  }
  if (referenceMetricIssues.length > 0) {
    interpretationHints.push(
      'One or more Full Scorecard reference metrics are in warning/error state; treat element-level variance as indicative only until reference rows are unambiguous.',
    )
  }
  if (warnings.some((w) => w.code === 'discounting_not_implemented')) {
    interpretationHints.push(
      'Discounting is not applied to the calculated level (display-only flag from Excel for now).',
    )
  }
  if (reconciliation.overall.status === 'variance' && overall.scoreCompleteness === 'complete') {
    interpretationHints.push(
      'Non-zero final score variance with complete pillars often means rounding, template formula differences, or Excel reference rows that include adjustments not modelled in the engine.',
    )
  }

  return {
    generatedAt: new Date().toISOString(),
    scoreCompleteness: overall.scoreCompleteness,
    missingPillarsForCompleteScore: overall.missingPillarsForCompleteScore,
    overall: {
      referenceFinalScore: reconciliation.overall.referenceFinalScore,
      referenceSourceCell: reconciliation.overall.referenceSourceCell,
      calculatedFinalScore: reconciliation.overall.calculatedFinalScore,
      variance: reconciliation.overall.variance,
      status: reconciliation.overall.status,
      reason: reconciliation.overall.reason,
    },
    elements,
    referenceMetricIssues,
    inputMetricQuality,
    interpretationHints,
  }
}

