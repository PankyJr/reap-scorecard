'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { calculateSupplierRow, getRecognitionPercent } from '@/lib/procurement/rows'
import { formatCurrencyZar } from '@/lib/procurement/format'
import { buttonStyles } from '@/components/ui/buttonStyles'
import type { SimulatorSupplier, SupplierScenarioOverride } from '@/lib/procurement/simulator'

const PAGE_SIZE = 50

export type SupplierSortKey = 'spend' | 'recognised'

export interface SupplierTableFilters {
  search: string
  level: string
  localImport: 'all' | 'local' | 'imported'
  compliance: 'all' | 'compliant' | 'non-compliant'
  modified: 'all' | 'modified' | 'unmodified'
  sort: SupplierSortKey
}

interface SimulatorSupplierTableProps {
  suppliers: SimulatorSupplier[]
  scenarioOverrides: Record<string, SupplierScenarioOverride>
  onEditSupplier(supplierId: string): void
  filters: SupplierTableFilters
  onFiltersChange(next: SupplierTableFilters): void
}

function complianceLabel(status: SimulatorSupplier['compliance_status']): string {
  switch (status) {
    case 'compliant':
      return 'Compliant'
    case 'non-compliant':
      return 'Non-compliant'
    case 'unknown':
      return 'Unknown'
    case 'expired':
      return 'Expired'
  }
}

