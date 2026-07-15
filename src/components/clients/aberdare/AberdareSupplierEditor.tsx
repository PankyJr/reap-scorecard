'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { calculateSupplierRow } from '@/lib/procurement/rows'
import { formatCurrencyZar } from '@/lib/procurement/format'
import {
  calculateAberdareScenario,
  formatAberdarePoints,
  formatAberdarePointsImpact,
  importStatusLabel,
  type AberdareSupplierRow,
} from '@/lib/clients/aberdare'
import type {
  ComplianceStatus,
  SupplierScenarioOverride,
} from '@/lib/procurement/simulator'
import { ABERDARE_THEME } from './theme'

interface AberdareSupplierEditorProps {
  open: boolean
  supplier: AberdareSupplierRow | null
  allSuppliers: AberdareSupplierRow[]
  currentOverride: SupplierScenarioOverride | undefined
  allOverrides: Record<string, SupplierScenarioOverride>
  reportingPeriod: string
  onClose(): void
  onApply(supplierId: string, override: SupplierScenarioOverride | undefined): void
}

function levelOptions() {
  return ['1', '2', '3', '4', '5', '6', '7', '8', 'Non-Compliant']
}

function AberdareSupplierEditorForm({
  supplier,
  allSuppliers,
  currentOverride,
  allOverrides,
  reportingPeriod,
  onClose,
  onApply,
}: Omit<AberdareSupplierEditorProps, 'open'> & { supplier: AberdareSupplierRow }) {
  const [draft, setDraft] = useState<SupplierScenarioOverride>(() =>
    currentOverride ? { ...currentOverride } : {},
  )

  const merged = useMemo(() => {
    return {
      ...supplier.simulator,
      ...draft,
      level: draft.level ?? supplier.simulator.level,
      value_ex_vat: draft.value_ex_vat ?? supplier.simulator.value_ex_vat,
      is_imported: draft.is_imported ?? supplier.simulator.is_imported,
      compliance_status:
        draft.compliance_status ?? supplier.simulator.compliance_status,
      excluded: draft.excluded ?? false,
    }
  }, [supplier, draft])

  const impact = useMemo(() => {
    const nextOverride: SupplierScenarioOverride = { ...draft }
    if (Object.keys(nextOverride).length === 0 && !currentOverride) {
      return calculateAberdareScenario(allSuppliers, allOverrides, reportingPeriod)
    }
    const overrides = {
      ...allOverrides,
      [supplier.id]: nextOverride,
    }
    return calculateAberdareScenario(allSuppliers, overrides, reportingPeriod)
  }, [
    supplier,
    draft,
    currentOverride,
    allSuppliers,
    allOverrides,
    reportingPeriod,
  ])

  const originalCalc = calculateSupplierRow({
    supplier_name: supplier.simulator.supplier_name,
    supplier_type: supplier.simulator.supplier_type,
    level: supplier.simulator.level,
    value_ex_vat: supplier.simulator.value_ex_vat,
    is_51_black_owned: supplier.simulator.is_51_black_owned,
    is_30_black_women_owned: supplier.simulator.is_30_black_women_owned,
    is_51_bdgs: supplier.simulator.is_51_bdgs,
  })

  const effectiveLevel =
    merged.compliance_status === 'non-compliant' ||
    merged.compliance_status === 'unknown' ||
    merged.compliance_status === 'expired'
      ? 'Non-Compliant'
      : merged.level

  const projectedRecognised = draft.excluded
    ? 0
    : calculateSupplierRow({
        supplier_name: merged.supplier_name,
        supplier_type: merged.supplier_type,
        level: effectiveLevel,
        value_ex_vat: merged.value_ex_vat,
        is_51_black_owned: merged.is_51_black_owned,
        is_30_black_women_owned: merged.is_30_black_women_owned,
        is_51_bdgs: merged.is_51_bdgs,
      }).bbbee_spend

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="Adjust supplier details"
      data-testid="aberdare-supplier-editor"
    >
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
        style={{ color: ABERDARE_THEME.text }}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-6 py-5"
          style={{ borderColor: ABERDARE_THEME.border }}
        >
          <div>
            <p
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: ABERDARE_THEME.cyanDark }}
            >
              Scenario editor
            </p>
            <h2
              className="mt-1 text-2xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              {supplier.vendorName}
            </h2>
            <p className="mt-1 text-base" style={{ color: ABERDARE_THEME.muted }}>
              Vendor code {supplier.vendorCode || '—'} · Changes affect the
              projected scenario only. The uploaded baseline stays unchanged.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div
            className="grid grid-cols-3 gap-2 border-b pb-2 text-sm font-semibold"
            style={{
              borderColor: ABERDARE_THEME.border,
              color: ABERDARE_THEME.muted,
            }}
          >
            <span>Field</span>
            <span>Current (actual)</span>
            <span>Scenario</span>
          </div>

          <label className="block text-base font-medium">
            B-BBEE level
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div
                className="min-h-11 rounded-lg border px-3 py-2"
                style={{ borderColor: ABERDARE_THEME.border }}
              >
                {supplier.level === 'Non-Compliant'
                  ? 'Non-Compliant'
                  : `Level ${supplier.level}`}
              </div>
              <select
                value={draft.level ?? supplier.level}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    level: e.target.value,
                    compliance_status:
                      e.target.value === 'Non-Compliant'
                        ? 'non-compliant'
                        : 'compliant',
                  }))
                }
                className="min-h-11 rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
                style={{ borderColor: ABERDARE_THEME.border }}
              >
                {levelOptions().map((l) => (
                  <option key={l} value={l}>
                    {l === 'Non-Compliant' ? 'Non-Compliant' : `Level ${l}`}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="block text-base font-medium">
            Compliance status
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div
                className="min-h-11 rounded-lg border px-3 py-2 capitalize"
                style={{ borderColor: ABERDARE_THEME.border }}
              >
                {supplier.complianceStatus.replace('-', ' ')}
              </div>
              <select
                value={draft.compliance_status ?? supplier.complianceStatus}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    compliance_status: e.target.value as ComplianceStatus,
                    ...(e.target.value === 'non-compliant'
                      ? { level: 'Non-Compliant' }
                      : {}),
                  }))
                }
                className="min-h-11 rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
                style={{ borderColor: ABERDARE_THEME.border }}
              >
                <option value="compliant">Compliant</option>
                <option value="non-compliant">Non-compliant</option>
                <option value="unknown">Unknown</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </label>

          <label className="block text-base font-medium">
            Scenario spend (excl. VAT)
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div
                className="min-h-11 rounded-lg border px-3 py-2"
                style={{ borderColor: ABERDARE_THEME.border }}
              >
                {formatCurrencyZar(supplier.amountExVat)}
              </div>
              <input
                type="number"
                step="0.01"
                value={draft.value_ex_vat ?? supplier.amountExVat}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    value_ex_vat: Number(e.target.value),
                  }))
                }
                className="min-h-11 rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
                style={{ borderColor: ABERDARE_THEME.border }}
              />
            </div>
          </label>

          <label className="block text-base font-medium">
            Imported / local classification
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div
                className="min-h-11 rounded-lg border px-3 py-2"
                style={{ borderColor: ABERDARE_THEME.border }}
              >
                {importStatusLabel(supplier.importClassification)}
              </div>
              <select
                value={
                  draft.is_imported === undefined
                    ? supplier.simulator.is_imported
                      ? 'imported'
                      : 'local'
                    : draft.is_imported
                      ? 'imported'
                      : 'local'
                }
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    is_imported: e.target.value === 'imported',
                  }))
                }
                className="min-h-11 rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2"
                style={{ borderColor: ABERDARE_THEME.border }}
              >
                <option value="local">Local / not imported for scoring</option>
                <option value="imported">Imported (excluded from scoring)</option>
              </select>
            </div>
          </label>

          <label className="flex min-h-11 items-center gap-3 text-base font-medium">
            <input
              type="checkbox"
              checked={draft.excluded === true}
              onChange={(e) =>
                setDraft((d) => ({ ...d, excluded: e.target.checked }))
              }
              className="h-5 w-5"
            />
            Exclude supplier from scenario
          </label>

          <div
            className="rounded-lg border p-4"
            style={{ borderColor: ABERDARE_THEME.border, background: '#FAFBFC' }}
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              Immediate impact preview
            </h3>
            <dl className="mt-3 grid gap-3 text-base sm:grid-cols-2">
              <div>
                <dt style={{ color: ABERDARE_THEME.muted }}>Current recognition</dt>
                <dd className="font-semibold">
                  {(originalCalc.recognition_percent * 100).toFixed(0)}% ·{' '}
                  {formatCurrencyZar(originalCalc.bbbee_spend)}
                </dd>
              </div>
              <div>
                <dt style={{ color: ABERDARE_THEME.muted }}>Projected recognition</dt>
                <dd className="font-semibold">
                  {effectiveLevel === 'Non-Compliant'
                    ? '0%'
                    : `${(
                        calculateSupplierRow({
                          supplier_name: merged.supplier_name,
                          supplier_type: merged.supplier_type,
                          level: effectiveLevel,
                          value_ex_vat: merged.value_ex_vat,
                          is_51_black_owned: merged.is_51_black_owned,
                          is_30_black_women_owned: merged.is_30_black_women_owned,
                          is_51_bdgs: merged.is_51_bdgs,
                        }).recognition_percent * 100
                      ).toFixed(0)}%`}{' '}
                  · {formatCurrencyZar(projectedRecognised)}
                </dd>
              </div>
              {impact ? (
                <div className="sm:col-span-2">
                  <dt style={{ color: ABERDARE_THEME.muted }}>
                    Projected procurement points
                  </dt>
                  <dd className="font-semibold">
                    {formatAberdarePoints(impact.scenario.totalScore)} /{' '}
                    {formatAberdarePoints(impact.scenario.maxPoints)} (
                    {formatAberdarePointsImpact(
                      impact.actual.totalScore,
                      impact.scenario.totalScore,
                    )}{' '}
                    vs current)
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <details
            className="rounded-lg border p-4"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            <summary className="cursor-pointer text-base font-semibold">
              Additional supplier fields
            </summary>
            <dl className="mt-3 grid gap-2 text-base sm:grid-cols-2">
              <div>
                <dt style={{ color: ABERDARE_THEME.muted }}>Certificate</dt>
                <dd>{supplier.certificateRaw || 'Not provided'}</dd>
              </div>
              <div>
                <dt style={{ color: ABERDARE_THEME.muted }}>Multiplier</dt>
                <dd>{supplier.multiplierRaw || '—'}</dd>
              </div>
              <div>
                <dt style={{ color: ABERDARE_THEME.muted }}>Region</dt>
                <dd>{supplier.region || '—'}</dd>
              </div>
              <div>
                <dt style={{ color: ABERDARE_THEME.muted }}>Payment term</dt>
                <dd>
                  {supplier.paymentTermDescription || supplier.paymentTerm || '—'}
                </dd>
              </div>
              <div>
                <dt style={{ color: ABERDARE_THEME.muted }}>Import spend exempt</dt>
                <dd>
                  {supplier.importSpendExemptValue == null
                    ? '—'
                    : formatCurrencyZar(supplier.importSpendExemptValue)}
                </dd>
              </div>
              <div>
                <dt style={{ color: ABERDARE_THEME.muted }}>Spend exempt</dt>
                <dd>{supplier.spendExemptNormalised}</dd>
              </div>
            </dl>
          </details>
        </div>

        <div
          className="mt-auto flex flex-wrap gap-3 border-t px-6 py-5"
          style={{ borderColor: ABERDARE_THEME.border }}
        >
          <button
            type="button"
            onClick={() => {
              const cleaned = { ...draft }
              if (!cleaned.excluded) delete cleaned.excluded
              const keys = Object.keys(cleaned)
              onApply(supplier.id, keys.length ? cleaned : undefined)
              onClose()
            }}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ background: ABERDARE_THEME.cyanDark }}
            data-testid="aberdare-apply-change"
          >
            Apply change
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(supplier.id, undefined)
              onClose()
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            Restore original
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function AberdareSupplierEditor({
  open,
  supplier,
  allSuppliers,
  currentOverride,
  allOverrides,
  reportingPeriod,
  onClose,
  onApply,
}: AberdareSupplierEditorProps) {
  if (!open || !supplier) return null

  return (
    <AberdareSupplierEditorForm
      key={`${supplier.id}:${JSON.stringify(currentOverride ?? {})}`}
      supplier={supplier}
      allSuppliers={allSuppliers}
      currentOverride={currentOverride}
      allOverrides={allOverrides}
      reportingPeriod={reportingPeriod}
      onClose={onClose}
      onApply={onApply}
    />
  )
}
