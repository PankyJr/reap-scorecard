import { getLevelBand } from './level-bands'
import { calculateProportionalPoints, roundScore, sumScores } from './safe-math'
import type {
  FullScorecardEngineInput,
  FullScorecardEngineInputMetric,
  FullScorecardIndicatorResult,
  FullScorecardEngineResult,
  FullScorecardOverallResult,
  FullScorecardPillarResult,
  FullScorecardSectionResult,
  OverallScoreCompleteness,
} from './types'
import { buildReconciliation } from './reconciliation'
import { INDICATOR_CONFIGS, type FullIndicatorConfig } from './indicator-config'

const PILLAR_LABELS: Record<string, string> = {
  ownership: 'Ownership',
  management_control: 'Management Control',
  skills_development: 'Skills Development',
  procurement_esd: 'Procurement / ESD',
  sed: 'SED',
}

/** Pillars that must all be calculated for B-BBEE level / recognition assignment. */
const MAJOR_PILLAR_KEYS = [
  'ownership',
  'management_control',
  'skills_development',
  'procurement_esd',
  'sed',
] as const

function pillarRollupComplete(pillar: FullScorecardPillarResult | undefined): boolean {
  if (!pillar) return false
  return pillar.status === 'calculated' && pillar.achievedPoints != null
}

function orderedIndicatorConfigs(): FullIndicatorConfig[] {
  const sum = INDICATOR_CONFIGS.filter((c) => c.calculationType === 'sum_indicators')
  const rest = INDICATOR_CONFIGS.filter((c) => c.calculationType !== 'sum_indicators')
  return [...rest, ...sum]
}

const PILLAR_AGGREGATE_KEYS = new Set(
  INDICATOR_CONFIGS.filter((c) => c.includeInPillarAggregate !== false).map((c) => c.key),
)

function metricValue(
  input: FullScorecardEngineInput,
  key: string,
): number | null {
  return input.byMetricKey[key]?.numericValue ?? null
}

function isMetricUsableForScoring(
  input: FullScorecardEngineInput,
  key: string,
): boolean {
  const m = input.byMetricKey[key]
  if (!m) return false
  if (m.validationState !== 'valid') return false
  return (
    m.numericValue != null ||
    (m.textValue != null && m.textValue !== '') ||
    m.booleanValue != null
  )
}

function sourceRefsForKeys(input: FullScorecardEngineInput, keys: string[]): FullScorecardIndicatorResult['sourceMetrics'] {
  return keys.map((metricKey) => ({
    metricKey,
    sourceSheet: input.byMetricKey[metricKey]?.sourceSheet ?? '(metric not in extract)',
    sourceCell: input.byMetricKey[metricKey]?.sourceCell ?? null,
    sourceRange: input.byMetricKey[metricKey]?.sourceRange ?? null,
  }))
}

