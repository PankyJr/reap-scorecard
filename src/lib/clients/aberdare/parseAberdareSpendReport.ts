import {
  ABERDARE_EXPECTED_RECONCILIATION,
  type AberdareParseResult,
  type AberdareReconciliation,
  type AberdareSupplierRow,
  type AberdareTotalsRow,
} from './types'
import {
  classifyImportFlag,
  expectedRecognitionPercentForLevel,
  flagAmountAsBoolean,
  multiplierMatchesRecognition,
  normaliseAccredLevel,
  normaliseCategoricalPlaceholder,
  parseMultiplierPercent,
  parseNumericCell,
  parseOwnershipPercent,
  resolveSupplierType,
} from './normalise'

export const ABERDARE_COLUMN_HEADERS = [
  'Company',
  'Accred level (1-8)',
  'Vendor Code',
  'Vendor Name',
  'Amount Excl Vat',
  'Level 1',
  'Level 2',
  'Level 3',
  'Level 4',
  'Level 5',
  'Level 6',
  'Level 7',
  'Level 8',
  'EME',
  'QSE',
  'GED',
  'Black Owned >= 51%',
  'Black Owned %',
  'Black Female Owned >30%',
  'Black Female Owned %',
  'Empowering Supplier',
  'Certificate',
  'Designated Group',
  'Designated Group Type',
  'Import',
  'Import Spend Exempt Value',
  'Spend Exempt',
  'Local Spend Exempt Val',
  'Enterprise Development',
  'Supplier Development',
  'First Time Supplier',
  'Three Year Contract',
  'Region',
  'Multiplier',
  'Discount',
  'Payment Term',
  'Payment Term Description',
] as const

const AMOUNT_TOLERANCE = 0.02

export interface AberdareWorkbookLike {
  SheetNames: string[]
  Sheets: Record<string, unknown>
}

/**
 * Parse an ArrayBuffer / Uint8Array using the project’s xlsx dependency.
 * Accepts the `xlsx` package export (typed loosely for SheetJS compatibility).
 */
export function parseAberdareSpendReport(
  data: ArrayBuffer | Uint8Array,
  sourceFileName: string,
  xlsx: {
    read: (
      data: ArrayBuffer | Uint8Array,
      opts: { type: 'array'; sheetRows?: number },
    ) => AberdareWorkbookLike
    utils: {
      // SheetJS overloads are awkward to express; callers pass `xlsx.utils`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sheet_to_json: (sheet: any, opts: { header: 1; defval: null; raw: boolean }) => unknown[][]
    }
  },
): AberdareParseResult {
  const workbook = xlsx.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('The workbook does not contain any sheets.')
  }
  const sheet = workbook.Sheets[sheetName]
  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  })
  return parseAberdareSpendReportFromRows(rows, sourceFileName)
}

function headerMatches(row: unknown[] | undefined): boolean {
  if (!row || row.length < 5) return false
  const norm = (v: unknown) => String(v ?? '').trim().toLowerCase()
  return (
    norm(row[0]) === 'company' &&
    norm(row[1]).includes('accred') &&
    norm(row[2]).includes('vendor code') &&
    norm(row[3]).includes('vendor name') &&
    norm(row[4]).includes('amount')
  )
}

function cellStr(raw: unknown): string {
  if (raw == null) return ''
  return String(raw).trim()
}

/**
 * Detect the aggregate totals row safely — not only by position.
 * Typical markers: empty/placeholder company & vendor identity with a sum-like amount.
 */
export function isAberdareTotalsRow(
  row: unknown[],
  precedingSupplierSpendSum: number,
): boolean {
  const company = cellStr(row[0])
  const vendorCode = cellStr(row[2])
  const vendorName = cellStr(row[3])
  const amount = parseNumericCell(row[4]).value

  const identityEmpty =
    (!company || company === '6') &&
    (!vendorCode || vendorCode === '6') &&
    (!vendorName || vendorName === '6')

  if (!identityEmpty || amount == null) return false

  if (
    precedingSupplierSpendSum !== 0 &&
    Math.abs(amount - precedingSupplierSpendSum) <= AMOUNT_TOLERANCE
  ) {
    return true
  }

  // Future workbooks may differ slightly; still treat empty-identity aggregate as totals.
  if (identityEmpty && Math.abs(amount) > 1_000_000) {
    return true
  }

  return false
}

function nearlyEqual(a: number, b: number, tol = AMOUNT_TOLERANCE): boolean {
  return Math.abs(a - b) <= tol
}

