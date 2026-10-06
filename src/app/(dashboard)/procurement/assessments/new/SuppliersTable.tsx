'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { calculateSupplierRow, type ProcurementSupplierWithCalculated } from '@/lib/procurement/rows'
import { formatCurrency } from '@/lib/procurement/format'
import type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { MoreOptions } from '@/components/ui/Panel'
import { normalizeFlowThroughValue } from '@/lib/procurement/flowThrough'
import { parseRecognitionLevelForReview } from '@/lib/procurement/excel/buildSuppliers'
import { hasKnownLevel } from '@/lib/procurement/needsAttention'

export type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'

interface SuppliersTableProps {
  rows: SupplierFormRow[]
  /** Accepts an updater, so one row can change without rebuilding the others. */
  onChangeRows: Dispatch<SetStateAction<SupplierFormRow[]>>
}

let rowSequence = 0
export function createSupplierRowId() {
  rowSequence += 1
  return `${Date.now().toString(36)}-${rowSequence.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptySupplierFormRow(): SupplierFormRow {
  return {
    id: createSupplierRowId(),
    supplier_name: '',
    supplier_code: '',
    vat_number: '',
    company_registration: '',
    bo_etc: '',
    fts: '',
    des: '',
    prop: '',
    supplier_type: 'Generic',
    level: '',
    value_ex_vat: 0,
    is_51_black_owned: false,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    is_51_percent_flow_through: false,
    expiry: '',
    empower: '',
  }
}

const BULK_PASTE_COLUMN_REFERENCE: { n: number; label: string; hint?: string }[] = [
  { n: 1, label: 'Supplier name', hint: 'needed' },
  { n: 2, label: 'Spend ex VAT', hint: 'needed' },
  { n: 3, label: 'Type', hint: 'EME, QSE or Generic' },
  { n: 4, label: 'Level', hint: '1 to 8, or Non-compliant' },
  { n: 5, label: 'Black owned', hint: 'yes or no' },
  { n: 6, label: 'Black women owned', hint: 'yes or no' },
  { n: 7, label: 'Designated group', hint: 'yes or no' },
  { n: 8, label: 'Code' },
  { n: 9, label: 'VAT number' },
  { n: 10, label: 'Registration number' },
  { n: 11, label: 'BO etc' },
  { n: 12, label: 'FTS' },
  { n: 13, label: 'DES' },
  { n: 14, label: 'PROP' },
  { n: 15, label: 'Certificate expiry', hint: 'YYYY-MM-DD' },
  { n: 16, label: 'Notes' },
  { n: 17, label: '51% flow-through', hint: 'yes or no' },
]

function parseBooleanFlag(value: string): boolean {
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase())
}

/** Spreadsheet paste (Excel / Google Sheets) uses tab between columns. */
function splitLineIntoCells(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
  return parseCsvLine(line)
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

/** Accepts plain numbers and common spreadsheet formats (spaces, thousand commas). */
function parseSpendCell(raw: string): number {
  const t = raw.trim().replace(/ /g, ' ').replace(/\s/g, '').replace(/,/g, '')
  if (t === '' || t === '-') return 0
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

const HEADER_NAME_HINTS = new Set(['supplier name', 'name', 'supplier', 'company', 'vendor', 'description'])
const HEADER_SPEND_HINTS = new Set(['b-bbee spend', 'bbee spend', 'spend', 'amount', 'value', 'ex-vat', 'ex vat', 'value ex vat', 'total', 'rand'])

function isLikelyHeaderRow(cols: string[]): boolean {
  if (cols.length < 2) return false
  const a = (cols[0] ?? '').trim().toLowerCase()
  const b = (cols[1] ?? '').trim().toLowerCase()
  const looksName = HEADER_NAME_HINTS.has(a) || (a.includes('supplier') && a.includes('name'))
  const looksSpend = HEADER_SPEND_HINTS.has(b) || b.includes('spend') || b.includes('amount')
  return looksName && looksSpend
}

type BulkImportResult = {
  rows: SupplierFormRow[]
  skippedBlankLines: number
  skippedHeaderRows: number
  warnings: string[]
}

/**
 * Rows pasted from a spreadsheet. A zero or negative amount and a blank or
 * unknown level are kept and shown under "Needs attention", as for an upload.
 */
export function parseBulkSuppliers(text: string): BulkImportResult {
  const warnings: string[] = []
  let skippedBlankLines = 0
  let skippedHeaderRows = 0
  const parsedRows: SupplierFormRow[] = []
  const lines = text.split(/\r\n|\n|\r/)

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const trimmed = lines[lineIndex].trim()
    if (!trimmed) {
      skippedBlankLines++
      continue
    }
    const cols = splitLineIntoCells(trimmed)
    if (isLikelyHeaderRow(cols)) {
      skippedHeaderRows++
      continue
    }
    const supplierName = (cols[0] ?? '').trim()
    const short = `${supplierName.slice(0, 40)}${supplierName.length > 40 ? '…' : ''}`
    if (!supplierName) {
      warnings.push(`Line ${lineIndex + 1}: not added, the first column (supplier name) is empty.`)
      continue
    }
    const spend = parseSpendCell(cols[1] ?? '')
    if (Number.isNaN(spend)) {
      warnings.push(`Line ${lineIndex + 1} (“${short}”): not added, the amount in the second column is not a number.`)
      continue
    }
    const typeRaw = (cols[2] ?? 'Generic').trim().toUpperCase()
    const flowThrough = normalizeFlowThroughValue(cols[16] ?? '')
    if (flowThrough.warning) warnings.push(`Line ${lineIndex + 1} (“${short}”): ${flowThrough.warning}`)
    parsedRows.push({
      ...emptySupplierFormRow(),
      supplier_name: supplierName,
      value_ex_vat: spend,
      supplier_type: typeRaw === 'EME' || typeRaw === 'QSE' ? typeRaw : 'Generic',
      level: parseRecognitionLevelForReview(cols[3] ?? ''),
      is_51_black_owned: parseBooleanFlag(cols[4] ?? ''),
      is_30_black_women_owned: parseBooleanFlag(cols[5] ?? ''),
      is_51_bdgs: parseBooleanFlag(cols[6] ?? ''),
      is_51_percent_flow_through: flowThrough.value,
      supplier_code: cols[7] ?? '',
      vat_number: cols[8] ?? '',
      company_registration: cols[9] ?? '',
      bo_etc: cols[10] ?? '',
      fts: cols[11] ?? '',
      des: cols[12] ?? '',
      prop: cols[13] ?? '',
      expiry: /^\d{4}-\d{2}-\d{2}$/.test(cols[14] ?? '') ? (cols[14] as string) : '',
      empower: cols[15] ?? '',
    })
  }
  return { rows: parsedRows, skippedBlankLines, skippedHeaderRows, warnings }
}

function describeBuckets(row: ProcurementSupplierWithCalculated): string {
  const buckets: string[] = []
  if (row.bbbee_spend > 0) buckets.push('B-BBEE spend')
  if (row.eme_amount > 0) buckets.push('EME')
  if (row.qse_amount > 0) buckets.push('QSE')
  if (row.black_owned_amount > 0) buckets.push('51% black owned')
  if (row.black_women_amount > 0) buckets.push('30% black women owned')
  if (row.bdgs_amount > 0) buckets.push('51% black designated group')
  if (row.is_51_percent_flow_through) buckets.push('51% flow-through (+20%)')
  return buckets.join(' · ') || 'Counts towards nothing'
}

export const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not given (counts as nothing)' },
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' },
  { value: '5', label: 'Level 5' },
  { value: '6', label: 'Level 6' },
  { value: '7', label: 'Level 7' },
  { value: '8', label: 'Level 8' },
  { value: 'Non-Compliant', label: 'Non-compliant' },
]

/** Cards per page. Only the visible page is rendered, so 8,000 suppliers stay fast. */
export const SUPPLIER_PAGE_SIZE = 50

/** Lists longer than this start with every card folded to its summary line. */
const SUPPLIER_AUTO_COLLAPSE_THRESHOLD = 15

const fieldClass =
  'w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20'

function Field({ label, htmlFor, children, wide }: { label: string; htmlFor: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  )
}

type RowCardProps = {
  row: SupplierFormRow
  index: number
  expanded: boolean
  onToggle: (id: string) => void
  onUpdate: (id: string, patch: Partial<SupplierFormRow>) => void
  onRemove: (id: string) => void
}

/** One supplier. Memoised: typing in one card does not re-render the others. */
const SupplierRowCard = memo(function SupplierRowCard({ row, index, expanded, onToggle, onUpdate, onRemove }: RowCardProps) {
  const [spendDraft, setSpendDraft] = useState<string | null>(null)
  const calc = useMemo(
    () => calculateSupplierRow({ ...row, value_ex_vat: Number(row.value_ex_vat) || 0 }),
    [row],
  )
  const title = row.supplier_name?.trim() || `Supplier ${index + 1}`
  const id = `supplier-${row.id}`
  const levelMissing = !hasKnownLevel(row.level)

  return (
    <li className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(row.id)}
          aria-expanded={expanded}
          aria-controls={`${id}-details`}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-control text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30"
        >
          <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-ink">
              {index + 1}. {title}
            </span>
            <span className="mt-0.5 block text-sm text-muted">
              Spend {formatCurrency(Number(row.value_ex_vat) || 0)} ·{' '}
              {levelMissing ? (
                <span className="font-semibold text-warn">no level</span>
              ) : (
                `${(calc.recognition_percent * 100).toFixed(0)}% recognised`
              )}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className={buttonStyles({ variant: 'ghost', size: 'xs', className: 'text-bad hover:bg-bad-soft' })}
          aria-label={`Remove ${title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Remove</span>
        </button>
      </div>

      {expanded ? (
        <div id={`${id}-details`} className="mt-4 space-y-4 border-t border-line pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Supplier name" htmlFor={`${id}-name`} wide>
              <input
                id={`${id}-name`}
                value={row.supplier_name}
                onChange={(e) => onUpdate(row.id, { supplier_name: e.target.value })}
                className={fieldClass}
                autoComplete="off"
              />
            </Field>
            <Field label="Spend ex VAT (R)" htmlFor={`${id}-spend`}>
              <input
                id={`${id}-spend`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={spendDraft ?? (row.value_ex_vat === 0 ? '' : String(row.value_ex_vat))}
                onChange={(e) => {
                  const raw = e.target.value
                  setSpendDraft(raw)
                  const n = parseFloat(raw.replace(/[,\s]/g, ''))
                  onUpdate(row.id, { value_ex_vat: raw === '' || raw === '.' || !Number.isFinite(n) ? 0 : n })
                }}
                onBlur={() => setSpendDraft(null)}
                className={`${fieldClass} text-right tabular-nums`}
              />
            </Field>
            <Field label="B-BBEE level" htmlFor={`${id}-level`}>
              <select
                id={`${id}-level`}
                value={hasKnownLevel(row.level) ? row.level : ''}
                onChange={(e) => onUpdate(row.id, { level: e.target.value })}
                className={fieldClass}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value || 'missing'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Certificate expiry" htmlFor={`${id}-expiry`}>
              <input
                id={`${id}-expiry`}
                type="date"
                value={row.expiry ?? ''}
                onChange={(e) => onUpdate(row.id, { expiry: e.target.value })}
                className={fieldClass}
              />
            </Field>
            <Field label="Supplier type" htmlFor={`${id}-type`}>
              <select
                id={`${id}-type`}
                value={row.supplier_type}
                onChange={(e) => onUpdate(row.id, { supplier_type: e.target.value as SupplierFormRow['supplier_type'] })}
                className={fieldClass}
              >
                <option value="Generic">Generic (turnover above R50 million)</option>
                <option value="QSE">QSE (R10 million to R50 million)</option>
                <option value="EME">EME (up to R10 million)</option>
              </select>
            </Field>
          </div>

          <fieldset className="rounded-control border border-line bg-sunken p-3">
            <legend className="px-1 text-sm font-semibold text-ink">Ownership</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ['is_51_black_owned', 'At least 51% black owned'],
                  ['is_30_black_women_owned', 'At least 30% black women owned'],
                  ['is_51_bdgs', 'At least 51% owned by a black designated group'],
                  ['is_51_percent_flow_through', '51% flow-through (counts 1.2 times)'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-control bg-surface px-3 py-2 text-[15px] text-ink">
                  <input
                    type="checkbox"
                    checked={Boolean(row[key])}
                    onChange={(e) => onUpdate(row.id, { [key]: e.target.checked } as Partial<SupplierFormRow>)}
                    className="h-4 w-4 rounded border-line-strong"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <MoreOptions label="Identifiers and notes">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ['vat_number', 'VAT number'],
                  ['company_registration', 'Registration number'],
                  ['supplier_code', 'Supplier code'],
                  ['bo_etc', 'BO etc'],
                  ['fts', 'FTS'],
                  ['des', 'DES'],
                  ['prop', 'PROP'],
                  ['empower', 'Notes'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`${id}-${key}`}>
                  <input
                    id={`${id}-${key}`}
                    value={row[key] ?? ''}
                    onChange={(e) => onUpdate(row.id, { [key]: e.target.value } as Partial<SupplierFormRow>)}
                    className={fieldClass}
                    autoComplete="off"
                  />
                </Field>
              ))}
            </div>
          </MoreOptions>

          <p className="text-sm text-muted">
            Recognised spend <strong className="tabular-nums text-ink">{formatCurrency(calc.bbbee_spend)}</strong> ·{' '}
            {describeBuckets(calc)}
          </p>
        </div>
      ) : null}
    </li>
  )
})