function proportionalIndicator(
  input: FullScorecardEngineInput,
  config: FullIndicatorConfig,
): FullScorecardIndicatorResult {
  const rows = config.proportionalRows ?? []
  const sourceMetricKeys = [...new Set(rows.flatMap((r) => [r.percentageKey, r.targetKey, r.availablePointsKey]))]
  const sourceMetrics = sourceRefsForKeys(input, sourceMetricKeys)
  const warnings: string[] = []
  const missingMetricKeys: string[] = []

  let sumAchieved = 0
  let sumAvailable = 0
  let anyRow = false

  for (const row of rows) {
    const keys = [row.percentageKey, row.targetKey, row.availablePointsKey]
    const missingFromExtract = keys.filter((k) => !input.byMetricKey[k])
    const presentButInvalid = keys.filter((k) => input.byMetricKey[k] && !isMetricUsableForScoring(input, k))
    const unusable = [...new Set([...missingFromExtract, ...presentButInvalid])]
    if (unusable.length > 0) {
      const parts: string[] = []
      if (missingFromExtract.length > 0) {
        parts.push(`not in workbook extract: ${missingFromExtract.join(', ')}`)
      }
      if (presentButInvalid.length > 0) {
        parts.push(`extracted but not usable (error/warning/empty): ${presentButInvalid.join(', ')}`)
      }
      warnings.push(`Skipped proportional row (${row.percentageKey}): ${parts.join('; ')}.`)
      missingMetricKeys.push(...unusable)
      continue
    }

    const actual = metricValue(input, row.percentageKey)
    const target = metricValue(input, row.targetKey)
    const available = metricValue(input, row.availablePointsKey)

    if (actual == null || target == null || available == null) {
      warnings.push(`Skipped proportional row (${row.percentageKey}): empty numeric values.`)
      missingMetricKeys.push(...keys)
      continue
    }

    const pts = calculateProportionalPoints({
      actual,
      target,
      availablePoints: available,
    })
    if (pts == null) {
      warnings.push(
        `Skipped proportional row (${row.percentageKey}): invalid target or unavailable ratio (e.g. zero target).`,
      )
      missingMetricKeys.push(...keys)
      continue
    }

    anyRow = true
    sumAchieved += pts
    sumAvailable += available
  }

  if (!anyRow) {
    return {
      key: config.key,
      label: config.label,
      target: null,
      percentageAchieved: null,
      availablePoints: null,
      achievedPoints: null,
      possiblePoints1: null,
      possiblePoints2: null,
      status: 'not_calculated',
      missingMetricKeys: [...new Set(missingMetricKeys)],
      sourceMetrics,
      warnings,
    }
  }

  const achievedPoints = roundScore(sumAchieved)
  const availablePoints = roundScore(sumAvailable)
  const possiblePoints1 = availablePoints

  return {
    key: config.key,
    label: config.label,
    target: possiblePoints1,
    percentageAchieved:
      achievedPoints != null && possiblePoints1 != null && possiblePoints1 > 0
        ? roundScore((achievedPoints / possiblePoints1) * 100)
        : null,
    availablePoints,
    achievedPoints,
    possiblePoints1,
    possiblePoints2: null,
    status: 'calculated',
    missingMetricKeys: [],
    sourceMetrics,
    warnings,
  }
}

function sumIndicatorsFromChildren(
  input: FullScorecardEngineInput,
  config: FullIndicatorConfig,
  computedByKey: Record<string, FullScorecardIndicatorResult>,
): FullScorecardIndicatorResult {
  const childKeys = config.sumChildIndicatorKeys ?? []

  const children = childKeys.map((k) => computedByKey[k]).filter(Boolean) as FullScorecardIndicatorResult[]
  const calculatedChildren = children.filter((c) => c.status === 'calculated')

  const sourceMetrics: FullScorecardIndicatorResult['sourceMetrics'] = []
  const seen = new Set<string>()
  for (const ref of sourceRefsForKeys(input, config.optionalMetricKeys)) {
    sourceMetrics.push(ref)
    seen.add(ref.metricKey)
  }
  for (const child of calculatedChildren) {
    for (const ref of child.sourceMetrics) {
      if (seen.has(ref.metricKey)) continue
      sourceMetrics.push(ref)
      seen.add(ref.metricKey)
    }
  }

  if (calculatedChildren.length === 0) {
    return {
      key: config.key,
      label: config.label,
      target: null,
      percentageAchieved: null,
      availablePoints: null,
      achievedPoints: null,
      possiblePoints1: null,
      possiblePoints2: null,
      status: 'not_calculated',
      missingMetricKeys: childKeys,
      sourceMetrics: sourceRefsForKeys(input, config.optionalMetricKeys),
      warnings: ['No child indicators calculated yet for this total.'],
    }
  }

  const achievedPoints = sumScores(calculatedChildren.map((c) => c.achievedPoints))
  const sumChildAvailable = sumScores(calculatedChildren.map((c) => c.availablePoints))
  const totalAvailKey = config.optionalMetricKeys.find((k) => k.endsWith('.total.available_points'))
  const sheetTotal =
    totalAvailKey && isMetricUsableForScoring(input, totalAvailKey)
      ? metricValue(input, totalAvailKey)
      : null

  const availablePoints = sheetTotal ?? sumChildAvailable
  const warnings: string[] = []
  if (sheetTotal == null && totalAvailKey) {
    warnings.push(`${totalAvailKey} not extracted; using sum of child available points.`)
  } else if (sheetTotal == null && !totalAvailKey) {
    warnings.push('No sheet-level total.available_points optional key; using sum of child available points.')
  }

  const possiblePoints1 = availablePoints

  return {
    key: config.key,
    label: config.label,
    target: possiblePoints1,
    percentageAchieved:
      achievedPoints != null && possiblePoints1 != null && possiblePoints1 > 0
        ? roundScore((achievedPoints / possiblePoints1) * 100)
        : null,
    availablePoints,
    achievedPoints,
    possiblePoints1,
    possiblePoints2: null,
    status: 'calculated',
    missingMetricKeys: [],
    sourceMetrics,
    warnings,
  }
}

