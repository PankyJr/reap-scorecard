'use client'

import { formatCurrencyZar, formatPoints } from '@/lib/procurement/format'
import type { ProcurementPositionComparison } from '@/lib/procurement/simulator'

interface SimulatorSummaryProps {
  comparison: ProcurementPositionComparison
  viewMode: 'compare' | 'actual' | 'scenario'
}

function SummaryBlock({
  title,
  badge,
  points,
  maxPoints,
  measuredSpend,
  recognisedSpend,
  importedSpend,
  nonCompliantSpend,
  supplierCount,
  activeCount,
  reportingPeriod,
}: {
  title: string
  badge: string
  points: number
  maxPoints: number
  measuredSpend: number
  recognisedSpend: number
  importedSpend: number
  nonCompliantSpend: number
  supplierCount: number
  activeCount: number
  reportingPeriod: string
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {badge}
        </span>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-base text-slate-600">Procurement points</dt>
          <dd className="mt-1 text-2xl font-semibold text-slate-950">
            {formatPoints(points)}
            <span className="ml-2 text-base font-normal text-slate-500">
              of {formatPoints(maxPoints)} max
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-base text-slate-600">Total measured spend</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-950">
            {formatCurrencyZar(measuredSpend)}
          </dd>
        </div>
        <div>
          <dt className="text-base text-slate-600">Recognised B-BBEE spend</dt>
          <dd className="mt-1 text-xl font-semibold text-slate-950">
            {formatCurrencyZar(recognisedSpend)}
          </dd>
        </div>
        <div>
          <dt className="text-base text-slate-600">Reporting period</dt>
          <dd className="mt-1 text-lg font-medium text-slate-900">{reportingPeriod}</dd>
        </div>
        <div>
          <dt className="text-base text-slate-600">Imported spend</dt>
          <dd className="mt-1 text-lg font-medium text-slate-900">
            {formatCurrencyZar(importedSpend)}
          </dd>
        </div>
        <div>
          <dt className="text-base text-slate-600">Non-compliant spend</dt>
          <dd className="mt-1 text-lg font-medium text-slate-900">
            {formatCurrencyZar(nonCompliantSpend)}
          </dd>
        </div>
        <div>
          <dt className="text-base text-slate-600">Suppliers</dt>
          <dd className="mt-1 text-lg font-medium text-slate-900">
            {activeCount} active of {supplierCount}
          </dd>
        </div>
      </dl>
    </section>
  )
}

export function SimulatorSummary({ comparison, viewMode }: SimulatorSummaryProps) {
  const { actual, scenario, pointsDifference, recognisedSpendDifference, modifiedSupplierCount } =
    comparison
  const impactClass =
    pointsDifference > 0
      ? 'text-emerald-700'
      : pointsDifference < 0
        ? 'text-red-700'
        : 'text-slate-700'

  return (
    <div className="space-y-4">
      {viewMode !== 'scenario' && (
        <SummaryBlock
          title="Actual position"
          badge="Uploaded baseline — read only"
          points={actual.totalScore}
          maxPoints={actual.maxPoints}
          measuredSpend={actual.totalMeasuredSpend}
          recognisedSpend={actual.recognisedBbbeeSpend}
          importedSpend={actual.importedSpend}
          nonCompliantSpend={actual.nonCompliantSpend}
          supplierCount={actual.supplierCount}
          activeCount={actual.activeSupplierCount}
          reportingPeriod={actual.reportingPeriod}
        />
      )}

      {viewMode !== 'actual' && (
        <SummaryBlock
          title="Scenario position"
          badge={
            modifiedSupplierCount > 0
              ? `${modifiedSupplierCount} supplier change${modifiedSupplierCount === 1 ? '' : 's'}`
              : 'No changes yet'
          }
          points={scenario.totalScore}
          maxPoints={scenario.maxPoints}
          measuredSpend={scenario.totalMeasuredSpend}
          recognisedSpend={scenario.recognisedBbbeeSpend}
          importedSpend={scenario.importedSpend}
          nonCompliantSpend={scenario.nonCompliantSpend}
          supplierCount={scenario.supplierCount}
          activeCount={scenario.activeSupplierCount}
          reportingPeriod={scenario.reportingPeriod}
        />
      )}

      {viewMode === 'compare' && (
        <section className="rounded-2xl border border-slate-300 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold text-slate-900">Impact summary</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-base text-slate-600">Current points</p>
              <p className="text-2xl font-semibold text-slate-950">
                {formatPoints(actual.totalScore)}
              </p>
            </div>
            <div>
              <p className="text-base text-slate-600">Projected points</p>
              <p className="text-2xl font-semibold text-slate-950">
                {formatPoints(scenario.totalScore)}
              </p>
            </div>
            <div>
              <p className="text-base text-slate-600">Impact</p>
              <p className={`text-2xl font-semibold ${impactClass}`}>
                {pointsDifference >= 0 ? '+' : ''}
                {formatPoints(pointsDifference)} points
              </p>
              <p className="mt-1 text-base text-slate-600">
                Recognised spend change:{' '}
                {recognisedSpendDifference >= 0 ? '+' : ''}
                {formatCurrencyZar(recognisedSpendDifference)}
              </p>
            </div>
          </div>
        </section>
      )}

      {comparison.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-950">
          <p className="font-medium">Development note</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {comparison.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
