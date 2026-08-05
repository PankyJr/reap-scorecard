/**
 * Row-level Enterprise Development / Supplier Development beneficiary import.
 *
 * The 'ED & SD' sheet carries two beneficiary tables that share a layout:
 *
 *   <section title>            e.g. "Enterprise Development and Supplier Development"
 *   Beneficiary Name | Type of contribution | <element> (R amount) | evidence…
 *   <beneficiary rows>
 *   Total            |                      | <sheet total>
 *
 * Both tables float — inserting rows anywhere above moves them — so they are
 * located by their section titles and "Beneficiary Name" header rows, never by
 * fixed row numbers.
 *
 * The sheet's own Total row (C39 for ED, C60 for SD in the reference file) is
 * treated as a CHECKSUM, not as the source of truth: rows are always imported,
 * and a disagreement is reported with both figures named.
 *
 * Row numbers are true worksheet rows. `sheet_to_json` is called without
 * `blankrows: false`, so nothing is collapsed — but it still indexes from the
 * sheet's `!ref` origin, and this sheet's range starts at A2. Every index is
 * therefore offset by that origin before being reported.
 */
import * as XLSX from 'xlsx'

export type EsdElementKey = 'enterprise_development' | 'supplier_development'

export type EsdBeneficiaryRow = {
  /** True worksheet row number (1-indexed). */
  sourceRowNumber: number
  /** Address of the amount cell, e.g. "C25". */
  sourceCell: string
  beneficiaryName: string
  contributionTypeLabel: string | null
  amount: number | null
  validationStatus: 'valid' | 'warning' | 'rejected'
  validationMessages: string[]
}

export type EsdImportPreview = {
  sheetName: string
  element: EsdElementKey
  /** True worksheet row of the "Beneficiary Name" header, or null. */
  headerRowNumber: number | null
  rows: EsdBeneficiaryRow[]
  validRowCount: number
  warningCount: number
  rejectedRowCount: number
  /** Sum of valid rows — what the platform will score. */
  platformTotal: number | null
  /** The sheet's own Total row, for reconciliation only. */
  workbookDisplayedTotal: number | null
  totalsMatch: boolean | null
  notes: string[]
}

const ED_SD_SHEET_ALIASES = ['ed & sd', 'ed and sd', 'ed&sd']
const IMPORT_VERSION = 'esd-beneficiary-import-v1'

