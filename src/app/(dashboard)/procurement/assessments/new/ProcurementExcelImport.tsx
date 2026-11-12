'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { formatCurrencyZar } from '@/lib/procurement/format'
import { buildSuppliersFromMappedSheet } from '@/lib/procurement/excel/buildSuppliers'
import {
  PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS,
  PROCUREMENT_EXCEL_NO_REGISTER_GENERIC_WORKBOOK,
  PROCUREMENT_EXCEL_NO_REGISTER_WITH_PROCUREMENT_OR_TMPS_CONTEXT,
  PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER,
} from '@/lib/procurement/excel/constants'
import type {
  ProcurementExcelColumnMapping,
  ProcurementExcelMappedField,
  ProcurementExcelParseSuccess,
} from '@/lib/procurement/excel/types'
import {
  PROCUREMENT_EXCEL_FIELD_META,
  PROCUREMENT_EXCEL_MAPPED_FIELDS,
  PROCUREMENT_EXCEL_REQUIRED_FIELDS,
} from '@/lib/procurement/excel/types'
import { procurementExcelParseAction } from './excelParseAction'
import { PROCUREMENT_UPLOAD_MAX_BYTES, formatMegabytes } from '@/lib/procurement/uploadLimits'
import type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { Notice } from '@/components/ui/Notice'
import { MoreOptions } from '@/components/ui/Card'
import { createSupplierRowId } from './SuppliersTable'

/** Plain names for the matched columns, as shown on the confirm step. */
const FIELD_PLAIN_NAME: Record<ProcurementExcelMappedField, string> = {
  supplier_name: 'Supplier name',
  spend_amount: 'Amount spent',
  bbb_level: 'B-BBEE level',
  black_ownership: 'Black ownership',
  black_women_ownership: 'Black women ownership',
  bdgs_51: 'Black designated group',
  flow_through: '51% flow-through',
  procurement_recognition: 'Recognition % (shown only; the level decides)',
  supplier_type: 'Supplier type (EME, QSE)',
  vat_number: 'VAT number',
  company_registration: 'Registration number',
  certificate_expiry: 'Certificate expiry date',
}

/** What each column should hold, with an example: shown under its column choice. */
const FIELD_HINT: Record<ProcurementExcelMappedField, string> = {
  supplier_name: 'The supplier’s name, for example a column called “Vendor Name”.',
  spend_amount: 'What was spent with the supplier in the year, without VAT, for example “Amount Excl VAT”.',
  bbb_level:
    'The level from the supplier’s B-BBEE certificate or sworn affidavit: 1 to 8, “Level 2” or Non-compliant. A blank or unreadable cell is listed under Needs attention.',
  black_ownership: 'Yes/no, or a percentage. “Yes”, or 51% and above, counts as at least 51% black owned.',
  black_women_ownership: 'Yes/no, or a percentage. “Yes”, or 30% and above, counts as at least 30% black women owned.',
  bdgs_51: 'Yes/no, or a percentage. “Yes”, or 51% and above, counts as at least 51% owned by a black designated group.',
  flow_through: 'Yes, Y, True or 1 turns 51% flow-through on; No, N, False, 0 or blank leaves it off.',
  procurement_recognition: 'Shown for reference only. The level decides how much of the spend counts.',
  supplier_type: 'EME or QSE. Anything else, or a blank, is treated as Generic (a large company).',
  vat_number: 'Used to spot a supplier listed twice, for example 4123456789.',
  company_registration: 'Used to spot a supplier listed twice, for example 2001/123456/07.',
  certificate_expiry: 'The expiry date on the certificate, for example 2025-08-31. Used to flag expired certificates.',
}

function toFormRows(suppliers: ReturnType<typeof buildSuppliersFromMappedSheet>['suppliers']): SupplierFormRow[] {
  return suppliers.map((s) => ({
    id: createSupplierRowId(),
    supplier_name: s.supplier_name,
    supplier_code: '',
    vat_number: s.vat_number ?? '',
    company_registration: s.company_registration ?? '',
    bo_etc: '',
    fts: '',
    des: '',
    prop: '',
    supplier_type: s.supplier_type,
    level: s.level,
    value_ex_vat: s.value_ex_vat,
    is_51_black_owned: s.is_51_black_owned,
    is_30_black_women_owned: s.is_30_black_women_owned,
    is_51_bdgs: s.is_51_bdgs,
    is_51_percent_flow_through: !!s.is_51_percent_flow_through,
    expiry: s.expiry ?? '',
    empower: '',
  }))
}

