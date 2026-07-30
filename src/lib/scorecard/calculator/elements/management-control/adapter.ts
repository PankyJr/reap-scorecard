import * as XLSX from 'xlsx'
import type {
  CalculationBreakdown,
  CalculatorImportRow,
  HeaderAliasMap,
  ScorecardElementAdapter,
} from '../../types'
import { MC_EAP_BAND_KEYS, MC_EAP_DEMOGRAPHIC_KEYS } from '../../eap/demographics'

/**
 * Management Control adapter — data-driven path.
 * Scoring from workbook demographic %/target/points already exists in the full engine.
 * This calculator path supports upload + mapping scaffold and EAP target binding;
 * full MC score from a dedicated MC template is enabled when rows map to verified metric stems.
 */

const MC_HEADER_ALIASES: HeaderAliasMap = {
  band: ['band', 'level', 'management level', 'category', 'occupational level'],
  demographic: ['demographic', 'group', 'population group'],
  percentage: ['percentage', 'actual %', 'actual', 'representation'],
  target: ['target', 'target %', 'eap target'],
  availablePoints: ['available points', 'points', 'weighting'],
  headcount: ['headcount', 'employees', 'count'],
  notes: ['notes', 'comments', 'comment'],
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export const managementControlAdapter: ScorecardElementAdapter = {
  elementKey: 'management_control',
  elementName: 'Management Control',
  shortName: 'MC',
  acceptedSheetNames: [
    'Management Control',
    '3 Board Members',
    '4 Executive Committe',
    'Employment Equity',
  ],
  headerAliases: MC_HEADER_ALIASES,
  ruleVersion: 'management-control-scaffold-v0',
  scoringReady: false,
  help: {
    summary:
      'Management Control is data-driven. Upload MC / Employment Equity workbooks, map columns, and bind versioned EAP targets. Annual EAP percentages are never hardcoded.',
    uploadHints: [
      'Accepted sheets include Management Control, Board, Executive, and Employment Equity layouts used by the full engine.',
      'Demographic structure matches engine: black_people and black_women (disabilities: black_people only).',
    ],
    outstandingBusinessRules: [
      'Dedicated MC line-item template scoring in the modular calculator awaits a confirmed REAP MC upload sample.',
      'Until then, use EAP target administration + full-scorecard MC workbook path for verified points.',
      `Verified bands: ${MC_EAP_BAND_KEYS.join(', ')}.`,
      `Verified demographics: ${MC_EAP_DEMOGRAPHIC_KEYS.join(', ')}.`,
    ],
  },
  parseWorkbook: ({ workbookBuffer, preferredSheetName }) => {
    const workbook = XLSX.read(workbookBuffer, { type: 'buffer', cellDates: true })
    const preferred = preferredSheetName
      ? [preferredSheetName, ...managementControlAdapter.acceptedSheetNames]
      : [...managementControlAdapter.acceptedSheetNames]
    const sheetName =
      preferred.find((n) => workbook.SheetNames.some((s) => normalizeHeader(s) === normalizeHeader(n))) ??
      workbook.SheetNames[0] ??
      ''

    if (!sheetName) {
      return {
        sheetName: '',
        detectedHeaders: {},
        rows: [],
        validRowCount: 0,
        warningCount: 0,
        rejectedRowCount: 0,
        platformTotalRecognised: null,
        workbookDisplayedTotal: null,
        totalsMatch: null,
        notes: ['No Management Control worksheet found.'],
      }
    }

    const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: true,
    })

    let headerIndex = -1
    const colMap: Record<string, number> = {}
    for (let i = 0; i < Math.min(matrix.length, 40); i += 1) {
      const row = matrix[i] ?? []
      for (let c = 0; c < row.length; c += 1) {
        const label = normalizeHeader(row[c])
        for (const [field, aliases] of Object.entries(MC_HEADER_ALIASES)) {
          if (aliases.includes(label) && colMap[field] == null) colMap[field] = c
        }
      }
      if (Object.keys(colMap).length >= 2) {
        headerIndex = i
        break
      }
    }

    if (headerIndex < 0) {
      return {
        sheetName,
        detectedHeaders: {},
        rows: [],
        validRowCount: 0,
        warningCount: 0,
        rejectedRowCount: 0,
        platformTotalRecognised: null,
        workbookDisplayedTotal: null,
        totalsMatch: null,
        notes: [
          'Management Control headers not auto-detected. Manual mapping scaffold available. Prefer the existing full-scorecard MC sheets for verified extraction.',
        ],
      }
    }

    const detectedHeaders: Record<string, string> = {}
    for (const [field, col] of Object.entries(colMap)) {
      detectedHeaders[field] = String(matrix[headerIndex]?.[col] ?? field).trim()
    }

    const rows: CalculatorImportRow[] = []
    for (let r = headerIndex + 1; r < matrix.length; r += 1) {
      const row = matrix[r] ?? []
      const values: Record<string, string | number | null> = {}
      let any = false
      for (const [field, col] of Object.entries(colMap)) {
        const raw = row[col]
        if (raw == null || String(raw).trim() === '') values[field] = null
        else {
          values[field] = typeof raw === 'number' ? raw : String(raw).trim()
          any = true
        }
      }
      if (!any) continue
      rows.push({
        sourceRowNumber: r + 1,
        values,
        validationStatus: 'warning',
        validationMessages: [
          'MC row captured for review. Modular calculator scoring uses verified full-engine metrics; complete calculation requires mapped % / EAP target / points.',
        ],
      })
    }

    return {
      sheetName,
      detectedHeaders,
      rows,
      validRowCount: 0,
      warningCount: rows.length,
      rejectedRowCount: 0,
      platformTotalRecognised: null,
      workbookDisplayedTotal: null,
      totalsMatch: null,
      notes: [
        'Management Control upload preview only in modular calculator v1.',
        'Bind an activated EAP target set on the assessment before treating MC as complete.',
      ],
    }
  },
  calculate: (): CalculationBreakdown => ({
    formulaName: 'management_control_scaffold',
    ruleVersion: 'management-control-scaffold-v0',
    inputsUsed: {},
    target: null,
    actual: null,
    pointsAvailable: null,
    pointsAchieved: null,
    caps: {},
    thresholds: {},
    exclusions: [],
    warnings: [
      'Management Control points are not fabricated in the modular calculator without verified mapped metrics. Use EAP target sets for editable targets; score via full engine when uploading standard MC sheets.',
    ],
    explanation:
      'MC architecture, EAP versioning, and upload scaffolding are in place. Element scoringReady=false until a dedicated verified MC calculator mapping ships.',
  }),
}