function indicatorFromConfig(
  input: FullScorecardEngineInput,
  config: FullIndicatorConfig,
  computedByKey: Record<string, FullScorecardIndicatorResult>,
): FullScorecardIndicatorResult {
  if (config.calculationType === 'proportional_points') {
    return proportionalIndicator(input, config)
  }

  if (config.calculationType === 'sum_indicators') {
    return sumIndicatorsFromChildren(input, config, computedByKey)
  }

  const missingMetricKeys = config.requiredMetricKeys.filter((key) => {
    const metric: FullScorecardEngineInputMetric | undefined = input.byMetricKey[key]
    if (!metric) return true
    return metric.numericValue == null && metric.textValue == null && metric.booleanValue == null
  })

  const sourceMetricKeys = [
    ...new Set([
      ...config.requiredMetricKeys,
      ...config.optionalMetricKeys,
      ...(config.referenceAchievedMetricKey ? [config.referenceAchievedMetricKey] : []),
    ]),
  ]
  const sourceMetrics = sourceRefsForKeys(input, sourceMetricKeys)

  const availablePoints = metricValue(input, config.requiredMetricKeys[0] ?? '')
  const possiblePoints1 = metricValue(input, config.requiredMetricKeys[1] ?? '')
  const possible2Key = config.optionalMetricKeys.find((k) => k.endsWith('.possible_points_2'))
  const possiblePoints2 = possible2Key ? metricValue(input, possible2Key) : null
  const warnings: string[] = []

  if (missingMetricKeys.length > 0) {
    warnings.push(`Missing required metrics: ${missingMetricKeys.join(', ')}`)
  }

  if (config.calculationType === 'not_implemented') {
    warnings.push(config.notes)
    return {
      key: config.key,
      label: config.label,
      target: possiblePoints1,
      percentageAchieved: null,
      availablePoints,
      achievedPoints: null,
      possiblePoints1,
      possiblePoints2,
      status: 'not_calculated',
      missingMetricKeys,
      sourceMetrics,
      warnings,
    }
  }

  const achievedCandidate = config.referenceAchievedMetricKey
    ? metricValue(input, config.referenceAchievedMetricKey)
    : metricValue(input, `${config.pillarKey}.achieved_points`)

  if (achievedCandidate == null || missingMetricKeys.length > 0) {
    return {
      key: config.key,
      label: config.label,
      target: possiblePoints1,
      percentageAchieved: null,
      availablePoints,
      achievedPoints: null,
      possiblePoints1,
      possiblePoints2,
      status: 'not_calculated',
      missingMetricKeys,
      sourceMetrics,
      warnings,
    }
  }

  return {
    key: config.key,
    label: config.label,
    target: possiblePoints1,
    percentageAchieved:
      achievedCandidate != null && possiblePoints1 != null && possiblePoints1 > 0
        ? roundScore((achievedCandidate / possiblePoints1) * 100)
        : null,
    availablePoints,
    achievedPoints: achievedCandidate,
    possiblePoints1,
    possiblePoints2,
    status: 'calculated',
    missingMetricKeys,
    sourceMetrics,
    warnings,
  }
}