function mappedColumn(mapping: ProcurementExcelColumnMapping, field: ProcurementExcelMappedField, headers: string[]): string {
  const v = mapping[field]
  return v && headers.includes(v) ? v : ''
}

interface ProcurementExcelImportProps {
  onApplySuppliers: (rows: SupplierFormRow[], meta: { workbookName: string; sheetName: string }) => void
  /** Shown when suppliers are already in the list: uploading replaces them. */
  replacing?: boolean
}

/**
 * Upload a supplier list (Excel or CSV), then confirm it in plain words:
 * how many suppliers, how much spend, and which column was used for what,
 * with a way to fix a wrong column before the suppliers are used.
 */
export function ProcurementExcelImport({ onApplySuppliers, replacing = false }: ProcurementExcelImportProps) {
  const [isPending, startTransition] = useTransition()
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ProcurementExcelParseSuccess | null>(null)
  const [mapping, setMapping] = useState<ProcurementExcelColumnMapping>({})
  const [fixingColumns, setFixingColumns] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)

  const reset = useCallback(() => {
    fileRef.current = null
    setFileName(null)
    setParseError(null)
    setParsed(null)
    setMapping({})
    setFixingColumns(false)
  }, [])

  const runParse = useCallback((file: File, preferredSheet: string | null) => {
    setParseError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('file', file)
      if (preferredSheet) fd.set('preferred_sheet', preferredSheet)
      try {
        const res = await procurementExcelParseAction(fd)
        if (!res.ok) {
          setParsed(null)
          setParseError(res.issues.map((i) => i.message).join(' '))
          return
        }
        setParsed(res.data)
        setMapping({ ...res.data.autoMapping })
      } catch {
        setParsed(null)
        setParseError('The list could not be read just now. Check your connection and try again.')
      }
    })
  }, [])

  const onFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      if (file.size > PROCUREMENT_UPLOAD_MAX_BYTES) {
        setParseError(
          `“${file.name}” is ${formatMegabytes(file.size)}; the most that can be uploaded is ${formatMegabytes(PROCUREMENT_UPLOAD_MAX_BYTES)}. Remove other sheets or pictures, or save just the supplier list as CSV.`,
        )
        return
      }
      fileRef.current = file
      setFileName(file.name)
      setParsed(null)
      setMapping({})
      setFixingColumns(false)
      runParse(file, null)
    },
    [runParse],
  )

  const blocked = Boolean(parsed?.supplierImportBlockedReason)
  const headers = useMemo(() => parsed?.columnHeaders ?? [], [parsed])

  const built = useMemo(() => {
    if (!parsed || blocked) return null
    return buildSuppliersFromMappedSheet({ headers, dataRows: parsed.dataRows, mapping, keepProblemsForReview: true })
  }, [parsed, blocked, headers, mapping])

  const missingRequired = PROCUREMENT_EXCEL_REQUIRED_FIELDS.filter((f) => !mappedColumn(mapping, f, headers))
  const supplierCount = built?.suppliers.length ?? 0
  const totalSpend = built?.suppliers.reduce((sum, s) => sum + s.value_ex_vat, 0) ?? 0
  const canUse = !blocked && missingRequired.length === 0 && supplierCount > 0
  const matched = PROCUREMENT_EXCEL_MAPPED_FIELDS.filter((f) => mappedColumn(mapping, f, headers))
  const notInFile = PROCUREMENT_EXCEL_MAPPED_FIELDS.filter(
    (f) => !mappedColumn(mapping, f, headers) && f !== 'procurement_recognition',
  )
  const pickableHeaders = headers.filter((h) => h.trim())

  const emptyGuidance =
    built && supplierCount === 0 && missingRequired.length === 0
      ? built.emptyImportKind === 'header_only'
        ? PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS
        : built.emptyImportKind === 'category_template'
          ? PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER
          : 'No suppliers could be read with these columns. Check that the amount column holds numbers.'
      : null

  const apply = () => {
    if (!built || !parsed || !canUse) return
    onApplySuppliers(toFormRows(built.suppliers), {
      workbookName: parsed.workbookName,
      sheetName: parsed.selectedSheetName ?? '',
    })
    reset()
  }

  return (
    <div className="space-y-4" data-help="procurement-form-upload">
      {!parsed ? (
        <>
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-line-strong bg-sunken px-4 py-8 text-center transition focus-within:ring-[3px] focus-within:ring-brand/30 hover:border-brand ${
              isPending ? 'cursor-wait' : ''
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              aria-describedby="procurement-upload-hint"
              className="sr-only"
              disabled={isPending}
              onChange={(e) => {
                onFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {isPending ? <Loader2 className="h-8 w-8 animate-spin text-teal" aria-hidden /> : <Upload className="h-8 w-8 text-faint" aria-hidden />}
            <span className="mt-3 text-body font-semibold text-ink">
              {isPending ? `Reading ${fileName ?? 'your list'}…` : replacing ? 'Upload a different supplier list' : 'Upload the supplier list'}
            </span>
            <span className="mt-1 text-body text-label">
              Excel (.xlsx, .xls) or CSV, up to {formatMegabytes(PROCUREMENT_UPLOAD_MAX_BYTES)}
            </span>
            <span id="procurement-upload-hint" className="mt-1 max-w-[52ch] text-meta text-label">
              One row per supplier, such as the client’s purchases or creditors report for the year. The supplier name and the
              amount without VAT are needed; the level, ownership and certificate expiry are used when they are there.
            </span>
          </label>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body text-label">
            <span>No list yet? Start from the template:</span>
            <a href="/api/procurement/supplier-template" download className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-teal hover:underline sm:min-h-0">
              <Download className="h-4 w-4" aria-hidden /> Excel template
            </a>
            <a
              href="/api/procurement/supplier-template?format=csv"
              download
              className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-teal hover:underline sm:min-h-0"
            >
              <Download className="h-4 w-4" aria-hidden /> CSV template
            </a>
          </p>
        </>
      ) : null}

      {parseError ? (
        <Notice tone="bad" title="That supplier list could not be used">
          {parseError}
        </Notice>
      ) : null}

      {parsed && blocked ? (
        <Notice
          tone="warn"
          title={`No supplier list found in “${parsed.workbookName}”`}
          action={
            <button type="button" onClick={reset} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              Upload a different list
            </button>
          }
        >
          {parsed.supplierImportBlockedWorkbookContext === 'procurement_or_tmps'
            ? PROCUREMENT_EXCEL_NO_REGISTER_WITH_PROCUREMENT_OR_TMPS_CONTEXT
            : PROCUREMENT_EXCEL_NO_REGISTER_GENERIC_WORKBOOK}
        </Notice>
      ) : null}

      {parsed && !blocked ? (
        <div className="space-y-4 rounded-card border border-line bg-surface p-4 sm:p-5" aria-live="polite">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-1 h-5 w-5 shrink-0 text-teal" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-section font-semibold text-ink">
                {supplierCount > 0
                  ? `We found ${supplierCount.toLocaleString('en-ZA')} supplier${supplierCount === 1 ? '' : 's'}`
                  : 'We found no suppliers yet'}
              </p>
              {supplierCount > 0 ? (
                <p className="break-words text-body text-ink">
                  spending <strong className="tabular-nums">{formatCurrencyZar(totalSpend)}</strong> in total
                  {parsed.selectedSheetName ? `, on the sheet “${parsed.selectedSheetName}”` : ''} of {parsed.workbookName}.
                </p>
              ) : null}
              {built && built.skippedRows > 0 ? (
                <p className="text-body text-label">
                  {built.skippedRows} row{built.skippedRows === 1 ? ' was' : 's were'} left out (blank names, totals or
                  headings). Details are under “Notes about this list”.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-body font-semibold text-ink">Is this right? These are the columns we used</h3>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {matched.map((field) => (
                <div key={field} className="min-w-0">
                  <dt className="text-meta text-label">{FIELD_PLAIN_NAME[field]}</dt>
                  <dd className="break-words text-body font-medium text-ink">“{mappedColumn(mapping, field, headers)}”</dd>
                </div>
              ))}
            </dl>
            {notInFile.length > 0 ? (
              <p className="text-body text-label">
                Not in your list: {notInFile.map((f) => FIELD_PLAIN_NAME[f]).join(', ')}.
                {notInFile.includes('bbb_level') ? ' Without a level column every supplier will be listed under Needs attention.' : ''}
              </p>
            ) : null}
            <button
              type="button"
              aria-expanded={fixingColumns || missingRequired.length > 0}
              aria-controls="procurement-column-fixer"
              onClick={() => setFixingColumns((v) => !v)}
              className={buttonStyles({ variant: 'ghost', size: 'sm', className: '-ml-3' })}
            >
              {fixingColumns ? 'Done fixing columns' : 'Fix a column'}
            </button>
          </div>

          <div id="procurement-column-fixer" hidden={!fixingColumns && missingRequired.length === 0} className="space-y-3">
            {missingRequired.length > 0 ? (
              <Notice tone="warn" title="Choose the missing columns">
                We could not tell which column holds: {missingRequired.map((f) => FIELD_PLAIN_NAME[f]).join(' and ')}.
              </Notice>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {PROCUREMENT_EXCEL_MAPPED_FIELDS.map((field) => (
                <label key={field} className="block text-body font-medium text-ink" htmlFor={`map-${field}`}>
                  {FIELD_PLAIN_NAME[field]}
                  {PROCUREMENT_EXCEL_FIELD_META[field].required ? <span className="text-bad"> (needed)</span> : null}
                  <select
                    id={`map-${field}`}
                    aria-describedby={`map-${field}-hint`}
                    value={mappedColumn(mapping, field, headers)}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value || null }))}
                    className="mt-1 block w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-body text-ink"
                  >
                    <option value="">{PROCUREMENT_EXCEL_FIELD_META[field].required ? 'Choose a column' : 'Not in my list'}</option>
                    {pickableHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span id={`map-${field}-hint`} className="mt-1 block text-meta font-normal text-label">
                    {FIELD_HINT[field]}
                  </span>
                </label>
              ))}
            </div>
            {parsed.sheetNames.length > 1 ? (
              <label className="block text-body font-medium text-ink" htmlFor="procurement-sheet-choice">
                Sheet with the suppliers
                <select
                  id="procurement-sheet-choice"
                  aria-describedby="procurement-sheet-choice-hint"
                  value={parsed.selectedSheetName ?? ''}
                  disabled={isPending}
                  onChange={(e) => fileRef.current && runParse(fileRef.current, e.target.value || null)}
                  className="mt-1 block w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-body text-ink sm:max-w-md"
                >
                  {parsed.sheetNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span id="procurement-sheet-choice-hint" className="mt-1 block text-meta font-normal text-label">
                  The sheet with one row per supplier. Choosing another sheet reads the file again.
                </span>
              </label>
            ) : null}
          </div>

          {emptyGuidance ? <Notice tone="warn">{emptyGuidance}</Notice> : null}

          {parsed.issues.some((issue) => issue.level !== 'info') || (built?.rowWarnings.length ?? 0) > 0 || parsed.suggestedTmpsTotal != null ? (
            <MoreOptions label="Notes about this list">
              <ul className="list-disc space-y-1 pl-5 text-body text-ink">
                {parsed.issues
                  .filter((issue) => issue.level !== 'info')
                  .map((issue, i) => (
                    <li key={`p-${i}`}>{issue.message}</li>
                  ))}
                {built?.rowWarnings.slice(0, 50).map((w, i) => <li key={`w-${i}`}>{w}</li>)}
                {built && built.rowWarnings.length > 50 ? <li>…and {built.rowWarnings.length - 50} more.</li> : null}
              </ul>
              {parsed.suggestedTmpsTotal != null ? (
                <p className="text-meta text-label">
                  The upload also seems to hold a total spend figure of {formatCurrencyZar(parsed.suggestedTmpsTotal)}. It is not
                  used automatically; you set the total spend in a later step.
                </p>
              ) : null}
            </MoreOptions>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={reset} className={buttonStyles({ variant: 'secondary' })}>
              Upload a different list
            </button>
            <button type="button" onClick={apply} disabled={!canUse || isPending} className={buttonStyles({ variant: 'primary' })}>
              {supplierCount > 0 ? `Use these ${supplierCount.toLocaleString('en-ZA')} suppliers` : 'Use these suppliers'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