export function SuppliersTable({ rows, onChangeRows }: SuppliersTableProps) {
  const [bulkText, setBulkText] = useState('')
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkInfo, setBulkInfo] = useState<string | null>(null)
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    rows.length > SUPPLIER_AUTO_COLLAPSE_THRESHOLD ? new Set() : new Set(rows.map((r) => r.id)),
  )

  const filteredIndices = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const out: number[] = []
    for (let i = 0; i < rows.length; i++) {
      if (!q) {
        out.push(i)
        continue
      }
      const row = rows[i]
      if ((row.supplier_name ?? '').toLowerCase().includes(q) || (row.supplier_code ?? '').toLowerCase().includes(q)) out.push(i)
    }
    return out
  }, [rows, filter])

  const pageCount = Math.max(1, Math.ceil(filteredIndices.length / SUPPLIER_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pagedIndices = filteredIndices.slice(currentPage * SUPPLIER_PAGE_SIZE, (currentPage + 1) * SUPPLIER_PAGE_SIZE)

  const updateRow = useCallback(
    (id: string, patch: Partial<SupplierFormRow>) => {
      onChangeRows((prev) => {
        const index = prev.findIndex((r) => r.id === id)
        if (index < 0) return prev
        const next = prev.slice()
        next[index] = { ...prev[index], ...patch }
        return next
      })
    },
    [onChangeRows],
  )

  const removeRow = useCallback(
    (id: string) => {
      onChangeRows((prev) => prev.filter((r) => r.id !== id))
    },
    [onChangeRows],
  )

  const toggleRow = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const addRow = () => {
    const row = emptySupplierFormRow()
    onChangeRows((prev) => [...prev, row])
    setExpanded((prev) => new Set(prev).add(row.id))
    setFilter('')
    setPage(Math.floor(rows.length / SUPPLIER_PAGE_SIZE))
  }

  const appendBulkRows = () => {
    setBulkError(null)
    setBulkInfo(null)
    setBulkWarnings([])
    const result = parseBulkSuppliers(bulkText)
    if (!result.rows.length) {
      setBulkError('No suppliers were found. Each line needs a supplier name in the first column and an amount in the second.')
      setBulkWarnings(result.warnings.slice(0, 20))
      return
    }
    onChangeRows((prev) => [...prev, ...result.rows])
    setBulkText('')
    const parts = [`Added ${result.rows.length} supplier${result.rows.length === 1 ? '' : 's'}.`]
    if (result.skippedHeaderRows > 0) parts.push('The heading row was left out.')
    if (result.warnings.length > 0) parts.push(`${result.warnings.length} line${result.warnings.length === 1 ? ' was' : 's were'} not added; see below.`)
    setBulkWarnings(result.warnings.slice(0, 20))
    setBulkInfo(parts.join(' '))
  }

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <div id="procurement-supplier-find-anchor" className="scroll-mt-28 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="block min-w-0 flex-1" htmlFor="supplier-row-filter">
              <span className="text-sm font-semibold text-ink">Find a supplier</span>
              <input
                id="supplier-row-filter"
                type="search"
                enterKeyHint="search"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value)
                  setPage(0)
                }}
                placeholder="Name or code"
                className={`mt-1.5 ${fieldClass}`}
              />
            </label>
            {filteredIndices.length > SUPPLIER_PAGE_SIZE ? (
              <nav aria-label="Supplier pages" className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 0}
                  onClick={() => setPage(Math.max(0, currentPage - 1))}
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
                </button>
                <span className="text-sm tabular-nums text-muted">
                  Page {currentPage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </nav>
            ) : null}
          </div>
          <p className="text-sm text-muted" aria-live="polite">
            {filteredIndices.length === 0
              ? `No supplier matches “${filter.trim()}”. Clear the search to see them all.`
              : `Showing ${currentPage * SUPPLIER_PAGE_SIZE + 1} to ${Math.min(filteredIndices.length, (currentPage + 1) * SUPPLIER_PAGE_SIZE)} of ${filteredIndices.length}${filter.trim() ? ' matching' : ''} suppliers. Open a supplier to change it.`}
          </p>
          <ul className="space-y-3">
            {pagedIndices.map((i) => (
              <SupplierRowCard
                key={rows[i].id}
                row={rows[i]}
                index={i}
                expanded={expanded.has(rows[i].id)}
                onToggle={toggleRow}
                onUpdate={updateRow}
                onRemove={removeRow}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addRow} className={buttonStyles({ variant: 'secondary' })}>
          <Plus className="h-4 w-4" aria-hidden /> Add a supplier
        </button>
      </div>

      <MoreOptions label="Paste rows from a spreadsheet">
        <p className="text-[15px] text-muted">
          Copy rows from Excel or Google Sheets and paste them here. Columns go in this order; leave the ones you do not have
          empty. A heading row is left out.
        </p>
        <ol className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-ink sm:grid-cols-2 lg:grid-cols-3">
          {BULK_PASTE_COLUMN_REFERENCE.map((col) => (
            <li key={col.n}>
              <span className="tabular-nums text-muted">{col.n}.</span> {col.label}
              {col.hint ? <span className="text-muted"> ({col.hint})</span> : null}
            </li>
          ))}
        </ol>
        <label htmlFor="supplier-bulk-paste" className="block text-sm font-semibold text-ink">
          Rows to add
        </label>
        <textarea
          id="supplier-bulk-paste"
          value={bulkText}
          onChange={(e) => {
            setBulkText(e.target.value)
            setBulkError(null)
            setBulkInfo(null)
            setBulkWarnings([])
          }}
          rows={5}
          spellCheck={false}
          className={`${fieldClass} font-mono`}
          placeholder={'Acme Supplies\t125000.50\tGeneric\t4\tyes\tno\tno'}
        />
        <button type="button" onClick={appendBulkRows} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
          <Plus className="h-4 w-4" aria-hidden /> Add the pasted rows
        </button>
        {bulkError ? (
          <p role="alert" className="rounded-control border border-bad/30 bg-bad-soft px-3 py-2 text-[15px] text-ink">
            {bulkError}
          </p>
        ) : null}
        {bulkInfo ? (
          <p role="status" className="rounded-control border border-ok/30 bg-ok-soft px-3 py-2 text-[15px] text-ink">
            {bulkInfo}
          </p>
        ) : null}
        {bulkWarnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {bulkWarnings.map((w, idx) => (
              <li key={`${idx}-${w.slice(0, 24)}`}>{w}</li>
            ))}
          </ul>
        ) : null}
      </MoreOptions>
    </div>
  )
}