function buildPillarResults(input: FullScorecardEngineInput): FullScorecardPillarResult[] {
  const byPillar: Record<string, FullScorecardSectionResult[]> = {}
  const pillarWarnings: Record<string, string[]> = {}
  const computedByKey: Record<string, FullScorecardIndicatorResult> = {}

  for (const config of orderedIndicatorConfigs()) {
    const indicator = indicatorFromConfig(input, config, computedByKey)
    computedByKey[config.key] = indicator

    if (!byPillar[config.pillarKey]) {
      byPillar[config.pillarKey] = []
      pillarWarnings[config.pillarKey] = []
    }

    if (indicator.warnings.length) {
      pillarWarnings[config.pillarKey].push(...indicator.warnings)
    }

    const section = byPillar[config.pillarKey].find((s) => s.key === config.sectionKey)
    if (section) {
      section.indicators.push(indicator)
    } else {
      byPillar[config.pillarKey].push({
        key: config.sectionKey,
        label: config.sectionKey.replace(/_/g, ' '),
        indicators: [indicator],
      })
    }
  }

  return Object.entries(byPillar).map(([pillarKey, sections]) => {
    const indicators = sections.flatMap((section) => section.indicators)
    const calculatedIndicators = indicators.filter(
      (ind) => ind.status === 'calculated' && PILLAR_AGGREGATE_KEYS.has(ind.key),
    )
    const availablePoints = sumScores(
      indicators.filter((i) => PILLAR_AGGREGATE_KEYS.has(i.key)).map((i) => i.availablePoints),
    )
    /** Procurement / ESD: only `procurement_esd.combined_total` is in the pillar aggregate; PP/ED/SD section totals are not double-counted. */
    const achievedPoints = sumScores(calculatedIndicators.map((i) => i.achievedPoints))
    const possiblePoints1 = sumScores(
      indicators.filter((i) => PILLAR_AGGREGATE_KEYS.has(i.key)).map((i) => i.possiblePoints1),
    )
    const possiblePoints2 = sumScores(
      indicators.filter((i) => PILLAR_AGGREGATE_KEYS.has(i.key)).map((i) => i.possiblePoints2),
    )
    const status = calculatedIndicators.length > 0 ? 'calculated' : 'not_calculated'

    return {
      key: pillarKey,
      label: PILLAR_LABELS[pillarKey] ?? pillarKey,
      availablePoints,
      achievedPoints,
      possiblePoints1,
      possiblePoints2,
      status,
      sections,
      warnings: pillarWarnings[pillarKey] ?? [],
    }
  })
}

export function calculateFullScorecard(args: {
  input: FullScorecardEngineInput
  engineVersion: string
}): FullScorecardEngineResult {
  const warnings = [...args.input.warnings]
  const errors = [...args.input.errors]

  const pillars = buildPillarResults(args.input)

  const majorPillars = MAJOR_PILLAR_KEYS.map((key) => pillars.find((p) => p.key === key))
  const missingPillarsForCompleteScore = MAJOR_PILLAR_KEYS.filter((key, idx) => {
    return !pillarRollupComplete(majorPillars[idx])
  }).map((key) => PILLAR_LABELS[key] ?? key)

  const scoreCompleteness: OverallScoreCompleteness =
    missingPillarsForCompleteScore.length === 0 ? 'complete' : 'partial'

  const calculatedMajorAchieved = majorPillars
    .filter((p): p is FullScorecardPillarResult => Boolean(p && p.status === 'calculated'))
    .map((p) => p.achievedPoints)

  const totalScore = sumScores(calculatedMajorAchieved)
  const totalAvailablePoints = sumScores(
    majorPillars.filter((p): p is FullScorecardPillarResult => Boolean(p)).map((p) => p.availablePoints),
  )

  if (totalScore == null) {
    warnings.push({
      code: 'overall_not_calculated',
      message:
        'Overall score could not be calculated yet because no major pillar produced a calculated achieved score.',
    })
  }

  if (scoreCompleteness === 'partial') {
    const partialSuffix =
      totalScore != null
        ? ` Partial sum from calculated pillars only: ${totalScore} points.`
        : ''
    warnings.push({
      code: 'overall_score_incomplete',
      message: `Score is incomplete until all pillars are calculated: missing ${missingPillarsForCompleteScore.join(', ')}.${partialSuffix}`,
    })
  }

  const discountingApplicableMetric =
    args.input.byMetricKey['full_scorecard.reference.discounting_applicable']?.booleanValue

  if (discountingApplicableMetric === true) {
    warnings.push({
      code: 'discounting_not_implemented',
      message:
        'Discounting is flagged as applicable in the workbook reference row, but the engine does not adjust levels or points for discounting yet (TODO).',
    })
  }

  const assignLevel = scoreCompleteness === 'complete' && totalScore != null
  const levelBand = assignLevel ? getLevelBand(totalScore) : null

  const overall: FullScorecardOverallResult = {
    totalAvailablePoints,
    totalScore,
    bbbeeLevel: assignLevel && levelBand ? levelBand.level : null,
    recognitionPercentage: assignLevel && levelBand ? levelBand.recognitionPercentage : null,
    discountingApplicable: discountingApplicableMetric ?? null,
    scoreCompleteness,
    missingPillarsForCompleteScore,
  }

  const reconciliation = buildReconciliation({
    input: args.input,
    calculatedTotal: totalScore,
    pillars,
  })

  return {
    engineVersion: args.engineVersion,
    overall,
    pillars,
    reconciliation,
    warnings,
    errors,
  }
}