export function SimulatorSupplierTable({
  suppliers,
  scenarioOverrides,
  onEditSupplier,
  filters,
  onFiltersChange,
}: SimulatorSupplierTableProps) {
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const rows = suppliers.filter((s) => {
      if (q) {
        const hay = `${s.supplier_name} ${s.supplier_code}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.level !== 'all' && s.level !== filters.level) return false
      if (filters.localImport === 'local' && s.is_imported) return false
      if (filters.localImport === 'imported' && !s.is_imported) return false
      const compliant = s.compliance_status === 'compliant'
      if (filters.compliance === 'compliant' && !compliant) return false
      if (filters.compliance === 'non-compliant' && compliant) return false
      const modified = s.id in scenarioOverrides
      if (filters.modified === 'modified' && !modified) return false
      if (filters.modified === 'unmodified' && modified) return false
      return true
    })

    rows.sort((a, b) => {
      const calcA = calculateSupplierRow({
        supplier_name: a.supplier_name,
        supplier_type: a.supplier_type,
        level: a.level,
        value_ex_vat: a.value_ex_vat,
        is_51_black_owned: a.is_51_black_owned,
        is_30_black_women_owned: a.is_30_black_women_owned,
        is_51_bdgs: a.is_51_bdgs,
      })
      const calcB = calculateSupplierRow({
        supplier_name: b.supplier_name,
        supplier_type: b.supplier_type,
        level: b.level,
        value_ex_vat: b.value_ex_vat,
        is_51_black_owned: b.is_51_black_owned,
        is_30_black_women_owned: b.is_30_black_women_owned,
        is_51_bdgs: b.is_51_bdgs,
      })
      const key = filters.sort === 'spend' ? 'value_ex_vat' : 'bbbee_spend'
      const av = key === 'value_ex_vat' ? a.value_ex_vat : calcA.bbbee_spend
      const bv = key === 'value_ex_vat' ? b.value_ex_vat : calcB.bbbee_spend
      return bv - av
    })
    return rows
  }, [suppliers, filters, scenarioOverrides])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const cappedPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(cappedPage * PAGE_SIZE, (cappedPage + 1) * PAGE_SIZE)

  const setFilter = <K extends keyof SupplierTableFilters>(
    key: K,
    value: SupplierTableFilters[K],
  ) => {
    setPage(0)
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Suppliers</h2>
        <p className="mt-1 text-base text-slate-600">
          {filtered.length.toLocaleString()} suppliers shown
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-base text-slate-700">Search</span>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Name or supplier number"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900"
            />
          </label>
          <label>
            <span className="mb-1 block text-base text-slate-700">B-BBEE level</span>
            <select
              value={filters.level}
              onChange={(e) => setFilter('level', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
            >
              <option value="all">All levels</option>
              {['1', '2', '3', '4', '5', '6', '7', '8', 'Non-Compliant'].map((l) => (
                <option key={l} value={l}>
                  Level {l === 'Non-Compliant' ? 'Non-compliant' : l}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-base text-slate-700">Local / imported</span>
            <select
              value={filters.localImport}
              onChange={(e) =>
                setFilter('localImport', e.target.value as SupplierTableFilters['localImport'])
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
            >
              <option value="all">All</option>
              <option value="local">Local</option>
              <option value="imported">Imported</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-base text-slate-700">Compliance</span>
            <select
              value={filters.compliance}
              onChange={(e) =>
                setFilter('compliance', e.target.value as SupplierTableFilters['compliance'])
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
            >
              <option value="all">All</option>
              <option value="compliant">Compliant</option>
              <option value="non-compliant">Non-compliant</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-base text-slate-700">Scenario status</span>
            <select
              value={filters.modified}
              onChange={(e) =>
                setFilter('modified', e.target.value as SupplierTableFilters['modified'])
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
            >
              <option value="all">All</option>
              <option value="modified">Modified only</option>
              <option value="unmodified">Unmodified only</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 text-base text-slate-700">
            Sort by
            <select
              value={filters.sort}
              onChange={(e) => setFilter('sort', e.target.value as SupplierSortKey)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            >
              <option value="spend">Spend (high to low)</option>
              <option value="recognised">Recognised spend (high to low)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-base">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {[
                'Supplier',
                'Number',
                'Type',
                'Local / imported',
                'Spend',
                'Level',
                'Recognition',
                'Recognised spend',
                'Compliance',
                'Scenario',
                '',
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-slate-600">
                  No suppliers match your filters.
                </td>
              </tr>
            ) : (
              pageRows.map((s) => {
                const calc = calculateSupplierRow({
                  supplier_name: s.supplier_name,
                  supplier_type: s.supplier_type,
                  level: s.level,
                  value_ex_vat: s.value_ex_vat,
                  is_51_black_owned: s.is_51_black_owned,
                  is_30_black_women_owned: s.is_30_black_women_owned,
                  is_51_bdgs: s.is_51_bdgs,
                })
                const modified = s.id in scenarioOverrides
                const override = scenarioOverrides[s.id]
                const excluded = override?.excluded
                const recognition = getRecognitionPercent(s.level)

                return (
                  <tr
                    key={s.id}
                    className={`border-t border-slate-100 ${modified ? 'bg-amber-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{s.supplier_name}</td>
                    <td className="px-4 py-3 text-slate-700">{s.supplier_code}</td>
                    <td className="px-4 py-3 text-slate-700">{s.supplier_type}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.is_imported ? 'Imported' : 'Local'}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{formatCurrencyZar(s.value_ex_vat)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.level === 'Non-Compliant' ? 'Non-compliant' : `Level ${s.level}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {(recognition * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {formatCurrencyZar(calc.bbbee_spend)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{complianceLabel(s.compliance_status)}</td>
                    <td className="px-4 py-3">
                      {excluded ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-sm font-medium text-red-800">
                          Excluded
                        </span>
                      ) : modified ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-sm font-medium text-amber-900">
                          Modified
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onEditSupplier(s.id)}
                        className={buttonStyles({ variant: 'secondary', size: 'md', className: 'text-base' })}
                      >
                        Edit scenario
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-base text-slate-600">
            Showing {cappedPage * PAGE_SIZE + 1}–
            {Math.min((cappedPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={cappedPage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className={buttonStyles({ variant: 'secondary', size: 'md' })}
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </button>
            <button
              type="button"
              disabled={cappedPage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className={buttonStyles({ variant: 'secondary', size: 'md' })}
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
