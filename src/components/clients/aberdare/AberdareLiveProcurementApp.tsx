'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  calculateAberdareScenario,
  clearAberdareSessionData,
  findDemoImportedSupplier,
  findDemoLevel1Supplier,
  loadAberdareSessionOverrides,
  saveAberdareSessionOverrides,
  type AberdareParseResult,
  type AberdareSupplierRow,
} from '@/lib/clients/aberdare'
import type {
  ScenarioChangeRecord,
  SupplierScenarioOverride,
} from '@/lib/procurement/simulator'
import { AberdareWorkspaceHeader } from './AberdareWorkspaceHeader'
import { AberdareUploadPanel } from './AberdareUploadPanel'
import { AberdarePositionSummary } from './AberdarePositionSummary'
import {
  AberdareSupplierTable,
  type AberdareTableFilters,
} from './AberdareSupplierTable'
import { AberdareSupplierEditor } from './AberdareSupplierEditor'
import { AberdareScenarioSummary } from './AberdareScenarioSummary'
import { AberdareCalculationExplanation } from './AberdareCalculationExplanation'
import { ABERDARE_THEME } from './theme'

type Step = 'upload' | 'review' | 'test'

const DEFAULT_FILTERS: AberdareTableFilters = {
  search: '',
  level: 'all',
  compliance: 'all',
  importFilter: 'all',
  modified: 'all',
  sort: 'spend',
}

/**
 * Holds uploaded Aberdare baseline in memory for the browser session only.
 * Scenario overrides may optionally be mirrored to sessionStorage (never the baseline).
 */
