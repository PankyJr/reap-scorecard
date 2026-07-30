import * as XLSX from 'xlsx'
import type {
  CalculatorImportPreview,
  CalculatorImportRow,
  HeaderAliasMap,
} from '../../types'

export const SED_HEADER_ALIASES: HeaderAliasMap = {
  beneficiary: [
    'qualifying beneficiaries',
    'qualifying beneficiary',
    'beneficiary',
    'beneficiary name',
  ],
  claimed: ['claimed', 'claim', 'claimed amount', 'claim status'],
  recognisedAmount: [
    'recognised amount',
    'recognized amount',
    'recognised value',
    'recognized value',
  ],
  notes: ['notes', 'comments', 'comment'],
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isTotalLabel(value: unknown): boolean {
  const n = normalizeHeader(value)
  return n === 'total' || n.startsWith('total ')
}

function coerceMoney(value: unknown): { amount: number | null; raw: string | null; error: string | null } {
  if (value == null || value === '') return { amount: null, raw: null, error: null }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { amount: null, raw: String(value), error: 'Amount is not a finite number.' }
    if (value < 0) return { amount: null, raw: String(value), error: 'Recognised amount cannot be negative.' }
    return { amount: value, raw: String(value), error: null }
  }
  const raw = String(value).trim()
  if (!raw) return { amount: null, raw: null, error: null }
  const cleaned = raw.replace(/[,\sR$£€]/gi, '')
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) {
    return { amount: null, raw, error: `Could not parse recognised amount "${raw}".` }
  }
  if (parsed < 0) {
    return { amount: null, raw, error: 'Recognised amount cannot be negative.' }
  }
  return { amount: parsed, raw, error: null }
}

function mapHeaders(headerRow: unknown[]): Record<string, number> | null {
  const mapped: Record<string, number> = {}
  for (let c = 0; c < headerRow.length; c += 1) {
    const label = normalizeHeader(headerRow[c])
    if (!label) continue
    for (const [field, aliases] of Object.entries(SED_HEADER_ALIASES)) {
      if (aliases.includes(label) && mapped[field] == null) {
        mapped[field] = c
      }
    }
  }
  if (mapped.beneficiary == null || mapped.recognisedAmount == null) return null
  return mapped
}

function findSedSheet(workbook: XLSX.WorkBook, preferredSheetName?: string | null): string | null {
  if (preferredSheetName && workbook.SheetNames.includes(preferredSheetName)) {
    return preferredSheetName
  }
  const byName = workbook.SheetNames.find((n) => normalizeHeader(n) === 'sed')
  if (byName) return byName

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
    })
    for (const row of rows.slice(0, 5)) {
      const joined = (row ?? []).map(normalizeHeader).join(' ')
      if (joined.includes('socio') && joined.includes('economic')) return name
      if (joined.includes('qualifying beneficiaries') || joined.includes('recognised amount')) {
        return name
      }
    }
  }
  return workbook.SheetNames[0] ?? null
}

function findHeaderRow(rows: unknown[][]): { index: number; map: Record<string, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const map = mapHeaders(rows[i] ?? [])
    if (map) return { index: i, map }
  }
  return null
}

/**
 * Import SED beneficiary rows by header name (not fixed column position).
 * Ignores merged title, blank template rows, and Total rows.
 * Recalculates recognised total from valid rows — never trusts workbook Total formula.
 */
