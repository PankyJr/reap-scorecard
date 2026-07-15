'use client'

import { formatCurrencyZar } from '@/lib/procurement/format'
import type { ProcurementPositionComparison } from '@/lib/procurement/simulator'
import {
  formatAberdarePoints,
  formatAberdarePointsImpact,
  type AberdareParseResult,
  type AberdareSupplierRow,
} from '@/lib/clients/aberdare'
import type { SupplierScenarioOverride } from '@/lib/procurement/simulator'
import { ABERDARE_THEME } from './theme'

interface AberdareScenarioSummaryProps {
  open: boolean
  onClose(): void
  parseResult: AberdareParseResult
  comparison: ProcurementPositionComparison
  overrides: Record<string, SupplierScenarioOverride>
  suppliers: AberdareSupplierRow[]
}

export function AberdareScenarioSummary({
  open,
  onClose,
  parseResult,
  comparison,
  overrides,
  suppliers,
}: AberdareScenarioSummaryProps) {
  if (!open) return null

  const modified = suppliers.filter((s) => s.id in overrides)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Procurement Scenario Summary"
      data-testid="aberdare-scenario-summary"
    >
      <div className="w-full max-w-3xl rounded-xl bg-white p-8 shadow-xl print:shadow-none">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div>
            <h2
              className="text-2xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              Procurement Scenario Summary
            </h2>
            <p className="mt-1 text-base" style={{ color: ABERDARE_THEME.muted }}>
              Client-facing overview for discussion — not a Code 400 report.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center rounded-lg border px-4 text-base font-semibold"
              style={{ borderColor: ABERDARE_THEME.border }}
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-lg border px-4 text-base font-semibold"
              style={{ borderColor: ABERDARE_THEME.border }}
            >
              Close
            </button>
          </div>
        </div>

        <dl className="mt-8 space-y-4 text-base">
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Source report
            </dt>
            <dd>{parseResult.sourceFileName}</dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Reporting entity
            </dt>
            <dd>{parseResult.reportingEntities[0] ?? 'ABFI'}</dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Current procurement position
            </dt>
            <dd>
              {formatAberdarePoints(comparison.actual.totalScore)} /{' '}
              {formatAberdarePoints(comparison.actual.maxPoints)} points · Recognised{' '}
              {formatCurrencyZar(comparison.actual.recognisedBbbeeSpend)} ·
              Eligible {formatCurrencyZar(comparison.actual.totalMeasuredSpend)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Projected procurement position
            </dt>
            <dd>
              {formatAberdarePoints(comparison.scenario.totalScore)} /{' '}
              {formatAberdarePoints(comparison.scenario.maxPoints)} points · Recognised{' '}
              {formatCurrencyZar(comparison.scenario.recognisedBbbeeSpend)} ·
              Eligible {formatCurrencyZar(comparison.scenario.totalMeasuredSpend)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Point impact
            </dt>
            <dd>
              {formatAberdarePointsImpact(
                comparison.actual.totalScore,
                comparison.scenario.totalScore,
              )}{' '}
              points
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Imported spend excluded
            </dt>
            <dd>
              {formatCurrencyZar(parseResult.reconciliation.explicitImportSpend)}{' '}
              ({parseResult.reconciliation.explicitImportCount} suppliers)
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Modified suppliers
            </dt>
            <dd>
              {modified.length === 0 ? (
                'None'
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {modified.map((s) => {
                    const o = overrides[s.id]!
                    const parts: string[] = []
                    if (o.level) parts.push(`level → ${o.level}`)
                    if (o.compliance_status)
                      parts.push(`compliance → ${o.compliance_status}`)
                    if (o.value_ex_vat !== undefined)
                      parts.push(`spend → ${formatCurrencyZar(o.value_ex_vat)}`)
                    if (o.is_imported !== undefined)
                      parts.push(
                        o.is_imported ? 'classified imported' : 'classified local',
                      )
                    if (o.excluded) parts.push('excluded')
                    return (
                      <li key={s.id}>
                        {s.vendorName} ({s.vendorCode}):{' '}
                        {parts.join(', ') || 'updated'}
                      </li>
                    )
                  })}
                </ul>
              )}
            </dd>
          </div>
        </dl>

        <p
          className="mt-8 rounded-lg border p-4 text-base leading-relaxed"
          style={{
            borderColor: ABERDARE_THEME.border,
            background: ABERDARE_THEME.cyanSoft,
            color: ABERDARE_THEME.text,
          }}
        >
          Provisional-rule note: Imported spend is currently excluded using the
          report’s Import indicator. Final exemption treatment will be confirmed
          with Aberdare. This summary is for scenario discussion only and is not a
          verified final compliance calculation or Code 400 report.
        </p>
      </div>
    </div>
  )
}