export function reconcileAberdareReport(args: {
  suppliers: AberdareSupplierRow[]
  totalsRow: AberdareTotalsRow | null
}): AberdareReconciliation {
  const { suppliers, totalsRow } = args
  const expected = ABERDARE_EXPECTED_RECONCILIATION
  const sourceSpendTotal = suppliers.reduce((s, r) => s + r.amountExVat, 0)
  const explicitImports = suppliers.filter(
    (r) => r.importClassification === 'imported',
  )
  const explicitImportSpend = explicitImports.reduce(
    (s, r) => s + r.amountExVat,
    0,
  )
  const importSpendExemptTotal = suppliers.reduce(
    (s, r) => s + (r.importSpendExemptValue ?? 0),
    0,
  )
  const localSpendExemptTotal = suppliers.reduce(
    (s, r) => s + (r.localSpendExemptValue ?? 0),
    0,
  )
  const negativeRows = suppliers.filter((r) => r.amountExVat < 0)
  const combinedNegativeSpend = negativeRows.reduce(
    (s, r) => s + r.amountExVat,
    0,
  )
  const unknownPlaceholderFieldCount = suppliers.reduce(
    (s, r) => s + r.placeholderUnknownFields.length,
    0,
  )
  const multiplierDiscrepancyCount = suppliers.filter(
    (r) => !r.multiplierMatchesRecognition,
  ).length

  const mismatches: string[] = []
  const spendMatchesExpected = nearlyEqual(
    sourceSpendTotal,
    expected.totalAmountExVat,
  )
  const totalsRowSpend = totalsRow?.amountExVat ?? null
  const spendMatchesTotalsRow =
    totalsRowSpend != null && nearlyEqual(sourceSpendTotal, totalsRowSpend)

  if (suppliers.length !== expected.supplierRows) {
    mismatches.push(
      `Supplier count ${suppliers.length} differs from expected ${expected.supplierRows}.`,
    )
  }
  if (!spendMatchesExpected) {
    mismatches.push(
      `Source spend ${sourceSpendTotal.toFixed(2)} differs from expected ${expected.totalAmountExVat.toFixed(2)}.`,
    )
  }
  if (totalsRowSpend != null && !spendMatchesTotalsRow) {
    mismatches.push(
      `Supplier spend sum does not match the workbook totals row (${totalsRowSpend.toFixed(2)}).`,
    )
  }
  if (explicitImports.length !== expected.explicitImportRows) {
    mismatches.push(
      `Explicit Import=Y count ${explicitImports.length} differs from expected ${expected.explicitImportRows}.`,
    )
  }
  if (!nearlyEqual(explicitImportSpend, expected.explicitImportSpend)) {
    mismatches.push(
      `Explicit imported spend differs from expected ${expected.explicitImportSpend.toFixed(2)}.`,
    )
  }
  if (!nearlyEqual(importSpendExemptTotal, expected.importSpendExemptValue)) {
    mismatches.push(
      `Import Spend Exempt Value total differs from expected ${expected.importSpendExemptValue.toFixed(2)}.`,
    )
  }
  if (!nearlyEqual(localSpendExemptTotal, expected.localSpendExemptValue)) {
    mismatches.push(
      `Local Spend Exempt Val total differs from expected ${expected.localSpendExemptValue.toFixed(2)}.`,
    )
  }

  return {
    expected,
    supplierCount: suppliers.length,
    sourceSpendTotal,
    totalsRowSpend,
    spendMatchesTotalsRow,
    spendMatchesExpected,
    explicitImportCount: explicitImports.length,
    explicitImportSpend,
    importSpendMatchesExpected: nearlyEqual(
      explicitImportSpend,
      expected.explicitImportSpend,
    ),
    importSpendExemptTotal,
    importExemptMatchesExpected: nearlyEqual(
      importSpendExemptTotal,
      expected.importSpendExemptValue,
    ),
    localSpendExemptTotal,
    localExemptMatchesExpected: nearlyEqual(
      localSpendExemptTotal,
      expected.localSpendExemptValue,
    ),
    negativeSpendRows: negativeRows.length,
    combinedNegativeSpend,
    unknownPlaceholderFieldCount,
    multiplierDiscrepancyCount,
    mismatches,
  }
}

