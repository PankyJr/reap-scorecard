'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  applyScenarioOverrides,
  calculateProcurementPosition,
  DEFAULT_SIMULATOR_SUPPLIER_COUNT,
  generateMbekiSimulatorSuppliers,
  MBEKI_SIMULATOR_META,
  type ScenarioChangeRecord,
  type SupplierScenarioOverride,
} from '@/lib/procurement/simulator'
import { SimulatorSummary } from './SimulatorSummary'
import { SimulatorControls } from './SimulatorControls'
import {
  SimulatorSupplierTable,
  type SupplierTableFilters,
} from './SimulatorSupplierTable'
import { SimulatorSupplierEditor } from './SimulatorSupplierEditor'

const DEFAULT_SCENARIO_NAME = 'Untitled scenario'

export function ProcurementSimulatorApp() {
  const baselineSuppliers = useMemo(
    () => generateMbekiSimulatorSuppliers(DEFAULT_SIMULATOR_SUPPLIER_COUNT),
    [],
  )

  const [scenarioOverrides, setScenarioOverrides] = useState<
    Record<string, SupplierScenarioOverride>
  >({})
  const [changeStack, setChangeStack] = useState<ScenarioChangeRecord[]>([])
  const [scenarioName, setScenarioName] = useState(DEFAULT_SCENARIO_NAME)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('{}')
  const [viewMode, setViewMode] = useState<'compare' | 'actual' | 'scenario'>('compare')
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  const [filters, setFilters] = useState<SupplierTableFilters>({
    search: '',
    level: 'all',
    localImport: 'all',
    compliance: 'all',
    modified: 'all',
    sort: 'spend',
  })

  const comparison = useMemo(
    () =>
      calculateProcurementPosition({
        baselineSuppliers,
        scenarioOverrides,
        reportingPeriod: MBEKI_SIMULATOR_META.reportingPeriod,
      }),
    [baselineSuppliers, scenarioOverrides],
  )

  const scenarioSuppliers = useMemo(() => {
    const { scenarioSuppliers: rows } = applyScenarioOverrides(
      baselineSuppliers,
      scenarioOverrides,
    )
    return rows
  }, [baselineSuppliers, scenarioOverrides])

  const hasUnsavedChanges =
    JSON.stringify(scenarioOverrides) !== lastSavedSnapshot

  const applyOverride = useCallback(
    (supplierId: string, override: SupplierScenarioOverride | undefined) => {
      const supplier = baselineSuppliers.find((s) => s.id === supplierId)
      if (!supplier) return

      setScenarioOverrides((prev) => {
        const before = prev[supplierId]
        const next = { ...prev }
        if (!override || Object.keys(override).length === 0) {
          delete next[supplierId]
        } else {
          next[supplierId] = override
        }

        setChangeStack((stack) => [
          ...stack,
          {
            supplierId,
            supplierName: supplier.supplier_name,
            before,
            after: next[supplierId],
            timestamp: Date.now(),
          },
        ])

        return next
      })
    },
    [baselineSuppliers],
  )

  const resetAll = useCallback(() => {
    setScenarioOverrides({})
    setChangeStack([])
    setScenarioName(DEFAULT_SCENARIO_NAME)
    setFilters((f) => ({ ...f, modified: 'all' }))
  }, [])

  const undoLast = useCallback(() => {
    setChangeStack((stack) => {
      if (stack.length === 0) return stack
      const last = stack[stack.length - 1]!
      setScenarioOverrides((prev) => {
        const next = { ...prev }
        if (last.before === undefined) {
          delete next[last.supplierId]
        } else {
          next[last.supplierId] = last.before
        }
        return next
      })
      return stack.slice(0, -1)
    })
  }, [])

  const loadOverrides = useCallback(
    (overrides: Record<string, SupplierScenarioOverride>, name: string) => {
      setScenarioOverrides(structuredClone(overrides))
      setChangeStack([])
      setScenarioName(name)
      setLastSavedSnapshot(JSON.stringify(overrides))
    },
    [],
  )

  const editingBaseline = editingSupplierId
    ? baselineSuppliers.find((s) => s.id === editingSupplierId) ?? null
    : null

  return (
    <div className="min-h-screen bg-slate-100 text-base text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-base font-medium text-slate-600">Development prototype</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Procurement scenario planner
          </h1>
          <p className="mt-2 text-lg text-slate-700">{MBEKI_SIMULATOR_META.companyName}</p>
          <div className="mt-4 flex flex-wrap gap-6 text-base text-slate-600">
            <span>
              <strong className="text-slate-800">Reporting period:</strong>{' '}
              {MBEKI_SIMULATOR_META.reportingPeriod}
            </span>
            <span>
              <strong className="text-slate-800">Last upload:</strong>{' '}
              {MBEKI_SIMULATOR_META.lastUploadDate}
            </span>
            <span>
              <strong className="text-slate-800">File:</strong>{' '}
              {MBEKI_SIMULATOR_META.uploadLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <SimulatorControls
          scenarioName={scenarioName}
          onScenarioNameChange={setScenarioName}
          hasUnsavedChanges={hasUnsavedChanges}
          modifiedCount={comparison.modifiedSupplierCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onResetAll={resetAll}
          onUndo={undoLast}
          canUndo={changeStack.length > 0}
          overrides={scenarioOverrides}
          onLoadOverrides={loadOverrides}
        />

        <SimulatorSummary comparison={comparison} viewMode={viewMode} />

        <SimulatorSupplierTable
          suppliers={scenarioSuppliers}
          scenarioOverrides={scenarioOverrides}
          onEditSupplier={setEditingSupplierId}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </main>

      <SimulatorSupplierEditor
        key={editingSupplierId ?? 'closed'}
        open={editingSupplierId !== null}
        baselineSupplier={editingBaseline}
        allBaselineSuppliers={baselineSuppliers}
        currentOverride={
          editingSupplierId ? scenarioOverrides[editingSupplierId] : undefined
        }
        reportingPeriod={MBEKI_SIMULATOR_META.reportingPeriod}
        onClose={() => setEditingSupplierId(null)}
        onApply={applyOverride}
      />
    </div>
  )
}
