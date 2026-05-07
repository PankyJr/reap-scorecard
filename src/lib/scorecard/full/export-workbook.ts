import * as XLSX from 'xlsx'

/** Subset of engine `result_json` required for Excel export. */
export interface EngineResultForExport {
  engineVersion?: string
  overall?: {
    totalAvailablePoints: number | null
    totalScore: number | null
    bbbeeLevel: string | null
    recognitionPercentage: number | null
    discountingApplicable: boolean | null
    scoreCompleteness?: 'complete' | 'partial'
    missingPillarsForCompleteScore?: string[]
  }
  pillars?: Array<{
    label: string
    sections: Array<{
      label: string
      indicators: Array<{
        label: string
        availablePoints: number | null
        achievedPoints: number | null
        possiblePoints1: number | null
        possiblePoints2: number | null
        status: string
        missingMetricKeys: string[]
        warnings: string[]
        sourceMetrics?: Array<{ metricKey: string }>
      }>
    }>
  }>
  reconciliation?: {
    overall?: {
      referenceFinalScore: number | null
      calculatedFinalScore: number | null
      variance: number | null
      status: string
      reason: string | null
    }
    elements?: Array<{
      label: string
      referenceAchievedPoints: number | null
      calculatedAchievedPoints: number | null
      achievedVariance: number | null
      status: string
      reason: string | null
    }>
  }
  warnings?: Array<{ code: string; message: string }>
}

export type MetricRowForExport = {
  pillar: string
  metric_key: string
  label: string
  value_type: string
  numeric_value: number | null
  text_value: string | null
  boolean_value: boolean | null
  unit: string | null
  source_sheet: string
  source_cell: string | null
  source_range: string | null
  validation_state: string
  validation_message: string | null
}

export type ValidationIssueForExport = {
  severity: string
  message: string
  sheet_name: string | null
  cell_ref: string | null
  issue_type: string
  metadata: Record<string, unknown> | null
}

export function collectReferencedMetricKeys(result: EngineResultForExport): string[] {
  const set = new Set<string>()
  for (const p of result.pillars ?? []) {
    for (const s of p.sections ?? []) {
      for (const i of s.indicators ?? []) {
        for (const sm of i.sourceMetrics ?? []) {
          if (sm.metricKey) set.add(sm.metricKey)
        }
      }
    }
  }
  return [...set].sort()
}

