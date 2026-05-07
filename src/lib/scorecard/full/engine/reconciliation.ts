import type {
  FullScorecardElementReconciliation,
  FullScorecardEngineInput,
  FullScorecardEngineInputMetric,
  FullScorecardIndicatorResult,
  FullScorecardOverallReconciliation,
  FullScorecardPillarResult,
  FullScorecardReconciliationResult,
  ReconciliationRowStatus,
} from './types'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from './types'
import { roundScore } from './safe-math'

function metricAmbiguous(metric: FullScorecardEngineInputMetric | undefined): boolean {
  return Boolean(metric?.validationMessage?.toLowerCase().includes('ambiguous'))
}

export function findIndicatorInPillars(
  pillars: FullScorecardPillarResult[],
  pillarKey: string,
  indicatorKey: string,
): FullScorecardIndicatorResult | null {
  const pillar = pillars.find((p) => p.key === pillarKey)
  if (!pillar) return null
  for (const section of pillar.sections) {
    const ind = section.indicators.find((i) => i.key === indicatorKey)
    if (ind) return ind
  }
  return null
}

/** Exported for validation summaries and tooling; keep in sync with reconciliation rows. */
export const FULL_SCORECARD_ELEMENT_RECONCILIATION_ROUTING: Array<{
  elementKey: string
  label: string
  pillarKey: string
  indicatorKey?: string
  /** Compare engine pillar rollup vs Full Scorecard reference (e.g. Ownership from sheet-calculated pillar). */
  usePillarTotals?: boolean
}> = [
  { elementKey: 'ownership', label: 'Ownership', pillarKey: 'ownership', usePillarTotals: true },
  {
    elementKey: 'management_control',
    label: 'Management Control',
    pillarKey: 'management_control',
    usePillarTotals: true,
  },
  {
    elementKey: 'skills_development',
    label: 'Skills Development',
    pillarKey: 'skills_development',
    usePillarTotals: true,
  },
  {
    elementKey: 'preferential_procurement',
    label: 'Preferential Procurement',
    pillarKey: 'procurement_esd',
    indicatorKey: 'procurement.preferential_total',
  },
  {
    elementKey: 'enterprise_development',
    label: 'Enterprise Development',
    pillarKey: 'procurement_esd',
    indicatorKey: 'esd.enterprise_development_total',
  },
  {
    elementKey: 'supplier_development',
    label: 'Supplier Development',
    pillarKey: 'procurement_esd',
    indicatorKey: 'esd.supplier_development_total',
  },
  {
    elementKey: 'socio_economic_development',
    label: 'Socio-Economic Development',
    pillarKey: 'sed',
    usePillarTotals: true,
  },
]

function buildOverallReconciliation(args: {
  input: FullScorecardEngineInput
  calculatedTotal: number | null
}): FullScorecardOverallReconciliation {
  const refKey = PRIMARY_REFERENCE_FINAL_SCORE_KEY
  const refMetric = args.input.byMetricKey[refKey]
  const referenceFinalScore = refMetric?.numericValue ?? null
  const referenceSourceCell = refMetric?.sourceCell ?? null

  if (metricAmbiguous(refMetric)) {
    return {
      referenceMetricKey: refKey,
      referenceFinalScore,
      referenceSourceCell,
      calculatedFinalScore: args.calculatedTotal,
      variance: null,
      status: 'ambiguous_reference',
      reason: 'Excel reference final score row matched multiple rows; comparison skipped.',
    }
  }

  if (referenceFinalScore == null) {
    return {
      referenceMetricKey: refKey,
      referenceFinalScore: null,
      referenceSourceCell,
      calculatedFinalScore: args.calculatedTotal,
      variance: null,
      status: 'not_available',
      reason: 'Excel reference final score was not extracted from the Full Scorecard sheet.',
    }
  }

  if (args.calculatedTotal == null) {
    return {
      referenceMetricKey: refKey,
      referenceFinalScore,
      referenceSourceCell,
      calculatedFinalScore: null,
      variance: null,
      status: 'not_calculated',
      reason: 'Calculated final score is not available yet (engine summary not complete).',
    }
  }

  const variance = roundScore(args.calculatedTotal - referenceFinalScore)
  return {
    referenceMetricKey: refKey,
    referenceFinalScore,
    referenceSourceCell,
    calculatedFinalScore: args.calculatedTotal,
    variance,
    status: variance === 0 ? 'matched' : 'variance',
    reason: variance === 0 ? null : 'Calculated total score differs from Excel reference final score.',
  }
}