export function normaliseAberdareSupplier(
  row: unknown[],
  sourceRowNumber: number,
  id: string,
): AberdareSupplierRow {
  const company = cellStr(row[0])
  const accred = normaliseAccredLevel(row[1])
  const vendorCode = cellStr(row[2])
  const vendorName = cellStr(row[3])
  const amountParsed = parseNumericCell(row[4])
  if (amountParsed.malformed) {
    throw new Error(
      `Row ${sourceRowNumber}: Amount Excl Vat is malformed and cannot be scored.`,
    )
  }
  const amountExVat = amountParsed.value ?? 0

  const emeAmount = parseNumericCell(row[13]).value
  const qseAmount = parseNumericCell(row[14]).value
  const blackOwnedAmount = parseNumericCell(row[16]).value
  const blackOwnedPercent = parseOwnershipPercent(row[17])
  const blackFemaleAmount = parseNumericCell(row[18]).value
  const blackFemaleOwnedPercent = parseOwnershipPercent(row[19])
  const designatedGroupAmount = parseNumericCell(row[22]).value

  const importInfo = classifyImportFlag(row[24])
  const importExempt = parseNumericCell(row[25])
  const spendExempt = normaliseCategoricalPlaceholder(row[26])
  const localExempt = parseNumericCell(row[27])
  const certificate = normaliseCategoricalPlaceholder(row[21])
  const firstTime = normaliseCategoricalPlaceholder(row[30])
  const threeYear = normaliseCategoricalPlaceholder(row[31])
  const multiplier = parseMultiplierPercent(row[33])

  const supplierType = resolveSupplierType({ emeAmount, qseAmount })
  const is51BlackOwned =
    flagAmountAsBoolean(blackOwnedAmount) ||
    (blackOwnedPercent != null && blackOwnedPercent >= 51)
  const is30BlackWomenOwned =
    flagAmountAsBoolean(blackFemaleAmount) ||
    (blackFemaleOwnedPercent != null && blackFemaleOwnedPercent > 30)
  const is51Bdgs = flagAmountAsBoolean(designatedGroupAmount)

  const expectedRecognition = expectedRecognitionPercentForLevel(accred.level)
  const matchesMultiplier = multiplierMatchesRecognition(
    multiplier.percent,
    accred.level,
  )

  const placeholderUnknownFields: string[] = []
  if (spendExempt.normalised === 'unknown') {
    placeholderUnknownFields.push('Spend Exempt')
  }
  if (certificate.normalised === 'unknown') {
    placeholderUnknownFields.push('Certificate')
  }
  if (firstTime.normalised === 'unknown') {
    placeholderUnknownFields.push('First Time Supplier')
  }
  if (threeYear.normalised === 'unknown') {
    placeholderUnknownFields.push('Three Year Contract')
  }
  if (importInfo.raw === '6') {
    placeholderUnknownFields.push('Import')
  }

  const spendExemptNormalised =
    spendExempt.normalised === 'yes' ||
    spendExempt.normalised === 'no' ||
    spendExempt.normalised === 'unknown' ||
    spendExempt.normalised === 'not_provided'
      ? spendExempt.normalised
      : 'unknown'

  const simulator = {
    id,
    supplier_name: vendorName || `Vendor ${vendorCode || sourceRowNumber}`,
    supplier_code: vendorCode,
    supplier_type: supplierType,
    level: accred.level,
    value_ex_vat: amountExVat,
    is_51_black_owned: is51BlackOwned,
    is_30_black_women_owned: is30BlackWomenOwned,
    is_51_bdgs: is51Bdgs,
    is_imported: importInfo.isImported,
    compliance_status: accred.complianceStatus,
    expiry: certificate.raw || undefined,
  }

  return {
    id,
    sourceRowNumber,
    company,
    vendorCode,
    vendorName,
    amountExVat,
    accredLevelRaw: accred.raw,
    level: accred.level,
    complianceStatus: accred.complianceStatus,
    importRaw: importInfo.raw,
    importClassification: importInfo.classification,
    importSpendExemptValue: importExempt.value,
    spendExemptRaw: spendExempt.raw,
    spendExemptNormalised,
    localSpendExemptValue: localExempt.value,
    certificateRaw: certificate.raw,
    certificateNormalised: String(certificate.normalised),
    multiplierRaw: multiplier.raw,
    multiplierPercent: multiplier.percent,
    expectedRecognitionPercent: expectedRecognition,
    multiplierMatchesRecognition: matchesMultiplier,
    supplierType,
    is51BlackOwned,
    is30BlackWomenOwned,
    is51Bdgs,
    blackOwnedPercent,
    blackFemaleOwnedPercent,
    emeAmount,
    qseAmount,
    designatedGroupType: cellStr(row[23]),
    region: cellStr(row[32]),
    paymentTerm: cellStr(row[35]),
    paymentTermDescription: cellStr(row[36]),
    placeholderUnknownFields,
    simulator,
    details: {
      company,
      emeAmount,
      qseAmount,
      ged: parseNumericCell(row[15]).value,
      blackOwnedAmount,
      blackOwnedPercent,
      blackFemaleAmount,
      blackFemaleOwnedPercent,
      empoweringSupplier: parseNumericCell(row[20]).value,
      designatedGroupAmount,
      designatedGroupType: cellStr(row[23]),
      enterpriseDevelopment: parseNumericCell(row[28]).value,
      supplierDevelopment: parseNumericCell(row[29]).value,
      firstTimeSupplier: firstTime.raw || null,
      threeYearContract: threeYear.raw || null,
      region: cellStr(row[32]),
      discount: parseNumericCell(row[34]).value,
      paymentTerm: cellStr(row[35]),
      paymentTermDescription: cellStr(row[36]),
    },
  }
}

