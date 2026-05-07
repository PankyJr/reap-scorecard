export const REQUIRED_WORKBOOK_SHEETS = [
  'Ownership',
  'Management Control',
  'Skills Development',
  'Procurement',
  'ED & SD',
  'SED',
  'Full Scorecard',
  'NPAT',
] as const

export const SUPPORTING_WORKBOOK_SHEETS = [
  '3 Board Members',
  '4 Executive Committe',
  '5 Staff List',
  'Employment Equity',
  'Cat A',
  'Interns & Learners',
  'Cat G',
  'Category A',
  'Learner summary',
  '13 EMP201',
  'TMPS',
] as const

function normalizeSheetName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

const SHEET_KEY_OVERRIDES: Record<string, string> = {
  'ed & sd': 'ed_sd',
  'full scorecard': 'full_scorecard',
  '3 board members': 'board_members',
  '4 executive committe': 'executive_committee',
  '5 staff list': 'staff_list',
  '13 emp201': 'emp201',
}

export function toSheetKey(sheetName: string): string {
  const normalized = normalizeSheetName(sheetName)
  if (SHEET_KEY_OVERRIDES[normalized]) {
    return SHEET_KEY_OVERRIDES[normalized]
  }
  return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export function detectWorkbookSheets(sheetNames: string[]) {
  const detected = new Map(sheetNames.map((name) => [normalizeSheetName(name), name]))

  const required = REQUIRED_WORKBOOK_SHEETS.map((sheetName) => ({
    expectedName: sheetName,
    detectedName: detected.get(normalizeSheetName(sheetName)) ?? null,
  }))

  const supporting = SUPPORTING_WORKBOOK_SHEETS.map((sheetName) => ({
    expectedName: sheetName,
    detectedName: detected.get(normalizeSheetName(sheetName)) ?? null,
  }))

  return { required, supporting }
}
