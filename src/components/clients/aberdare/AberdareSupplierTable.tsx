'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  calculateSupplierRow,
  getRecognitionPercent,
} from '@/lib/procurement/rows'
import { formatCurrencyZar } from '@/lib/procurement/format'
import {
  importStatusLabel,
  type AberdareSupplierRow,
} from '@/lib/clients/aberdare'
import type { SupplierScenarioOverride } from '@/lib/procurement/simulator'
import { applyScenarioOverrides } from '@/lib/procurement/simulator'
import { ABERDARE_THEME } from './theme'

const PAGE_SIZE = 50

export interface AberdareTableFilters {
  search: string
  level: string
  compliance: 'all' | 'compliant' | 'non-compliant'
  importFilter: 'all' | 'imported' | 'not_explicitly_imported'
  modified: 'all' | 'modified' | 'unmodified'
  sort: 'spend' | 'recognised'
}

interface AberdareSupplierTableProps {
  suppliers: AberdareSupplierRow[]
  scenarioOverrides: Record<string, SupplierScenarioOverride>
  filters: AberdareTableFilters
  onFiltersChange(next: AberdareTableFilters): void
  onEditSupplier(supplierId: string): void
}

export function AberdareSupplierTable({
  suppliers,
  scenarioOverrides,
  filters,
  onFiltersChange,
  onEditSupplier,
}: AberdareSupplierTableProps) {
  const [page, setPage] = useState(0)

  const scenarioById = useMemo(() => {
    const baseline = suppliers.map((s) => s.simulator)
    const { scenarioSuppliers } = applyScenarioOverrides(
      baseline,
      scenarioOverrides,
    )
    return new Map(scenarioSuppliers.map((s) => [s.id, s]))
  }, [suppliers, scenarioOverrides])

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const rows = suppliers.filter((s) => {
      if (q) {
        const hay = `${s.vendorName} ${s.vendorCode}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.level !== 'all' && s.level !== filters.level) return false
      if (filters.importFilter === 'imported' && !s.simulator.is_imported) {
        return false
      }
      if (
        filters.importFilter === 'not_explicitly_imported' &&
        s.simulator.is_imported
      ) {
        return false
      }
      const compliant = s.complianceStatus === 'compliant'
      if (filters.compliance === 'compliant' && !compliant) return false
      if (filters.compliance === 'non-compliant' && compliant) return false
      const modified = s.id in scenarioOverrides
      if (filters.modified === 'modified' && !modified) return false
      if (filters.modified === 'unmodified' && modified) return false
      return true
    })

    rows.sort((a, b) => {
      const sa = scenarioById.get(a.id) ?? a.simulator
      const sb = scenarioById.get(b.id) ?? b.simulator
      if (filters.sort === 'spend') return sb.value_ex_vat - sa.value_ex_vat
      const ra = calculateSupplierRow({
        supplier_name: sa.supplier_name,
        supplier_type: sa.supplier_type,
        level: sa.level,
        value_ex_vat: sa.value_ex_vat,
        is_51_black_owned: sa.is_51_black_owned,
        is_30_black_women_owned: sa.is_30_black_women_owned,
        is_51_bdgs: sa.is_51_bdgs,
      }).bbbee_spend
      const rb = calculateSupplierRow({
        supplier_name: sb.supplier_name,
        supplier_type: sb.supplier_type,
        level: sb.level,
        value_ex_vat: sb.value_ex_vat,
        is_51_black_owned: sb.is_51_black_owned,
        is_30_black_women_owned: sb.is_30_black_women_owned,
        is_51_bdgs: sb.is_51_bdgs,
      }).bbbee_spend
      return rb - ra
    })
    return rows
  }, [suppliers, filters, scenarioOverrides, scenarioById])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const cappedPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(
    cappedPage * PAGE_SIZE,
    cappedPage * PAGE_SIZE + PAGE_SIZE,
  )

  return (
    <section
      className="rounded-xl border bg-white p-6 sm:p-8"
      style={{ borderColor: ABERDARE_THEME.border }}
      data-testid="aberdare-supplier-table"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-semibold"
            style={{ color: ABERDARE_THEME.charcoal }}
          >
            Suppliers
          </h2>
          <p className="mt-1 text-base" style={{ color: ABERDARE_THEME.muted }}>
            Showing {filtered.length} of {suppliers.length} suppliers
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="block text-base font-medium" style={{ color: ABERDARE_THEME.text }}>
          Search vendor name or code
          <input
            type="search"
            value={filters.search}
            onChange={(e) => {
              setPage(0)
              onFiltersChange({ ...filters, search: e.target.value })
            }}
            className="mt-2 min-h-11 w-full rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
            placeholder="e.g. vendor name or code"
            data-testid="aberdare-supplier-search"
          />
        </label>
        <label className="block text-base font-medium" style={{ color: ABERDARE_THEME.text }}>
          B-BBEE level
          <select
            value={filters.level}
            onChange={(e) => {
              setPage(0)
              onFiltersChange({ ...filters, level: e.target.value })
            }}
            className="mt-2 min-h-11 w-full rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            <option value="all">All levels</option>
            {['1', '2', '3', '4', '5', '6', '7', '8', 'Non-Compliant'].map((l) => (
              <option key={l} value={l}>
                {l === 'Non-Compliant' ? 'Non-Compliant' : `Level ${l}`}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-base font-medium" style={{ color: ABERDARE_THEME.text }}>
          Compliance
          <select
            value={filters.compliance}
            onChange={(e) => {
              setPage(0)
              onFiltersChange({
                ...filters,
                compliance: e.target.value as AberdareTableFilters['compliance'],
              })
            }}
            className="mt-2 min-h-11 w-full rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            <option value="all">All</option>
            <option value="compliant">Compliant</option>
            <option value="non-compliant">Non-compliant</option>
          </select>
        </label>
        <label className="block text-base font-medium" style={{ color: ABERDARE_THEME.text }}>
          Import status
          <select
            value={filters.importFilter}
            onChange={(e) => {
              setPage(0)
              onFiltersChange({
                ...filters,
                importFilter: e.target
                  .value as AberdareTableFilters['importFilter'],
              })
            }}
            className="mt-2 min-h-11 w-full rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            <option value="all">All</option>
            <option value="imported">Imported</option>
            <option value="not_explicitly_imported">Not explicitly imported</option>
          </select>
        </label>
        <label className="block text-base font-medium" style={{ color: ABERDARE_THEME.text }}>
          Scenario status
          <select
            value={filters.modified}
            onChange={(e) => {
              setPage(0)
              onFiltersChange({
                ...filters,
                modified: e.target.value as AberdareTableFilters['modified'],
              })
            }}
            className="mt-2 min-h-11 w-full rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            <option value="all">All</option>
            <option value="modified">Modified</option>
            <option value="unmodified">Unmodified</option>
          </select>
        </label>
        <label className="block text-base font-medium" style={{ color: ABERDARE_THEME.text }}>
          Sort by
          <select
            value={filters.sort}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                sort: e.target.value as AberdareTableFilters['sort'],
              })
            }
            className="mt-2 min-h-11 w-full rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            <option value="spend">Spend (highest first)</option>
            <option value="recognised">Recognised spend</option>
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-base">
          <thead>
            <tr style={{ borderBottom: `1px solid ${ABERDARE_THEME.border}` }}>
              {[
                'Vendor',
                'Vendor code',
                'Spend excl. VAT',
                'B-BBEE level',
                'Recognition',
                'Import status',
                'Recognised spend',
                'Scenario status',
                'Action',
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-base font-semibold"
                  style={{ color: ABERDARE_THEME.charcoal }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const scenario = scenarioById.get(row.id) ?? row.simulator
              const calc = calculateSupplierRow({
                supplier_name: scenario.supplier_name,
                supplier_type: scenario.supplier_type,
                level: scenario.level,
                value_ex_vat: scenario.value_ex_vat,
                is_51_black_owned: scenario.is_51_black_owned,
                is_30_black_women_owned: scenario.is_30_black_women_owned,
                is_51_bdgs: scenario.is_51_bdgs,
              })
              const modified = row.id in scenarioOverrides
              const excluded = scenarioOverrides[row.id]?.excluded === true
              return (
                <tr
                  key={row.id}
                  className="align-top"
                  style={{
                    borderBottom: `1px solid ${ABERDARE_THEME.border}`,
                    background: modified ? ABERDARE_THEME.cyanSoft : undefined,
                  }}
                >
                  <td className="px-3 py-4 font-medium" style={{ color: ABERDARE_THEME.text }}>
                    {row.vendorName}
                  </td>
                  <td className="px-3 py-4" style={{ color: ABERDARE_THEME.text }}>
                    {row.vendorCode}
                  </td>
                  <td className="px-3 py-4 text-[15px] font-medium" style={{ color: ABERDARE_THEME.charcoal }}>
                    {formatCurrencyZar(scenario.value_ex_vat)}
                  </td>
                  <td className="px-3 py-4 text-[15px]" style={{ color: ABERDARE_THEME.text }}>
                    {scenario.level === 'Non-Compliant'
                      ? 'Non-Compliant'
                      : `Level ${scenario.level}`}
                  </td>
                  <td className="px-3 py-4 text-[15px]" style={{ color: ABERDARE_THEME.text }}>
                    {(getRecognitionPercent(scenario.level) * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-4" style={{ color: ABERDARE_THEME.text }}>
                    {importStatusLabel(row.importClassification)}
                    {scenario.is_imported !== row.simulator.is_imported
                      ? scenario.is_imported
                        ? ' → Imported'
                        : ' → Local'
                      : ''}
                  </td>
                  <td className="px-3 py-4 text-[15px] font-medium" style={{ color: ABERDARE_THEME.charcoal }}>
                    {formatCurrencyZar(calc.bbbee_spend)}
                  </td>
                  <td className="px-3 py-4" style={{ color: ABERDARE_THEME.text }}>
                    {excluded
                      ? 'Excluded'
                      : modified
                        ? 'Modified'
                        : 'Unchanged'}
                  </td>
                  <td className="px-3 py-4">
                    <button
                      type="button"
                      onClick={() => onEditSupplier(row.id)}
                      className="inline-flex min-h-11 items-center rounded-lg border px-3 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{
                        borderColor: ABERDARE_THEME.cyanDark,
                        color: ABERDARE_THEME.cyanDark,
                      }}
                    >
                      Test change
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-base" style={{ color: ABERDARE_THEME.muted }}>
          Page {cappedPage + 1} of {pageCount}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={cappedPage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-base disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </button>
          <button
            type="button"
            disabled={cappedPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-base disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}