function resolveElementStatus(args: {
  refAvailM: FullScorecardEngineInputMetric | undefined
  refAchM: FullScorecardEngineInputMetric | undefined
  refAvail: number | null
  refAch: number | null
  calcAvail: number | null
  calcAch: number | null
  indicator: FullScorecardIndicatorResult | null
  usePillarTotals?: boolean
  pillarStatus?: FullScorecardPillarResult['status']
}): { status: ReconciliationRowStatus; reason: string | null; achievedVariance: number | null } {
  const {
    refAvailM,
    refAchM,
    refAvail,
    refAch,
    calcAvail,
    calcAch,
    indicator,
    usePillarTotals,
    pillarStatus,
  } = args

  if (metricAmbiguous(refAvailM) || metricAmbiguous(refAchM)) {
    return {
      status: 'ambiguous_reference',
      reason: 'Ambiguous Excel reference row match for this element.',
      achievedVariance: null,
    }
  }

  if (usePillarTotals) {
    if (pillarStatus !== 'calculated') {
      return {
        status: 'not_calculated',
        reason: 'Engine has not calculated this pillar yet (required metrics missing or deferred).',
        achievedVariance: null,
      }
    }
  } else if (!indicator || indicator.status === 'not_calculated') {
    return {
      status: 'not_calculated',
      reason: 'Engine has not calculated this element yet (required metrics missing or deferred).',
      achievedVariance: null,
    }
  }

  if (refAch == null) {
    return {
      status: 'not_available',
      reason: 'Excel reference points achieved were not extracted for this element.',
      achievedVariance: null,
    }
  }

  if (calcAch == null) {
    return {
      status: 'not_calculated',
      reason: 'Calculated points achieved are not available for this element.',
      achievedVariance: null,
    }
  }

  const achievedVariance = roundScore(calcAch - refAch)
  const availComparable =
    refAvail != null && calcAvail != null && refAvail !== calcAvail
  const achievedComparable = achievedVariance !== 0

  if (!availComparable && !achievedComparable) {
    return { status: 'matched', reason: null, achievedVariance: 0 }
  }

  const parts: string[] = []
  if (achievedComparable) {
    parts.push(`Achieved points differ by ${achievedVariance}.`)
  }
  if (availComparable) {
    parts.push('Available points differ between Excel reference and engine summary.')
  }

  return {
    status: 'variance',
    reason: parts.join(' '),
    achievedVariance,
  }
}

function buildElementReconciliations(args: {
  input: FullScorecardEngineInput
  pillars: FullScorecardPillarResult[]
}): FullScorecardElementReconciliation[] {
  return FULL_SCORECARD_ELEMENT_RECONCILIATION_ROUTING.map((cfg) => {
    const prefix = `full_scorecard.reference.${cfg.elementKey}`
    const refAvailKey = `${prefix}.available_points`
    const refAchKey = `${prefix}.points_achieved`
    const refAvailM = args.input.byMetricKey[refAvailKey]
    const refAchM = args.input.byMetricKey[refAchKey]
    const refAvail = refAvailM?.numericValue ?? null
    const refAch = refAchM?.numericValue ?? null
    const pillar = args.pillars.find((p) => p.key === cfg.pillarKey)
    const indicator =
      cfg.usePillarTotals || !cfg.indicatorKey
        ? null
        : findIndicatorInPillars(args.pillars, cfg.pillarKey, cfg.indicatorKey)
    const calcAvail = cfg.usePillarTotals
      ? pillar?.availablePoints ?? null
      : indicator?.availablePoints ?? null
    const calcAch = cfg.usePillarTotals
      ? pillar?.achievedPoints ?? null
      : indicator?.achievedPoints ?? null

    const { status, reason, achievedVariance } = resolveElementStatus({
      refAvailM,
      refAchM,
      refAvail,
      refAch,
      calcAvail,
      calcAch,
      indicator,
      usePillarTotals: cfg.usePillarTotals,
      pillarStatus: pillar?.status,
    })

    return {
      elementKey: cfg.elementKey,
      label: cfg.label,
      referenceAvailablePoints: refAvail,
      referenceAvailableSourceCell: refAvailM?.sourceCell ?? null,
      referenceAchievedPoints: refAch,
      referenceAchievedSourceCell: refAchM?.sourceCell ?? null,
      calculatedAvailablePoints: calcAvail,
      calculatedAchievedPoints: calcAch,
      achievedVariance,
      status,
      reason,
    }
  })
}

export function buildReconciliation(args: {
  input: FullScorecardEngineInput
  calculatedTotal: number | null
  pillars: FullScorecardPillarResult[]
}): FullScorecardReconciliationResult {
  return {
    overall: buildOverallReconciliation(args),
    elements: buildElementReconciliations({
      input: args.input,
      pillars: args.pillars,
    }),
  }
}
