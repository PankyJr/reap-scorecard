import { buildSuppliersFromMappedSheet } from '../../procurement/excel/buildSuppliers'
import { parseProcurementExcelBuffer } from '../../procurement/excel/parseProcurementWorkbook'
import {
  PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS,
  PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER,
  PROCUREMENT_EXCEL_NO_SUPPLIERS_MAPPING_OR_SPEND,
} from '../../procurement/excel/constants'
import type { ScorecardProcurementPreview } from '../types'

function formatZar(n: number): string {
  return n.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 })
}

/**
 * Procurement supplier register for full-scorecard workbooks: reuses the procurement
 * supplier-register parser with an explicit tab (does not change procurement-only upload).
 */
export function parseProcurementForFullScorecard(args: {
  buffer: Buffer
  filename: string
  procurementSheetName: string
}): ScorecardProcurementPreview {
  const { buffer, filename, procurementSheetName } = args
  const res = parseProcurementExcelBuffer({
    buffer,
    filename,
    preferredSheet: procurementSheetName,
  })

  if (!res.ok) {
    return {
      sheetName: procurementSheetName,
      supplierRowCount: 0,
      totalSpendZar: null,
      totalSpendDisplay: null,
      message: res.issues.map((i) => i.message).join(' '),
      sampleSuppliers: [],
    }
  }

  const built = buildSuppliersFromMappedSheet({
    headers: res.columnHeaders,
    dataRows: res.dataRows,
    mapping: res.autoMapping,
  })

  const total = built.suppliers.reduce((s, r) => s + r.value_ex_vat, 0)
  const sampleSuppliers = built.suppliers.slice(0, 8).map((s) => ({
    name: s.supplier_name,
    spendDisplay: formatZar(s.value_ex_vat),
  }))

  let message: string | null = null
  if (res.columnHeaders.length > 0 && res.dataRows.length === 0) {
    message = PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS
  } else if (built.suppliers.length === 0 && res.dataRows.length > 0) {
    if (built.emptyImportKind === 'category_template' || built.emptyImportKind === 'header_only') {
      message = PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER
    } else if (built.emptyImportKind === 'needs_mapping') {
      message = PROCUREMENT_EXCEL_NO_SUPPLIERS_MAPPING_OR_SPEND
    }
  }

  return {
    sheetName: res.selectedSheetName ?? procurementSheetName,
    supplierRowCount: built.suppliers.length,
    totalSpendZar: built.suppliers.length ? total : null,
    totalSpendDisplay: built.suppliers.length ? formatZar(total) : null,
    message,
    sampleSuppliers,
  }
}