export function parseAberdareSpendReportFromRows(
  rows: unknown[][],
  sourceFileName = 'spend-report.xlsx',
): AberdareParseResult {
  const warnings: string[] = []
  if (rows.length < 2) {
    throw new Error('The workbook does not contain any data rows.')
  }

  let headerIndex = 0
  if (!headerMatches(rows[0])) {
    const found = rows.findIndex((r) => headerMatches(r))
    if (found < 0) {
      throw new Error(
        'Could not find the Aberdare spend-report header row (Company, Accred level, Vendor Code, Vendor Name, Amount Excl Vat).',
      )
    }
    headerIndex = found
    warnings.push(`Header row detected at spreadsheet row ${found + 1}.`)
  }

  const dataRows = rows.slice(headerIndex + 1).filter((r) => {
    if (!r || r.length === 0) return false
    return r.some((c) => c != null && String(c).trim() !== '')
  })

  const suppliers: AberdareSupplierRow[] = []
  let totalsRow: AberdareTotalsRow | null = null
  let runningSpend = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!
    const sourceRowNumber = headerIndex + 2 + i

    if (isAberdareTotalsRow(row, runningSpend)) {
      const amount = parseNumericCell(row[4]).value ?? 0
      totalsRow = {
        sourceRowNumber,
        amountExVat: amount,
        importSpendExemptValue: parseNumericCell(row[25]).value,
        localSpendExemptValue: parseNumericCell(row[27]).value,
        raw: Object.fromEntries(
          ABERDARE_COLUMN_HEADERS.map((h, idx) => [h, row[idx] ?? null]),
        ),
      }
      continue
    }

    // Skip trailing totals if already captured; never import as supplier "6".
    const company = cellStr(row[0])
    const vendorCode = cellStr(row[2])
    const vendorName = cellStr(row[3])
    if (
      (!company || company === '6') &&
      (!vendorCode || vendorCode === '6') &&
      (!vendorName || vendorName === '6') &&
      i === dataRows.length - 1
    ) {
      const amount = parseNumericCell(row[4]).value ?? 0
      totalsRow = {
        sourceRowNumber,
        amountExVat: amount,
        importSpendExemptValue: parseNumericCell(row[25]).value,
        localSpendExemptValue: parseNumericCell(row[27]).value,
        raw: Object.fromEntries(
          ABERDARE_COLUMN_HEADERS.map((h, idx) => [h, row[idx] ?? null]),
        ),
      }
      continue
    }

    const id = `aberdare-${String(sourceRowNumber).padStart(4, '0')}-${vendorCode || 'na'}`
    const supplier = normaliseAberdareSupplier(row, sourceRowNumber, id)
    runningSpend += supplier.amountExVat
    suppliers.push(supplier)
  }

  if (!totalsRow) {
    warnings.push(
      'No aggregate totals row was detected. Reconciliation uses supplier sums only.',
    )
  }

  const reconciliation = reconcileAberdareReport({ suppliers, totalsRow })
  for (const mismatch of reconciliation.mismatches) {
    warnings.push(mismatch)
  }

  const reportingEntities = [
    ...new Set(suppliers.map((s) => s.company).filter(Boolean)),
  ]

  return {
    suppliers,
    totalsRow,
    reconciliation,
    reportingEntities,
    sourceFileName,
    warnings,
  }
}