function normalize(value: unknown): string {
  return String(value ?? '')
    .replace(/ /g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findEsdSheet(workbook: XLSX.WorkBook, preferred?: string | null): string | null {
  if (preferred && workbook.SheetNames.includes(preferred)) return preferred
  const match = workbook.SheetNames.find((name) => {
    const n = normalize(name).replace(/&/g, ' and ').replace(/\s+/g, ' ')
    return ED_SD_SHEET_ALIASES.some((alias) => alias.replace(/&/g, ' and ').replace(/\s+/g, ' ') === n)
  })
  return match ?? null
}

function coerceMoney(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const text = String(raw).replace(/[R\s,]/gi, '')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function isBeneficiaryHeader(label: string): boolean {
  return label === 'beneficiary name' || label.startsWith('beneficiary name')
}

function isTotalLabel(label: string): boolean {
  return label === 'total' || /^total\b/.test(label)
}

/**
 * A section title: a short standalone label naming the element, with no data
 * beside it. Excludes the scoring-criteria sentences at the top of the sheet,
 * which carry a target and points in columns B and C.
 */
function isSectionTitle(row: unknown[], label: string): boolean {
  if (!label || label.length > 80) return false
  if (!/enterprise development|supplier development/.test(label)) return false
  const hasNeighbouringData = [1, 2].some((c) => {
    const v = row[c]
    return v != null && String(v).trim() !== ''
  })
  return !hasNeighbouringData
}

/** Which element a section title belongs to; "and" titles head the ED table. */
function titleElement(label: string): EsdElementKey {
  const supplier = label.includes('supplier development')
  const enterprise = label.includes('enterprise development')
  if (supplier && !enterprise) return 'supplier_development'
  return 'enterprise_development'
}

/** Column offset of the amount within a beneficiary header row. */
function findAmountColumn(headerRow: unknown[]): number | null {
  for (let c = 0; c < headerRow.length; c += 1) {
    const label = normalize(headerRow[c])
    if (!label) continue
    if (/\(r\s*amount\)|\bamount\b|\brand\b|\(r\)/.test(label)) return c
  }
  return null
}

function findNameColumn(headerRow: unknown[]): number {
  for (let c = 0; c < headerRow.length; c += 1) {
    if (isBeneficiaryHeader(normalize(headerRow[c]))) return c
  }
  return 0
}

export function importEsdBeneficiaryWorkbook(args: {
  workbookBuffer: ArrayBuffer | Buffer
  element: EsdElementKey
  preferredSheetName?: string | null
}): EsdImportPreview {
  const { element } = args
  const label = element === 'enterprise_development' ? 'Enterprise Development' : 'Supplier Development'

  const empty = (sheetName: string, notes: string[]): EsdImportPreview => ({
    sheetName,
    element,
    headerRowNumber: null,
    rows: [],
    validRowCount: 0,
    warningCount: 0,
    rejectedRowCount: 0,
    platformTotal: null,
    workbookDisplayedTotal: null,
    totalsMatch: null,
    notes: [`Importer version: ${IMPORT_VERSION}.`, ...notes],
  })

  const workbook = XLSX.read(args.workbookBuffer, { type: 'buffer', cellDates: true })
  const sheetName = findEsdSheet(workbook, args.preferredSheetName)
  if (!sheetName) {
    return empty('', ['No "ED & SD" sheet was found in the workbook.'])
  }

  const sheet = workbook.Sheets[sheetName]
  // No blankrows:false, so no rows are collapsed — but `sheet_to_json` indexes
  // from the sheet's !ref origin, and this sheet's range starts at A2. Offset
  // by the origin so every reported row number is a true worksheet row.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true })
  const originRow = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r : 0
  const trueRow = (index: number) => index + originRow

  // --- locate the beneficiary table for this element --------------------------
  let currentTitle: EsdElementKey | null = null
  let headerIndex = -1

  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r] ?? []
    const first = normalize(row[0])
    if (isSectionTitle(row, first)) {
      currentTitle = titleElement(first)
      continue
    }
    if (isBeneficiaryHeader(first) && currentTitle === element) {
      headerIndex = r
      break
    }
  }

  if (headerIndex < 0) {
    return empty(sheetName, [
      `No "Beneficiary Name" table was found under a ${label} section title on "${sheetName}".`,
    ])
  }

  const headerRow = rows[headerIndex] ?? []
  const nameCol = findNameColumn(headerRow)
  const amountCol = findAmountColumn(headerRow)
  if (amountCol == null) {
    return empty(sheetName, [
      `The ${label} beneficiary table has no recognisable amount column (expected a header such as "${label} (R amount)").`,
    ])
  }

  // --- read rows until the table ends -----------------------------------------
  const importRows: EsdBeneficiaryRow[] = []
  let workbookDisplayedTotal: number | null = null

  for (let r = headerIndex + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? []
    const first = normalize(row[0])

    if (isSectionTitle(row, first) || isBeneficiaryHeader(first)) break

    if (isTotalLabel(first)) {
      const total = coerceMoney(row[amountCol])
      if (total != null) workbookDisplayedTotal = total
      break
    }

    const name = row[nameCol] == null ? '' : String(row[nameCol]).trim()
    const amountRaw = row[amountCol]
    const typeRaw = row[1]

    const blank =
      !name && (amountRaw == null || String(amountRaw).trim() === '')
    if (blank) continue

    // The reference sheet's totals row carries no label at all — ED & SD!C39
    // and C60 are bare SUM() cells with an empty column A. A nameless row
    // holding only an amount terminates the table and is the checksum.
    if (!name) {
      const total = coerceMoney(amountRaw)
      if (total != null) workbookDisplayedTotal = total
      break
    }

    const amount = coerceMoney(amountRaw)
    const messages: string[] = []
    let status: EsdBeneficiaryRow['validationStatus'] = 'valid'

    if (!name) {
      messages.push('Beneficiary name is required.')
      status = 'rejected'
    }
    if (amount == null) {
      messages.push('Contribution amount is missing or not a number.')
      status = 'rejected'
    } else if (amount <= 0) {
      messages.push('Contribution amount must be greater than zero.')
      status = 'rejected'
    }

    importRows.push({
      sourceRowNumber: trueRow(r) + 1,
      sourceCell: XLSX.utils.encode_cell({ r: trueRow(r), c: amountCol }),
      beneficiaryName: name,
      contributionTypeLabel: typeRaw == null ? null : String(typeRaw).trim() || null,
      amount,
      validationStatus: status,
      validationMessages: messages,
    })
  }

  // --- reconcile against the sheet's own total --------------------------------
  const valid = importRows.filter((r) => r.validationStatus !== 'rejected')
  const platformTotal = valid.length === 0 ? null : valid.reduce((sum, r) => sum + (r.amount ?? 0), 0)

  const notes: string[] = [`Importer version: ${IMPORT_VERSION}.`]
  if (importRows.length === 0) {
    notes.push(`No beneficiaries found in the ${label} table on "${sheetName}".`)
  }

  let totalsMatch: boolean | null = null
  if (workbookDisplayedTotal != null && platformTotal != null) {
    totalsMatch = Math.abs(workbookDisplayedTotal - platformTotal) < 0.005
    if (!totalsMatch) {
      notes.push(
        `${label} rows sum to ${platformTotal}, but the sheet Total row states ${workbookDisplayedTotal}. ` +
          'The imported rows are used; the sheet total is treated as a checksum only.',
      )
    }
  }
  notes.push('Recognised amounts are recalculated from the imported rows; the workbook Total row is never scored.')

  return {
    sheetName,
    element,
    headerRowNumber: trueRow(headerIndex) + 1,
    rows: importRows,
    validRowCount: valid.length,
    warningCount: importRows.filter((r) => r.validationStatus === 'warning').length,
    rejectedRowCount: importRows.filter((r) => r.validationStatus === 'rejected').length,
    platformTotal,
    workbookDisplayedTotal,
    totalsMatch,
    notes,
  }
}
