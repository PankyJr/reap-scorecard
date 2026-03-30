'use client'

import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  calculateSupplierRow,
  type ProcurementSupplierInput,
  type ProcurementSupplierWithCalculated,
} from '@/lib/procurement/rows'
import { formatCurrency } from '@/lib/procurement/format'
import type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'
import type { Path, PathValue, UseFormSetValue } from 'react-hook-form'

export type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'

interface SuppliersTableProps<
  FormValues extends Record<string, unknown>,
  TFieldName extends Path<FormValues>,
> {
  setValue: UseFormSetValue<FormValues>
  fieldName: TFieldName
  rows: SupplierFormRow[]
  onChangeRows(rows: SupplierFormRow[]): void
}

function createRowId() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function describeBuckets(row: ProcurementSupplierWithCalculated): string {
  const buckets: string[] = []
  if (row.bbbee_spend > 0) buckets.push('B-BBEE spend')
  if (row.eme_amount > 0) buckets.push('EME')
  if (row.qse_amount > 0) buckets.push('QSE')
  if (row.black_owned_amount > 0) buckets.push('51% Black owned')
  if (row.black_women_amount > 0) buckets.push('30% Black women')
  if (row.bdgs_amount > 0) buckets.push('51% BDGs')
  return buckets.join(' • ') || 'No recognised contribution'
}

