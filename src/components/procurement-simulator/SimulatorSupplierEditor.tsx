'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { calculateSupplierRow, type SupplierType } from '@/lib/procurement/rows'
import { formatCurrencyZar, formatPoints } from '@/lib/procurement/format'
import { calculateProcurementPosition } from '@/lib/procurement/simulator'
import { buttonStyles } from '@/components/ui/buttonStyles'
import type {
  ComplianceStatus,
  SimulatorSupplier,
  SupplierScenarioOverride,
} from '@/lib/procurement/simulator'

interface SimulatorSupplierEditorProps {
  open: boolean
  baselineSupplier: SimulatorSupplier | null
  allBaselineSuppliers: SimulatorSupplier[]
  currentOverride: SupplierScenarioOverride | undefined
  reportingPeriod: string
  onClose(): void
  onApply(supplierId: string, override: SupplierScenarioOverride | undefined): void
}

function FieldRow({
  label,
  original,
  scenario,
}: {
  label: string
  original: string
  scenario: string
}) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-slate-100 py-3 text-base">
      <div className="font-medium text-slate-700">{label}</div>
      <div className="text-slate-600">{original}</div>
      <div className="font-medium text-slate-900">{scenario}</div>
    </div>
  )
}

export function SimulatorSupplierEditor({
  open,
  baselineSupplier,
  allBaselineSuppliers,
  currentOverride,
  reportingPeriod,
  onClose,
  onApply,
}: SimulatorSupplierEditorProps) {
  const [draft, setDraft] = useState<SupplierScenarioOverride>(() =>
    currentOverride ? { ...currentOverride } : {},
  )

  const merged = useMemo(() => {
    if (!baselineSupplier) return null
    return {
      ...baselineSupplier,
      ...draft,
      level: draft.level ?? baselineSupplier.level,
      supplier_type: draft.supplier_type ?? baselineSupplier.supplier_type,
      value_ex_vat: draft.value_ex_vat ?? baselineSupplier.value_ex_vat,
      is_imported: draft.is_imported ?? baselineSupplier.is_imported,
      compliance_status:
        draft.compliance_status ?? baselineSupplier.compliance_status,
      is_51_black_owned: draft.is_51_black_owned ?? baselineSupplier.is_51_black_owned,
      is_30_black_women_owned:
        draft.is_30_black_women_owned ?? baselineSupplier.is_30_black_women_owned,
      is_51_bdgs: draft.is_51_bdgs ?? baselineSupplier.is_51_bdgs,
    }
  }, [baselineSupplier, draft])

  const impact = useMemo(() => {
    if (!baselineSupplier || !merged) return null
    const overrides: Record<string, SupplierScenarioOverride> = currentOverride
      ? { [baselineSupplier.id]: { ...currentOverride, ...draft } }
      : Object.keys(draft).length > 0
        ? { [baselineSupplier.id]: draft }
        : {}

    const comparison = calculateProcurementPosition({
      baselineSuppliers: allBaselineSuppliers,
      scenarioOverrides: overrides,
      reportingPeriod,
    })

    const actualRow = calculateSupplierRow({
      supplier_name: baselineSupplier.supplier_name,
      supplier_type: baselineSupplier.supplier_type,
      level: baselineSupplier.level,
      value_ex_vat: baselineSupplier.value_ex_vat,
      is_51_black_owned: baselineSupplier.is_51_black_owned,
      is_30_black_women_owned: baselineSupplier.is_30_black_women_owned,
      is_51_bdgs: baselineSupplier.is_51_bdgs,
    })

    const scenarioRow = calculateSupplierRow({
      supplier_name: merged.supplier_name,
      supplier_type: merged.supplier_type,
      level: merged.level,
      value_ex_vat: merged.value_ex_vat,
      is_51_black_owned: merged.is_51_black_owned,
      is_30_black_women_owned: merged.is_30_black_women_owned,
      is_51_bdgs: merged.is_51_bdgs,
    })

    return {
      pointsImpact: comparison.pointsDifference,
      actualRecognised: actualRow.bbbee_spend,
      scenarioRecognised: scenarioRow.bbbee_spend,
    }
  }, [
    allBaselineSuppliers,
    baselineSupplier,
    currentOverride,
    draft,
    merged,
    reportingPeriod,
  ])

  if (!open || !baselineSupplier || !merged) return null

  const hasDraftChanges = Object.keys(draft).length > 0

  function applyChanges() {
    if (!hasDraftChanges && !currentOverride) {
      onClose()
      return
    }
    if (!hasDraftChanges && currentOverride) {
      onApply(baselineSupplier!.id, undefined)
      onClose()
      return
    }
    onApply(baselineSupplier!.id, draft)
    onClose()
  }

  function restoreOriginal() {
    onApply(baselineSupplier!.id, undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-base text-slate-600">Scenario edit</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {baselineSupplier.supplier_name}
            </h2>
            <p className="mt-1 text-base text-slate-600">{baselineSupplier.supplier_code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={buttonStyles({ variant: 'ghost', size: 'md' })}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <div>Field</div>
            <div>Actual</div>
            <div>Scenario</div>
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-base font-medium text-slate-800">B-BBEE level</span>
            <select
              value={draft.level ?? baselineSupplier.level}
              onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', 'Non-Compliant'].map((l) => (
                <option key={l} value={l}>
                  {l === 'Non-Compliant' ? 'Non-compliant' : `Level ${l}`}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block text-base font-medium text-slate-800">
              Compliance status
            </span>
            <select
              value={draft.compliance_status ?? baselineSupplier.compliance_status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  compliance_status: e.target.value as ComplianceStatus,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
            >
              <option value="compliant">Compliant</option>
              <option value="non-compliant">Non-compliant</option>
              <option value="unknown">Unknown</option>
              <option value="expired">Expired certificate</option>
            </select>
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block text-base font-medium text-slate-800">
              Supplier classification
            </span>
            <select
              value={draft.supplier_type ?? baselineSupplier.supplier_type}
              onChange={(e) =>
                setDraft((d) => ({ ...d, supplier_type: e.target.value as SupplierType }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
            >
              <option value="EME">EME</option>
              <option value="QSE">QSE</option>
              <option value="Generic">Generic</option>
            </select>
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block text-base font-medium text-slate-800">Local or imported</span>
            <select
              value={(draft.is_imported ?? baselineSupplier.is_imported) ? 'imported' : 'local'}
              onChange={(e) =>
                setDraft((d) => ({ ...d, is_imported: e.target.value === 'imported' }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
            >
              <option value="local">Local</option>
              <option value="imported">Imported</option>
            </select>
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block text-base font-medium text-slate-800">Scenario spend</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={draft.value_ex_vat ?? baselineSupplier.value_ex_vat}
              onChange={(e) =>
                setDraft((d) => ({ ...d, value_ex_vat: Number(e.target.value) || 0 }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
            />
          </label>

          <label className="mb-6 flex items-center gap-3 text-base text-slate-800">
            <input
              type="checkbox"
              checked={draft.excluded ?? false}
              onChange={(e) => setDraft((d) => ({ ...d, excluded: e.target.checked }))}
              className="h-5 w-5 rounded border-slate-300"
            />
            Exclude this supplier from the scenario
          </label>

          <FieldRow
            label="Recognised spend"
            original={formatCurrencyZar(impact?.actualRecognised ?? 0)}
            scenario={formatCurrencyZar(impact?.scenarioRecognised ?? 0)}
          />
          <FieldRow
            label="Overall points impact"
            original="—"
            scenario={
              impact
                ? `${impact.pointsImpact >= 0 ? '+' : ''}${formatPoints(impact.pointsImpact)}`
                : '—'
            }
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 p-6">
          <button
            type="button"
            onClick={applyChanges}
            className={buttonStyles({ variant: 'primary', size: 'md', className: 'text-base px-6 py-3' })}
          >
            Apply scenario change
          </button>
          <button
            type="button"
            onClick={onClose}
            className={buttonStyles({ variant: 'secondary', size: 'md', className: 'text-base px-6 py-3' })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={restoreOriginal}
            className={buttonStyles({ variant: 'ghost', size: 'md', className: 'text-base' })}
          >
            Restore original values
          </button>
        </div>
      </div>
    </div>
  )
}