export function AberdareLiveProcurementApp() {
  const [parseResult, setParseResult] = useState<AberdareParseResult | null>(
    null,
  )
  // Do not hydrate session overrides without a baseline — orphaned overrides
  // would skip Review and jump straight to Adjust suppliers after the next upload.
  const [scenarioOverrides, setScenarioOverrides] = useState<
    Record<string, SupplierScenarioOverride>
  >({})
  const [changeStack, setChangeStack] = useState<ScenarioChangeRecord[]>([])
  const [filters, setFilters] = useState<AberdareTableFilters>(DEFAULT_FILTERS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showImportDetails, setShowImportDetails] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showHowCalculated, setShowHowCalculated] = useState(false)
  const [scenarioName] = useState(
    () => loadAberdareSessionOverrides()?.scenarioName ?? 'Session scenario',
  )

  const step: Step = !parseResult
    ? 'upload'
    : Object.keys(scenarioOverrides).length > 0
      ? 'test'
      : 'review'

  /** Fresh upload always lands on Review with a clean scenario. */
  const handleParsed = useCallback((result: AberdareParseResult) => {
    clearAberdareSessionData()
    setScenarioOverrides({})
    setChangeStack([])
    setFilters(DEFAULT_FILTERS)
    setEditingId(null)
    setShowImportDetails(false)
    setShowSummary(false)
    setShowHowCalculated(false)
    setParseResult(result)
  }, [])

  const returnToUpload = useCallback(() => {
    setParseResult(null)
    setScenarioOverrides({})
    setChangeStack([])
    setEditingId(null)
    setShowImportDetails(false)
    setShowSummary(false)
    setShowHowCalculated(false)
    clearAberdareSessionData()
  }, [])

  const reportingPeriod = useMemo(() => {
    if (!parseResult) return 'Uploaded report'
    return `Source: ${parseResult.sourceFileName}`
  }, [parseResult])

  const comparison = useMemo(() => {
    if (!parseResult) return null
    return calculateAberdareScenario(
      parseResult.suppliers,
      scenarioOverrides,
      reportingPeriod,
    )
  }, [parseResult, scenarioOverrides, reportingPeriod])

  const applyOverride = useCallback(
    (supplierId: string, override: SupplierScenarioOverride | undefined) => {
      if (!parseResult) return
      const supplier = parseResult.suppliers.find((s) => s.id === supplierId)
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
            supplierName: supplier.vendorName,
            before,
            after: next[supplierId],
            timestamp: Date.now(),
          },
        ])
        saveAberdareSessionOverrides(next, scenarioName)
        return next
      })
    },
    [parseResult, scenarioName],
  )

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
        saveAberdareSessionOverrides(next, scenarioName)
        return next
      })
      return stack.slice(0, -1)
    })
  }, [scenarioName])

  const resetAll = useCallback(() => {
    setScenarioOverrides({})
    setChangeStack([])
    saveAberdareSessionOverrides({}, scenarioName)
  }, [scenarioName])

  const clearSession = useCallback(() => {
    setParseResult(null)
    setScenarioOverrides({})
    setChangeStack([])
    setFilters(DEFAULT_FILTERS)
    setEditingId(null)
    setShowImportDetails(false)
    setShowSummary(false)
    setShowHowCalculated(false)
    clearAberdareSessionData()
  }, [])

  const applyExampleScenario = useCallback(() => {
    if (!parseResult) return
    const target = findDemoLevel1Supplier(parseResult.suppliers)
    if (!target) return
    applyOverride(target.id, {
      compliance_status: 'non-compliant',
      level: 'Non-Compliant',
    })
    setFilters((f) => ({
      ...f,
      search: target.vendorName.slice(0, 24),
      modified: 'modified',
    }))
    setEditingId(target.id)
  }, [parseResult, applyOverride])

  const applyImportExample = useCallback(() => {
    if (!parseResult) return
    const local = findDemoLevel1Supplier(parseResult.suppliers)
    if (local) {
      applyOverride(local.id, { is_imported: true })
      setFilters((f) => ({ ...f, search: local.vendorName.slice(0, 24) }))
      return
    }
    const imported = findDemoImportedSupplier(parseResult.suppliers)
    if (imported) {
      applyOverride(imported.id, { is_imported: false })
      setFilters((f) => ({ ...f, search: imported.vendorName.slice(0, 24) }))
    }
  }, [parseResult, applyOverride])

  const editingSupplier: AberdareSupplierRow | null =
    editingId && parseResult
      ? (parseResult.suppliers.find((s) => s.id === editingId) ?? null)
      : null

  return (
    <div
      className="min-h-screen text-base"
      style={{ background: ABERDARE_THEME.canvas, color: ABERDARE_THEME.text }}
    >
      <AberdareWorkspaceHeader
        pageTitle="Live Procurement Control"
        subtitle="Upload the report, review your position, then adjust suppliers to see the projected impact."
        showBackToWorkspace
      />

      <main className="mx-auto max-w-[1200px] space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="rounded-2xl border bg-white px-5 py-4 sm:px-6" style={{ borderColor: ABERDARE_THEME.border }}>
          <p
            className="text-sm font-semibold tracking-wide"
            style={{ color: ABERDARE_THEME.cyanDark }}
          >
            Live workflow · Upload → Review → Adjust suppliers
          </p>
          <nav
            aria-label="Live procurement steps"
            className="mt-3 flex flex-wrap gap-2.5"
            data-testid="aberdare-steps"
          >
            {(
              [
                ['upload', '1. Upload'],
                ['review', '2. Review'],
                ['test', '3. Adjust suppliers'],
              ] as const
            ).map(([key, label]) => {
              const active = step === key
              return (
                <span
                  key={key}
                  className="inline-flex min-h-11 items-center rounded-xl border px-4 text-base font-semibold"
                  style={{
                    borderColor: active
                      ? ABERDARE_THEME.cyanDark
                      : ABERDARE_THEME.border,
                    background: active ? ABERDARE_THEME.cyanSoft : '#fff',
                    color: active
                      ? ABERDARE_THEME.cyanDark
                      : ABERDARE_THEME.muted,
                  }}
                >
                  {label}
                </span>
              )
            })}
          </nav>
          <p
            className="mt-3 text-base leading-snug"
            style={{ color: ABERDARE_THEME.muted }}
            data-testid="aberdare-step-guidance"
          >
            {step === 'upload'
              ? 'Choose the latest monthly supplier-spend report to begin.'
              : step === 'review'
                ? 'Check the current procurement position, then open a supplier below to try a change.'
                : 'You are editing supplier details. The uploaded report stays unchanged while you compare projected points.'}
          </p>
        </div>

        {!parseResult ? (
          <AberdareUploadPanel onParsed={handleParsed} />
        ) : (
          <>
            <div
              className="rounded-2xl border bg-white p-4 sm:p-5"
              style={{ borderColor: ABERDARE_THEME.border }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={returnToUpload}
                    className="inline-flex min-h-11 items-center rounded-xl border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
                    style={{ borderColor: ABERDARE_THEME.border }}
                  >
                    Replace report
                  </button>
                  <button
                    type="button"
                    onClick={undoLast}
                    disabled={changeStack.length === 0}
                    className="inline-flex min-h-11 items-center rounded-xl border px-4 text-base font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
                    style={{ borderColor: ABERDARE_THEME.border }}
                    data-testid="aberdare-undo"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={resetAll}
                    disabled={Object.keys(scenarioOverrides).length === 0}
                    className="inline-flex min-h-11 items-center rounded-xl border px-4 text-base font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
                    style={{ borderColor: ABERDARE_THEME.border }}
                    data-testid="aberdare-reset"
                  >
                    Reset adjustments
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSummary(true)}
                    className="inline-flex min-h-11 items-center rounded-xl border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
                    style={{
                      borderColor: ABERDARE_THEME.cyanDark,
                      color: ABERDARE_THEME.cyanDark,
                    }}
                    data-testid="aberdare-open-summary"
                  >
                    View impact summary
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5 lg:justify-end">
                  <button
                    type="button"
                    onClick={applyExampleScenario}
                    className="inline-flex min-h-11 items-center rounded-xl px-4 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
                    style={{ background: ABERDARE_THEME.cyanDark }}
                    data-testid="aberdare-try-example"
                  >
                    Example: Level 1 → Non-Compliant
                  </button>
                  <button
                    type="button"
                    onClick={applyImportExample}
                    className="inline-flex min-h-11 items-center rounded-xl border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
                    style={{ borderColor: ABERDARE_THEME.border }}
                  >
                    Example: Import change
                  </button>
                  <button
                    type="button"
                    onClick={clearSession}
                    className="inline-flex min-h-11 items-center rounded-xl border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{
                      borderColor: '#F3C1BC',
                      color: ABERDARE_THEME.danger,
                    }}
                  >
                    Clear session
                  </button>
                </div>
              </div>
            </div>

            {Object.keys(scenarioOverrides).length > 0 ? (
              <p
                className="rounded-xl border px-4 py-3 text-base font-medium"
                style={{
                  borderColor: ABERDARE_THEME.cyan,
                  background: ABERDARE_THEME.cyanSoft,
                  color: ABERDARE_THEME.cyanDark,
                }}
              >
                Working adjustments in this browser session (
                {Object.keys(scenarioOverrides).length} supplier
                {Object.keys(scenarioOverrides).length === 1 ? '' : 's'}). The
                uploaded current position is unchanged.
              </p>
            ) : null}

            {comparison ? (
              <AberdarePositionSummary
                parseResult={parseResult}
                comparison={comparison}
                showImportDetails={showImportDetails}
                onReviewImportDetails={() =>
                  setShowImportDetails((v) => !v)
                }
                onHowCalculated={() => setShowHowCalculated(true)}
              />
            ) : null}

            <AberdareSupplierTable
              suppliers={parseResult.suppliers}
              scenarioOverrides={scenarioOverrides}
              filters={filters}
              onFiltersChange={setFilters}
              onEditSupplier={setEditingId}
            />
          </>
        )}
      </main>

      <AberdareSupplierEditor
        open={Boolean(editingSupplier)}
        supplier={editingSupplier}
        allSuppliers={parseResult?.suppliers ?? []}
        currentOverride={
          editingId ? scenarioOverrides[editingId] : undefined
        }
        allOverrides={scenarioOverrides}
        reportingPeriod={reportingPeriod}
        onClose={() => setEditingId(null)}
        onApply={applyOverride}
      />

      {parseResult && comparison ? (
        <AberdareScenarioSummary
          open={showSummary}
          onClose={() => setShowSummary(false)}
          parseResult={parseResult}
          comparison={comparison}
          overrides={scenarioOverrides}
          suppliers={parseResult.suppliers}
        />
      ) : null}

      {parseResult && comparison ? (
        <AberdareCalculationExplanation
          open={showHowCalculated}
          onClose={() => setShowHowCalculated(false)}
          parseResult={parseResult}
          comparison={comparison}
        />
      ) : null}
    </div>
  )
}
