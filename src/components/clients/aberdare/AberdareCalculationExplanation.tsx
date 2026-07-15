'use client'

import { formatCurrencyZar } from '@/lib/procurement/format'
import {
  buildAberdareTmpsBridge,
  formatAberdarePoints,
  formatAberdarePointsImpact,
} from '@/lib/clients/aberdare'
import type { AberdareParseResult } from '@/lib/clients/aberdare'
import type { ProcurementPositionComparison } from '@/lib/procurement/simulator'
import { ABERDARE_THEME } from './theme'

interface AberdareCalculationExplanationProps {
  open: boolean
  onClose(): void
  parseResult: AberdareParseResult
  comparison: ProcurementPositionComparison
}

export function AberdareCalculationExplanation({
  open,
  onClose,
  parseResult,
  comparison,
}: AberdareCalculationExplanationProps) {
  if (!open) return null

  const { reconciliation } = parseResult
  const { actual, scenario } = comparison
  const bridge = buildAberdareTmpsBridge({
    sourceSpendTotal: reconciliation.sourceSpendTotal,
    explicitImportSpend: reconciliation.explicitImportSpend,
    combinedNegativeSpend: reconciliation.combinedNegativeSpend,
    provisionalEligibleTmps: actual.totalMeasuredSpend,
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="How was this calculated"
      data-testid="aberdare-calculation-explanation"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-2xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              How was this calculated?
            </h2>
            <p className="mt-1 text-base" style={{ color: ABERDARE_THEME.muted }}>
              Plain-language breakdown of the provisional Live Procurement figures.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-lg border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: ABERDARE_THEME.border }}
          >
            Close
          </button>
        </div>

        <dl className="mt-8 space-y-4 text-base" style={{ color: ABERDARE_THEME.text }}>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Source spend
            </dt>
            <dd>{formatCurrencyZar(reconciliation.sourceSpendTotal)}</dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Imported spend excluded
            </dt>
            <dd>
              {formatCurrencyZar(reconciliation.explicitImportSpend)} (
              {reconciliation.explicitImportCount} suppliers marked Import = Y)
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Credit or reversal-line treatment
            </dt>
            <dd>
              {reconciliation.negativeSpendRows} credit or reversal lines totalling{' '}
              {formatCurrencyZar(Math.abs(reconciliation.combinedNegativeSpend))}{' '}
              are preserved in the source report. The provisional calculation currently
              excludes negative credit or reversal lines pending confirmation.
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Source total minus imported spend
            </dt>
            <dd>{formatCurrencyZar(bridge.sourceMinusImport)}</dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Provisional eligible spend
            </dt>
            <dd>
              {formatCurrencyZar(bridge.provisionalEligibleTmps)}
              <span className="mt-1 block text-base" style={{ color: ABERDARE_THEME.muted }}>
                Differs from source-minus-import by{' '}
                {formatCurrencyZar(bridge.differenceFromSourceMinusImport)} because
                negative lines are excluded from the provisional denominator.
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Recognised spend
            </dt>
            <dd>{formatCurrencyZar(actual.recognisedBbbeeSpend)}</dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Current procurement points
            </dt>
            <dd>
              {formatAberdarePoints(actual.totalScore)} /{' '}
              {formatAberdarePoints(actual.maxPoints)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Projected procurement points
            </dt>
            <dd>
              {formatAberdarePoints(scenario.totalScore)} /{' '}
              {formatAberdarePoints(scenario.maxPoints)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: ABERDARE_THEME.muted }}>
              Point impact
            </dt>
            <dd>
              {formatAberdarePointsImpact(actual.totalScore, scenario.totalScore)}{' '}
              points
              <span className="mt-1 block text-base" style={{ color: ABERDARE_THEME.muted }}>
                Impact is the difference between the displayed rounded scores.
              </span>
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
          Provisional-rule notice: Imported spend is excluded using the report’s Import
          indicator. Negative credit or reversal lines are currently excluded from the
          provisional eligible spend. Final treatment of imports and credit notes will
          be confirmed with Aberdare. This is not a verified final compliance calculation.
        </p>
      </div>
    </div>
  )
}