const LEVEL_OPTIONS: { value: string; label: string }[] = [
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

export function SuppliersTable<
  FormValues extends Record<string, unknown>,
  TFieldName extends Path<FormValues>,
>({
  setValue,
  fieldName,
  rows,
  onChangeRows,
}: SuppliersTableProps<FormValues, TFieldName>) {
  const calculatedRows = useMemo(() => {
    return rows.map((row) =>
      calculateSupplierRow({
        supplier_name: row.supplier_name,
        supplier_code: row.supplier_code,
        vat_number: row.vat_number,
        company_registration: row.company_registration,
        bo_etc: row.bo_etc,
        fts: row.fts,
        des: row.des,
        prop: row.prop,
        supplier_type: row.supplier_type,
        level: row.level,
        value_ex_vat: Number(row.value_ex_vat) || 0,
        is_51_black_owned: !!row.is_51_black_owned,
        is_30_black_women_owned: !!row.is_30_black_women_owned,
        is_51_bdgs: !!row.is_51_bdgs,
        expiry: row.expiry,
        empower: row.empower,
      }),
    )
  }, [rows])

  useEffect(() => {
    const payload = calculatedRows.map<ProcurementSupplierInput>(
      (row, index) => ({
        supplier_name: rows[index]?.supplier_name ?? '',
        supplier_code: rows[index]?.supplier_code,
        vat_number: rows[index]?.vat_number,
        company_registration: rows[index]?.company_registration,
        bo_etc: rows[index]?.bo_etc,
        fts: rows[index]?.fts,
        des: rows[index]?.des,
        prop: rows[index]?.prop,
        supplier_type: rows[index]?.supplier_type ?? 'Generic',
        level: rows[index]?.level ?? 'Non-Compliant',
        value_ex_vat: Number(rows[index]?.value_ex_vat) || 0,
        is_51_black_owned: !!rows[index]?.is_51_black_owned,
        is_30_black_women_owned: !!rows[index]?.is_30_black_women_owned,
        is_51_bdgs: !!rows[index]?.is_51_bdgs,
        expiry: rows[index]?.expiry,
        empower: rows[index]?.empower,
      }),
    )

    const json = JSON.stringify(payload)
    setValue(fieldName, json as unknown as PathValue<FormValues, TFieldName>)
  }, [calculatedRows, fieldName, rows, setValue])

  const addRow = () => {
    const newRow: SupplierFormRow = {
      id: createRowId(),
      supplier_name: '',
      supplier_code: '',
      vat_number: '',
      company_registration: '',
      bo_etc: '',
      fts: '',
      des: '',
      prop: '',
      supplier_type: 'Generic',
      level: 'Non-Compliant',
      value_ex_vat: 0,
      is_51_black_owned: false,
      is_30_black_women_owned: false,
      is_51_bdgs: false,
      expiry: '',
      empower: '',
    }
    onChangeRows([...rows, newRow])
  }

  const updateRow = (id: string, patch: Partial<SupplierFormRow>) => {
    onChangeRows(
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  const removeRow = (id: string) => {
    onChangeRows(rows.filter((row) => row.id !== id))
  }

  const fieldClass =
    'w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70'
  const fieldClassCompact =
    'w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70'

  const labelClass = 'text-xs font-medium text-slate-700'

  const FieldLabel = ({ children }: { children: ReactNode }) => (
    <span className={labelClass}>{children}</span>
  )

  const TwoCol = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Add supplier
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => {
          const calc = calculatedRows[i]
          const supplierTitle = row.supplier_name?.trim()
            ? row.supplier_name.trim()
            : `Supplier ${i + 1}`

          return (
            <div
              key={row.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-sm font-semibold text-slate-700">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {supplierTitle}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {(calc.recognition_percent * 100).toFixed(0)}% recognition -{' '}
                        B-BBEE {formatCurrency(calc.bbbee_spend)}
                        {row.value_ex_vat ? '' : ' - enter Ex-VAT to enable'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="self-start rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove supplier"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Supplier identity */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Supplier details
                    </p>
                  </div>

                  <TwoCol>
                    <div className="space-y-1.5">
                      <label className="block">
                        <FieldLabel>Supplier name</FieldLabel>
                      </label>
                      <input
                        value={row.supplier_name}
                        onChange={(e) =>
                          updateRow(row.id, {
                            supplier_name: e.target.value,
                          })
                        }
                        className={fieldClass}
                        placeholder="Name"
                        aria-label="Supplier name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block">
                        <FieldLabel>Code</FieldLabel>
                      </label>
                      <input
                        value={row.supplier_code ?? ''}
                        onChange={(e) =>
                          updateRow(row.id, { supplier_code: e.target.value })
                        }
                        className={fieldClassCompact}
                        placeholder="e.g. Supplier code"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block">
                        <FieldLabel>VAT</FieldLabel>
                      </label>
                      <input
                        value={row.vat_number ?? ''}
                        onChange={(e) =>
                          updateRow(row.id, { vat_number: e.target.value })
                        }
                        className={fieldClassCompact}
                        placeholder="VAT number"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block">
                        <FieldLabel>Registration</FieldLabel>
                      </label>
                      <input
                        value={row.company_registration ?? ''}
                        onChange={(e) =>
                          updateRow(row.id, {
                            company_registration: e.target.value,
                          })
                        }
                        className={fieldClassCompact}
                        placeholder="Company registration"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block">
                        <FieldLabel>BO etc</FieldLabel>
                      </label>
                      <input
                        value={row.bo_etc ?? ''}
                        onChange={(e) =>
                          updateRow(row.id, { bo_etc: e.target.value })
                        }
                        className={fieldClassCompact}
                        placeholder="Black ownership / verification notes"
                      />
                    </div>
                  </TwoCol>
                </div>

                {/* Classification + value */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Classification & allocation
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="space-y-3">
                      <TwoCol>
                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>FTS</FieldLabel>
                          </label>
                          <input
                            value={row.fts ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { fts: e.target.value })
                            }
                            className={fieldClassCompact}
                            placeholder="FTS"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>DES</FieldLabel>
                          </label>
                          <input
                            value={row.des ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { des: e.target.value })
                            }
                            className={fieldClassCompact}
                            placeholder="DES"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>PROP</FieldLabel>
                          </label>
                          <input
                            value={row.prop ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { prop: e.target.value })
                            }
                            className={fieldClassCompact}
                            placeholder="PROP"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Supplier type</FieldLabel>
                          </label>
                          <select
                            value={row.supplier_type}
                            onChange={(e) =>
                              updateRow(row.id, {
                                supplier_type:
                                  e.target.value as SupplierFormRow['supplier_type'],
                              })
                            }
                            className={fieldClassCompact}
                            aria-label="Supplier type"
                          >
                            <option value="EME">EME</option>
                            <option value="QSE">QSE</option>
                            <option value="Generic">Generic</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Recognition level</FieldLabel>
                          </label>
                          <select
                            value={row.level}
                            onChange={(e) =>
                              updateRow(row.id, { level: e.target.value })
                            }
                            className={fieldClassCompact}
                            aria-label="Recognition level"
                          >
                            {LEVEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Ex-VAT value</FieldLabel>
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={row.value_ex_vat === 0 ? '' : row.value_ex_vat}
                            onChange={(e) =>
                              updateRow(row.id, {
                                value_ex_vat:
                                  e.target.value === ''
                                    ? 0
                                    : Number(e.target.value),
                              })
                            }
                            className={`${fieldClassCompact} text-right tabular-nums`}
                            aria-label="Supplier value ex VAT"
                          />
                        </div>
                      </TwoCol>
                    </div>

                    {/* Ownership flags */}
                    <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ownership flags
                      </p>

                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={row.is_51_black_owned}
                            onChange={(e) =>
                              updateRow(row.id, {
                                is_51_black_owned: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          51%+ black
                        </label>

                        <label className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={row.is_30_black_women_owned}
                            onChange={(e) =>
                              updateRow(row.id, {
                                is_30_black_women_owned: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          30%+ women
                        </label>

                        <label className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={row.is_51_bdgs}
                            onChange={(e) =>
                              updateRow(row.id, {
                                is_51_bdgs: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          51%+ BDGs
                        </label>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Expiry</FieldLabel>
                          </label>
                          <input
                            type="date"
                            value={row.expiry ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { expiry: e.target.value })
                            }
                            className={fieldClassCompact}
                            aria-label="Supplier expiry"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Empower / notes</FieldLabel>
                          </label>
                          <textarea
                            value={row.empower ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { empower: e.target.value })
                            }
                            rows={2}
                            className={`${fieldClassCompact} min-h-[52px]`}
                            aria-label="Supplier empower notes"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recognition summary */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recognition summary
                  </p>

                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Recognition
                      </p>
                      <p className="mt-1 tabular-nums text-lg font-semibold text-slate-900">
                        {(calc.recognition_percent * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        B-BBEE spend
                      </p>
                      <p className="mt-1 tabular-nums text-lg font-semibold text-slate-900">
                        {formatCurrency(calc.bbbee_spend)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 sm:col-span-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Contribution buckets
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {describeBuckets(calc)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          No suppliers yet. Use &quot;Add supplier&quot; to capture spend.
        </p>
      ) : null}
    </div>
  )
}