/** Excel sheet names max 31 chars; disallow characters Excel rejects. */
export function sanitizeExcelSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/*?\[\]]/g, '-').replace(/\s+/g, ' ').trim()
  return cleaned.slice(0, 31) || 'Sheet'
}

function str(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

function formatMetricDisplayValue(m: MetricRowForExport): string {
  if (m.numeric_value != null && Number.isFinite(Number(m.numeric_value))) return String(m.numeric_value)
  if (m.text_value != null && m.text_value !== '') return m.text_value
  if (m.boolean_value != null) return m.boolean_value ? 'true' : 'false'
  return ''
}

function metricKeyFromIssueMetadata(meta: Record<string, unknown> | null): string {
  if (!meta) return ''
  const mk = meta.metricKey ?? meta.metric_key
  return typeof mk === 'string' ? mk : ''
}

export function buildFullScorecardExportWorkbook(args: {
  companyName: string
  workbookFilename: string
  workbookStatus: string
  generatedAtDisplay: string
  result: EngineResultForExport
  validationIssues: ValidationIssueForExport[]
  sourceMetrics: MetricRowForExport[]
}): Buffer {
  const wb = XLSX.utils.book_new()
  const o = args.result.overall
  const missing = o?.missingPillarsForCompleteScore?.length
    ? o.missingPillarsForCompleteScore.join(', ')
    : ''
  const discounting =
    o?.discountingApplicable == null
      ? 'Not extracted from workbook reference.'
      : o.discountingApplicable
        ? 'Workbook flags discounting as applicable. Engine does not adjust scores or level for discounting (comparison / display only).'
        : 'Discounting not flagged as applicable in reference row.'

  const summaryAoA: unknown[][] = [
    ['Full scorecard export (app-calculated; not the original upload file)'],
    [],
    ['Field', 'Value'],
    ['Company', args.companyName],
    ['Workbook filename', args.workbookFilename],
    ['Generated', args.generatedAtDisplay],
    ['Engine version', str(args.result.engineVersion)],
    ['Workbook status', args.workbookStatus],
    ['Score completeness', str(o?.scoreCompleteness)],
    [
      'Partial score note',
      o?.scoreCompleteness === 'partial'
        ? 'Partial — level and recognition may be unassigned until all pillars calculate. Missing pillars are listed below; no scores are fabricated.'
        : '',
    ],
    ['Missing pillars (if partial)', missing],
    ['Total available points (engine)', str(o?.totalAvailablePoints)],
    ['Calculated total score (engine)', str(o?.totalScore)],
    ['B-BBEE level (engine)', str(o?.bbbeeLevel)],
    ['Recognition % (engine)', str(o?.recognitionPercentage)],
    ['Discounting', discounting],
    ['Engine warning count', String(args.result.warnings?.length ?? 0)],
  ]

  const fullScorecardAoA: unknown[][] = [
    ['Indicator rows from the scoring engine. Excel Full Scorecard tab is not the source of these values.'],
    [],
    [
      'Element (pillar)',
      'Section',
      'Indicator',
      'Available points',
      'Points achieved',
      'Possible points 1',
      'Possible points 2',
      'Status',
      'Notes / warnings',
    ],
  ]

  for (const pillar of args.result.pillars ?? []) {
    for (const section of pillar.sections ?? []) {
      for (const ind of section.indicators ?? []) {
        const notes = [
          ...(ind.warnings ?? []),
          ind.missingMetricKeys?.length ? `Missing metrics: ${ind.missingMetricKeys.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' | ')
        fullScorecardAoA.push([
          pillar.label,
          section.label,
          ind.label,
          str(ind.availablePoints),
          str(ind.achievedPoints),
          str(ind.possiblePoints1),
          str(ind.possiblePoints2),
          ind.status,
          notes,
        ])
      }
    }
  }

  const rec = args.result.reconciliation
  const reconciliationAoA: unknown[][] = [
    ['Reconciliation is diagnostic only. Calculated values come from the app engine; Excel reference is comparison-only.'],
    [],
    ['Scope', 'Field', 'Value'],
    [
      'Overall',
      'Calculated final score (engine)',
      str(rec?.overall?.calculatedFinalScore),
    ],
    ['Overall', 'Excel reference final score (comparison only)', str(rec?.overall?.referenceFinalScore)],
    ['Overall', 'Variance (calculated minus reference)', str(rec?.overall?.variance)],
    ['Overall', 'Status', str(rec?.overall?.status)],
    ['Overall', 'Reason', str(rec?.overall?.reason)],
    [],
    ['Element', 'Reference achieved (Excel)', 'Calculated achieved (engine)', 'Variance', 'Status', 'Reason'],
  ]
  for (const el of rec?.elements ?? []) {
    reconciliationAoA.push([
      el.label,
      str(el.referenceAchievedPoints),
      str(el.calculatedAchievedPoints),
      str(el.achievedVariance),
      el.status,
      str(el.reason),
    ])
  }

  const validationAoA: unknown[][] = [
    ['Severity', 'Message', 'Sheet', 'Cell / ref', 'Metric key (from metadata)', 'Issue type'],
  ]
  if (!args.validationIssues.length) {
    validationAoA.push(['—', 'No validation issues recorded.', '', '', '', ''])
  } else {
    for (const v of args.validationIssues) {
      validationAoA.push([
        v.severity,
        v.message,
        str(v.sheet_name),
        str(v.cell_ref),
        metricKeyFromIssueMetadata(v.metadata),
        v.issue_type,
      ])
    }
  }

  const sourceAoA: unknown[][] = [
    [
      'Pillar',
      'Metric key',
      'Label',
      'Value (display)',
      'Value type',
      'Unit',
      'Source sheet',
      'Source cell',
      'Source range',
      'Validation state',
      'Validation message',
    ],
  ]
  if (!args.sourceMetrics.length) {
    sourceAoA.push([
      '',
      '',
      'No metric rows matched engine source metric keys for this workbook.',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ])
  } else {
    for (const m of args.sourceMetrics) {
      sourceAoA.push([
        m.pillar,
        m.metric_key,
        m.label,
        formatMetricDisplayValue(m),
        m.value_type,
        str(m.unit),
        m.source_sheet,
        str(m.source_cell),
        str(m.source_range),
        m.validation_state,
        str(m.validation_message),
      ])
    }
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoA), sanitizeExcelSheetName('Summary'))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fullScorecardAoA), sanitizeExcelSheetName('Full Scorecard'))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reconciliationAoA), sanitizeExcelSheetName('Reconciliation'))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(validationAoA), sanitizeExcelSheetName('Validation Issues'))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sourceAoA), sanitizeExcelSheetName('Source Metrics'))

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** Minimal workbook for tests / smoke checks (not used by API). */
export function buildFullWorkbookSmoke(): Buffer {
  return buildFullScorecardExportWorkbook({
    companyName: 'Test Co',
    workbookFilename: 'uploaded.xlsx',
    workbookStatus: 'ready',
    generatedAtDisplay: '2026-01-01 00:00:00',
    result: {
      engineVersion: 'test',
      overall: {
        totalAvailablePoints: 100,
        totalScore: 50,
        bbbeeLevel: null,
        recognitionPercentage: null,
        discountingApplicable: false,
        scoreCompleteness: 'partial',
        missingPillarsForCompleteScore: ['Socio-Economic Development'],
      },
      pillars: [
        {
          label: 'Ownership',
          sections: [
            {
              label: 'Total',
              indicators: [
                {
                  label: 'Total',
                  availablePoints: 25,
                  achievedPoints: 10,
                  possiblePoints1: 25,
                  possiblePoints2: null,
                  status: 'calculated',
                  missingMetricKeys: [],
                  warnings: [],
                  sourceMetrics: [{ metricKey: 'm1' }],
                },
              ],
            },
          ],
        },
      ],
      reconciliation: {
        overall: {
          referenceFinalScore: 55,
          calculatedFinalScore: 50,
          variance: -5,
          status: 'variance',
          reason: 'Smoke test row.',
        },
        elements: [
          {
            label: 'Ownership',
            referenceAchievedPoints: 10,
            calculatedAchievedPoints: 10,
            achievedVariance: 0,
            status: 'match',
            reason: null,
          },
        ],
      },
      warnings: [{ code: 'w', message: 'Sample engine warning.' }],
    },
    validationIssues: [],
    sourceMetrics: [
      {
        pillar: 'Ownership',
        metric_key: 'm1',
        label: 'Metric one',
        value_type: 'number',
        numeric_value: 1,
        text_value: null,
        boolean_value: null,
        unit: null,
        source_sheet: 'Sheet1',
        source_cell: 'A1',
        source_range: null,
        validation_state: 'valid',
        validation_message: null,
      },
    ],
  })
}
