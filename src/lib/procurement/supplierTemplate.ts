import * as XLSX from 'xlsx'

/**
 * The downloadable supplier list template. Every column is one the importer
 * matches on its own (tested), so a filled-in template uploads without any
 * column fixing. The single example row is marked as an example and is never
 * imported, even if it is left in.
 */

export const SUPPLIER_TEMPLATE_HEADERS = [
  'Supplier name',
  'Amount spent ex VAT (ZAR)',
  'B-BBEE level',
  'Certificate expiry date',
  'Black owned %',
  'Black women owned %',
  '51% black designated group (yes/no)',
  'Supplier type (EME, QSE or Generic)',
  '51% flow-through (yes/no)',
  'VAT number',
  'Company registration number',
] as const

export const SUPPLIER_TEMPLATE_EXAMPLE_ROW: (string | number)[] = [
  'EXAMPLE ROW – delete before you upload',
  125000,
  2,
  '2027-03-31',
  100,
  40,
  'no',
  'QSE',
  'no',
  '4123456789',
  '2015/123456/07',
]

/** Plain instructions, one per line, on the template's second sheet. */
export const SUPPLIER_TEMPLATE_NOTES: string[] = [
  'How to fill in the supplier list',
  'Put one supplier on each row of the Suppliers sheet. Delete the example row first (it is never imported).',
  'Supplier name and Amount spent ex VAT are needed for every supplier. Everything else helps the score and is optional.',
  'Amount spent: what was paid to the supplier in the year, without VAT, in rand. Numbers only, no R sign needed.',
  'B-BBEE level: 1 to 8 from the supplier’s certificate or affidavit, or Non-compliant. Leave it blank if you do not know it; the app will ask.',
  'Certificate expiry date: as on the certificate, for example 2027-03-31 or 31/03/2027. Expired certificates are shown to you before the score is final.',
  'Black owned % and Black women owned %: the percentages on the certificate. 51% or more black owned, and 30% or more black women owned, count.',
  'Black designated group, flow-through: yes or no.',
  'Supplier type: EME (turnover up to R10 million), QSE (R10 million to R50 million) or Generic (above R50 million).',
  'VAT and registration numbers help the app find the same supplier listed twice.',
  'Save as Excel (.xlsx) or as CSV, then upload it on the procurement scorecard page.',
]

export const SUPPLIER_TEMPLATE_FILENAME = 'procurement-supplier-list-template'

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** UTF-8 CSV with a byte-order mark, so Excel opens accented names correctly. */
export function supplierTemplateCsv(): string {
  const lines = [SUPPLIER_TEMPLATE_HEADERS.map(csvCell).join(','), SUPPLIER_TEMPLATE_EXAMPLE_ROW.map(csvCell).join(',')]
  return `﻿${lines.join('\r\n')}\r\n`
}

export function supplierTemplateXlsx(): Buffer {
  const book = XLSX.utils.book_new()
  const suppliers = XLSX.utils.aoa_to_sheet([[...SUPPLIER_TEMPLATE_HEADERS], SUPPLIER_TEMPLATE_EXAMPLE_ROW])
  suppliers['!cols'] = SUPPLIER_TEMPLATE_HEADERS.map((header, index) => ({ wch: index === 0 ? 40 : Math.max(14, header.length + 2) }))
  XLSX.utils.book_append_sheet(book, suppliers, 'Suppliers')
  const notes = XLSX.utils.aoa_to_sheet(SUPPLIER_TEMPLATE_NOTES.map((line) => [line]))
  notes['!cols'] = [{ wch: 110 }]
  XLSX.utils.book_append_sheet(book, notes, 'How to fill this in')
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
