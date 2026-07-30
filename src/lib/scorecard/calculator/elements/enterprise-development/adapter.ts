import * as XLSX from 'xlsx'
import type {
  CalculationBreakdown,
  CalculatorImportPreview,
  CalculatorImportRow,
  HeaderAliasMap,
  ScorecardElementAdapter,
} from '../../types'

const GENERIC_ALIASES: HeaderAliasMap = {
  beneficiary: ['qualifying beneficiaries', 'beneficiary', 'beneficiary name', 'enterprise', 'supplier'],
  contributionType: ['contribution type', 'type', 'nature of contribution'],
  recognisedAmount: [
    'recognised amount',
    'recognized amount',
    'recognised value',
    'amount',
    'contribution',
  ],
  notes: ['notes', 'comments', 'comment'],
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function mapGenericHeaders(headerRow: unknown[]): Record<string, number> | null {
  const mapped: Record<string, number> = {}
  for (let c = 0; c < headerRow.length; c += 1) {
    const label = normalizeHeader(headerRow[c])
    if (!label) continue
    for (const [field, aliases] of Object.entries(GENERIC_ALIASES)) {
      if (aliases.includes(label) && mapped[field] == null) mapped[field] = c
    }
  }
  if (Object.keys(mapped).length === 0) return null
  return mapped
}

function scaffoldParse(
  workbookBuffer: ArrayBuffer | Buffer,
  preferredNames: string[],
  elementLabel: string,
): CalculatorImportPreview {
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer', cellDates: true })
  const sheetName =
    preferredNames.find((n) => workbook.SheetNames.some((s) => normalizeHeader(s) === normalizeHeader(n))) ??
    workbook.SheetNames.find((s) =>
      preferredNames.some((n) => normalizeHeader(s).includes(normalizeHeader(n).slice(0, 8))),
    ) ??
    workbook.SheetNames[0] ??
    ''

  if (!sheetName) {
    return emptyPreview([`No worksheet found for ${elementLabel}.`])
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
  })

  let headerIndex = -1
  let headerMap: Record<string, number> | null = null
  for (let i = 0; i < Math.min(rows.length, 40); i += 1) {
    headerMap = mapGenericHeaders(rows[i] ?? [])
    if (headerMap) {
      headerIndex = i
      break
    }
  }

  if (!headerMap || headerIndex < 0) {
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
        `${elementLabel}: headers not auto-detected. Manual column mapping scaffold is available; a verified REAP template is still required for production scoring.`,
      ],
    }
  }

  const detectedHeaders: Record<string, string> = {}
  for (const [field, col] of Object.entries(headerMap)) {
    detectedHeaders[field] = String(rows[headerIndex]?.[col] ?? field).trim()
  }

  const importRows: CalculatorImportRow[] = []
  for (let r = headerIndex + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? []
    const values: Record<string, string | number | null> = {}
    let any = false
    for (const [field, col] of Object.entries(headerMap)) {
      const raw = row[col]
      if (raw == null || String(raw).trim() === '') {
        values[field] = null
      } else if (typeof raw === 'number') {
        values[field] = raw
        any = true
      } else {
        values[field] = String(raw).trim()
        any = true
      }
    }
    if (!any) continue
    importRows.push({
      sourceRowNumber: r + 1,
      values,
      validationStatus: 'warning',
      validationMessages: [
        `${elementLabel} row imported for review. Scoring remains incomplete until REAP confirms the workbook template and engine inputs.`,
      ],
    })
  }

  return {
    sheetName,
    detectedHeaders,
    rows: importRows,
    validRowCount: 0,
    warningCount: importRows.length,
    rejectedRowCount: 0,
    platformTotalRecognised: null,
    workbookDisplayedTotal: null,
    totalsMatch: null,
    notes: [
      `${elementLabel} adapter supports upload, header detection, and preview only.`,
      'Do not treat imported rows as a scored result until a verified REAP sample workbook and metric mapping are confirmed.',
    ],
  }
}

function emptyPreview(notes: string[]): CalculatorImportPreview {
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
    notes,
  }
}

function unscoredBreakdown(elementLabel: string, ruleVersion: string): CalculationBreakdown {
  return {
    formulaName: `${elementLabel.toLowerCase().replace(/\s+/g, '_')}_scaffold`,
    ruleVersion,
    inputsUsed: {},
    target: null,
    actual: null,
    pointsAvailable: null,
    pointsAchieved: null,
    caps: {},
    thresholds: {},
    exclusions: [],
    warnings: [
      `${elementLabel} calculation is scaffolded only. Use the existing full-scorecard workbook engine for verified ED/Supplier Development/MC scoring until element templates are confirmed.`,
    ],
    explanation: `${elementLabel} scoring is not enabled from beneficiary-style uploads yet. Architecture, mapping, and validation are in place.`,
  }
}

export const enterpriseDevelopmentAdapter: ScorecardElementAdapter = {
  elementKey: 'enterprise_development',
  elementName: 'Enterprise Development',
  shortName: 'ED',
  acceptedSheetNames: ['ED', 'Enterprise Development', 'ED & SD'],
  headerAliases: GENERIC_ALIASES,
  ruleVersion: 'enterprise-development-scaffold-v0',
  scoringReady: false,
  help: {
    summary: 'Upload an Enterprise Development workbook when available. Mapping and preview are supported; scoring awaits a verified REAP template.',
    uploadHints: ['Prefer a dedicated ED sheet or ED & SD workbook with identifiable headers.'],
    outstandingBusinessRules: [
      'Verified beneficiary-line template for ED not yet supplied separately from the full multi-sheet scorecard workbook.',
      'Existing engine scores ED from percentage/target/available_points metrics on ED & SD sheets.',
    ],
  },
  parseWorkbook: ({ workbookBuffer, preferredSheetName }) =>
    scaffoldParse(
      workbookBuffer,
      preferredSheetName ? [preferredSheetName, 'ED', 'Enterprise Development', 'ED & SD'] : ['ED', 'Enterprise Development', 'ED & SD'],
      'Enterprise Development',
    ),
  calculate: () => unscoredBreakdown('Enterprise Development', 'enterprise-development-scaffold-v0'),
}

export const supplierDevelopmentAdapter: ScorecardElementAdapter = {
  elementKey: 'supplier_development',
  elementName: 'Supplier Development',
  shortName: 'Supplier Development',
  acceptedSheetNames: ['Supplier Development', 'SD', 'ED & SD'],
  headerAliases: GENERIC_ALIASES,
  ruleVersion: 'supplier-development-scaffold-v0',
  scoringReady: false,
  help: {
    summary:
      'Supplier Development (not Skills Development). Upload a Supplier Development workbook when available. Internal key is supplier_development.',
    uploadHints: [
      'Do not confuse with Skills Development (skills_development).',
      'Combined ED & SD workbooks are accepted when sheets/headers can be identified.',
    ],
    outstandingBusinessRules: [
      'Verified Supplier Development beneficiary template still required for production scoring.',
      'Existing engine uses supplier_development.* metrics from ED & SD sheets.',
    ],
  },
  parseWorkbook: ({ workbookBuffer, preferredSheetName }) =>
    scaffoldParse(
      workbookBuffer,
      preferredSheetName
        ? [preferredSheetName, 'Supplier Development', 'SD', 'ED & SD']
        : ['Supplier Development', 'SD', 'ED & SD'],
      'Supplier Development',
    ),
  calculate: () => unscoredBreakdown('Supplier Development', 'supplier-development-scaffold-v0'),
}