export function importSedBeneficiaryWorkbook(args: {
  workbookBuffer: ArrayBuffer | Buffer
  preferredSheetName?: string | null
}): CalculatorImportPreview {
  const workbook = XLSX.read(args.workbookBuffer, { type: 'buffer', cellDates: true })
  const sheetName = findSedSheet(workbook, args.preferredSheetName)
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
      notes: ['No usable worksheet found in the workbook.'],
    }
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  })

  const header = findHeaderRow(rows)
  if (!header) {
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
        'Could not detect SED headers. Expected Qualifying Beneficiaries and Recognised Amount (aliases supported).',
      ],
    }
  }

  const detectedHeaders: Record<string, string> = {}
  for (const [field, col] of Object.entries(header.map)) {
    detectedHeaders[field] = String(rows[header.index]?.[col] ?? field).trim()
  }

  const importRows: CalculatorImportRow[] = []
  let workbookDisplayedTotal: number | null = null

  for (let r = header.index + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? []
    const sourceRowNumber = r + 1
    const beneficiaryRaw = row[header.map.beneficiary]
    const claimedRaw = header.map.claimed != null ? row[header.map.claimed] : null
    const recognisedRaw = row[header.map.recognisedAmount]
    const notesRaw = header.map.notes != null ? row[header.map.notes] : null

    const beneficiary = beneficiaryRaw == null ? '' : String(beneficiaryRaw).trim()
    const isBlank =
      !beneficiary &&
      (claimedRaw == null || String(claimedRaw).trim() === '') &&
      (recognisedRaw == null || String(recognisedRaw).trim() === '') &&
      (notesRaw == null || String(notesRaw).trim() === '')

    if (isBlank) continue

    if (isTotalLabel(beneficiaryRaw)) {
      const totalMoney = coerceMoney(recognisedRaw)
      if (totalMoney.amount != null) workbookDisplayedTotal = totalMoney.amount
      continue
    }

    const money = coerceMoney(recognisedRaw)
    const messages: string[] = []
    let status: CalculatorImportRow['validationStatus'] = 'valid'

    if (!beneficiary) {
      messages.push('Beneficiary name is required.')
      status = 'rejected'
    }
    if (money.error) {
      messages.push(money.error)
      status = money.amount == null ? 'rejected' : 'warning'
    }
    if (money.amount == null && !money.error) {
      messages.push('Recognised amount is missing.')
      status = 'rejected'
    }

    // Claimed: preserve raw value only — meaning unresolved; not used in scoring.
    const claimedPreserved =
      claimedRaw == null || String(claimedRaw).trim() === ''
        ? null
        : typeof claimedRaw === 'number'
          ? claimedRaw
          : String(claimedRaw).trim()

    importRows.push({
      sourceRowNumber,
      values: {
        beneficiary,
        claimed: claimedPreserved,
        recognisedAmount: money.amount,
        notes: notesRaw == null || String(notesRaw).trim() === '' ? null : String(notesRaw).trim(),
      },
      validationStatus: status,
      validationMessages: messages,
    })
  }

  const validRows = importRows.filter((row) => row.validationStatus === 'valid')
  const warningCount = importRows.filter((row) => row.validationStatus === 'warning').length
  const rejectedRowCount = importRows.filter((row) => row.validationStatus === 'rejected').length

  const platformTotalRecognised = validRows.reduce((sum, row) => {
    const amount = row.values.recognisedAmount
    return sum + (typeof amount === 'number' ? amount : 0)
  }, 0)

  const totalsMatch =
    workbookDisplayedTotal == null ? null : workbookDisplayedTotal === platformTotalRecognised

  return {
    sheetName,
    detectedHeaders,
    rows: importRows,
    validRowCount: validRows.length,
    warningCount,
    rejectedRowCount,
    platformTotalRecognised,
    workbookDisplayedTotal,
    totalsMatch,
    notes: [
      'Recognised total is recalculated from valid imported rows; the workbook Total row is ignored as authoritative.',
      'Claimed values are preserved as optional raw data and are not used in scoring until REAP confirms their meaning.',
    ],
  }
}

export function sumValidRecognisedAmount(rows: CalculatorImportRow[]): number {
  return rows
    .filter((row) => row.validationStatus === 'valid')
    .reduce((sum, row) => sum + (typeof row.values.recognisedAmount === 'number' ? row.values.recognisedAmount : 0), 0)
}
