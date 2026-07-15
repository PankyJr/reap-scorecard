'use client'

import { formatCurrencyZar } from '@/lib/procurement/format'
import type { ProcurementPositionComparison } from '@/lib/procurement/simulator'
import {
  buildAberdareTmpsBridge,
  displayedPointsImpact,
  formatAberdarePoints,
  formatAberdarePointsImpact,
  type AberdareParseResult,
} from '@/lib/clients/aberdare'
import { ABERDARE_THEME } from './theme'

interface AberdarePositionSummaryProps {
  parseResult: AberdareParseResult
  comparison: ProcurementPositionComparison
  onReviewImportDetails(): void
  showImportDetails: boolean
  onHowCalculated(): void
}

export function AberdarePositionSummary({
  parseResult,
  comparison,
  onReviewImportDetails,
  showImportDetails,
  onHowCalculated,
}: AberdarePositionSummaryProps) {
  const { actual, scenario, modifiedSupplierCount } = comparison
  const { reconciliation } = parseResult
  const displayedImpact = displayedPointsImpact(
    actual.totalScore,
    scenario.totalScore,
  )
  const impactPositive = displayedImpact > 0
  const impactNegative = displayedImpact < 0
  const bridge = buildAberdareTmpsBridge({
    sourceSpendTotal: reconciliation.sourceSpendTotal,
    explicitImportSpend: reconciliation.explicitImportSpend,
    combinedNegativeSpend: reconciliation.combinedNegativeSpend,
    provisionalEligibleTmps: actual.totalMeasuredSpend,
  })

  return (
    <div className="space-y-6" data-testid="aberdare-position-summary">
      <section
        className="rounded-xl border bg-white p-6 sm:p-8"
        style={{ borderColor: ABERDARE_THEME.border }}
      >
        <h2
          className="text-2xl font-semibold tracking-tight"
          style={{ color: ABERDARE_THEME.charcoal }}
        >
          Current procurement position
        </h2>
        <p className="mt-2 text-base leading-relaxed sm:text-lg" style={{ color: ABERDARE_THEME.muted }}>
          {parseResult.suppliers.length} suppliers loaded from{' '}
          <span className="font-medium" style={{ color: ABERDARE_THEME.text }}>
            {parseResult.sourceFileName}
          </span>
          .
        </p>

        <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-base" style={{ color: ABERDARE_THEME.muted }}>
              Reporting entity
            </dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              {parseResult.reportingEntities[0] ?? 'ABFI'}
            </dd>
          </div>
          <div>
            <dt className="text-base" style={{ color: ABERDARE_THEME.muted }}>
              Source spend
            </dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              {formatCurrencyZar(reconciliation.sourceSpendTotal)}
            </dd>
          </div>
          <div>
            <dt className="text-base" style={{ color: ABERDARE_THEME.muted }}>
              Imported spend excluded
            </dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              {formatCurrencyZar(reconciliation.explicitImportSpend)}
            </dd>
          </div>
          <div>
            <dt className="text-base" style={{ color: ABERDARE_THEME.muted }}>
              Eligible provisional spend
            </dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
              data-testid="aberdare-eligible-tmps"
            >
              {formatCurrencyZar(actual.totalMeasuredSpend)}
            </dd>
          </div>
          <div>
            <dt className="text-base" style={{ color: ABERDARE_THEME.muted }}>
              Recognised spend
            </dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              {formatCurrencyZar(actual.recognisedBbbeeSpend)}
            </dd>
          </div>
          <div>
            <dt className="text-base" style={{ color: ABERDARE_THEME.muted }}>
              Current procurement points
            </dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
              data-testid="aberdare-current-points"
            >
              {formatAberdarePoints(actual.totalScore)} /{' '}
              {formatAberdarePoints(actual.maxPoints)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onReviewImportDetails}
            className="inline-flex min-h-11 items-center rounded-lg border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              borderColor: ABERDARE_THEME.cyanDark,
              color: ABERDARE_THEME.cyanDark,
            }}
          >
            {showImportDetails ? 'Hide import details' : 'Review import details'}
          </button>
          <button
            type="button"
            onClick={onHowCalculated}
            className="inline-flex min-h-11 items-center rounded-lg border px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ borderColor: ABERDARE_THEME.border, color: ABERDARE_THEME.text }}
            data-testid="aberdare-how-calculated"
          >
            How was this calculated?
          </button>
        </div>

        {showImportDetails ? (
          <div
            className="mt-4 rounded-lg border p-5"
            style={{
              borderColor: ABERDARE_THEME.border,
              background: ABERDARE_THEME.cyanSoft,
            }}
            data-testid="aberdare-import-details"
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              Import and eligible-spend reconciliation
            </h3>
            <ul className="mt-3 space-y-2 text-base" style={{ color: ABERDARE_THEME.text }}>
              <li>
                Source report total:{' '}
                <strong>{formatCurrencyZar(reconciliation.sourceSpendTotal)}</strong>
              </li>
              <li>
                Explicit imported supplier spend excluded:{' '}
                <strong>
                  {formatCurrencyZar(reconciliation.explicitImportSpend)}
                </strong>
              </li>
              <li>
                Source total minus imported spend:{' '}
                <strong>{formatCurrencyZar(bridge.sourceMinusImport)}</strong>
              </li>
              <li>
                Negative credit or reversal lines:{' '}
                <strong>
                  {reconciliation.negativeSpendRows} lines totalling{' '}
                  {formatCurrencyZar(Math.abs(reconciliation.combinedNegativeSpend))}
                </strong>
              </li>
              <li>
                Treatment of negative lines in the provisional calculation:{' '}
                <strong>Currently excluded from eligible procurement spend</strong>
              </li>
              <li>
                Provisional eligible TMPS:{' '}
                <strong>{formatCurrencyZar(bridge.provisionalEligibleTmps)}</strong>
              </li>
              <li>
                Difference from simple source-minus-import calculation:{' '}
                <strong>
                  {formatCurrencyZar(bridge.differenceFromSourceMinusImport)}
                </strong>
              </li>
              <li>
                Reported Import Spend Exempt Value:{' '}
                <strong>
                  {formatCurrencyZar(reconciliation.importSpendExemptTotal)}
                </strong>
              </li>
              <li>
                Import spend vs Import Spend Exempt Value difference:{' '}
                <strong>
                  {formatCurrencyZar(
                    reconciliation.explicitImportSpend -
                      reconciliation.importSpendExemptTotal,
                  )}
                </strong>
              </li>
            </ul>
            <p className="mt-4 text-base leading-relaxed" style={{ color: ABERDARE_THEME.text }}>
              Two credit or reversal lines totalling{' '}
              {formatCurrencyZar(Math.abs(reconciliation.combinedNegativeSpend))} were
              detected. Their final treatment in eligible procurement spend requires
              confirmation with Aberdare.
            </p>
            <p className="mt-3 text-base leading-relaxed" style={{ color: ABERDARE_THEME.text }}>
              The provisional calculation currently excludes negative credit or reversal
              lines pending confirmation.
            </p>
            <p className="mt-3 text-base leading-relaxed" style={{ color: ABERDARE_THEME.text }}>
              Imported spend is currently excluded using the report’s Import indicator.
              Final exemption treatment will be confirmed with Aberdare.
            </p>
          </div>
        ) : null}

        {(reconciliation.mismatches.length > 0 ||
          reconciliation.negativeSpendRows > 0) && (
          <div
            className="mt-6 rounded-lg border p-5"
            style={{ borderColor: '#F0D9A8', background: '#FFF8EB' }}
            data-testid="aberdare-data-quality"
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              Data issues requiring review
            </h3>
            <ul className="mt-3 space-y-2 text-base" style={{ color: ABERDARE_THEME.text }}>
              {reconciliation.negativeSpendRows > 0 ? (
                <li>
                  {reconciliation.negativeSpendRows} credit or reversal lines
                  detected ({formatCurrencyZar(reconciliation.combinedNegativeSpend)}).
                  The provisional calculation currently excludes these from eligible
                  spend pending confirmation.
                </li>
              ) : null}
              {reconciliation.unknownPlaceholderFieldCount > 0 ? (
                <li>
                  {reconciliation.unknownPlaceholderFieldCount} placeholder field
                  values marked as not provided or unknown.
                </li>
              ) : null}
              {reconciliation.multiplierDiscrepancyCount > 0 ? (
                <li>
                  {reconciliation.multiplierDiscrepancyCount} rows where the
                  workbook multiplier differs from the platform recognition mapping.
                </li>
              ) : null}
              {reconciliation.mismatches.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section
        className="rounded-xl border bg-white p-6 sm:p-8"
        style={{ borderColor: ABERDARE_THEME.border }}
        data-testid="aberdare-comparison"
      >
        <h2
          className="text-2xl font-semibold"
          style={{ color: ABERDARE_THEME.charcoal }}
        >
          Current position vs projected scenario
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-base font-medium" style={{ color: ABERDARE_THEME.muted }}>
              Current position
            </p>
            <p
              className="mt-1 text-2xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              {formatAberdarePoints(actual.totalScore)} /{' '}
              {formatAberdarePoints(actual.maxPoints)}
            </p>
            <p className="mt-2 text-base" style={{ color: ABERDARE_THEME.text }}>
              Recognised: {formatCurrencyZar(actual.recognisedBbbeeSpend)}
            </p>
            <p className="text-base" style={{ color: ABERDARE_THEME.text }}>
              Eligible: {formatCurrencyZar(actual.totalMeasuredSpend)}
            </p>
          </div>
          <div>
            <p className="text-base font-medium" style={{ color: ABERDARE_THEME.muted }}>
              Projected scenario
            </p>
            <p
              className="mt-1 text-2xl font-semibold"
              style={{ color: ABERDARE_THEME.charcoal }}
              data-testid="aberdare-projected-points"
            >
              {formatAberdarePoints(scenario.totalScore)} /{' '}
              {formatAberdarePoints(scenario.maxPoints)}
            </p>
            <p className="mt-2 text-base" style={{ color: ABERDARE_THEME.text }}>
              Recognised: {formatCurrencyZar(scenario.recognisedBbbeeSpend)}
            </p>
            <p className="text-base" style={{ color: ABERDARE_THEME.text }}>
              Eligible: {formatCurrencyZar(scenario.totalMeasuredSpend)}
            </p>
          </div>
          <div>
            <p className="text-base font-medium" style={{ color: ABERDARE_THEME.muted }}>
              Point impact
            </p>
            <p
              className="mt-1 text-2xl font-semibold"
              style={{
                color: impactPositive
                  ? ABERDARE_THEME.success
                  : impactNegative
                    ? ABERDARE_THEME.danger
                    : ABERDARE_THEME.charcoal,
              }}
              data-testid="aberdare-displayed-impact"
            >
              {formatAberdarePointsImpact(actual.totalScore, scenario.totalScore)}{' '}
              points
            </p>
            <p className="mt-2 text-base" style={{ color: ABERDARE_THEME.text }}>
              Modified suppliers: {modifiedSupplierCount}
            </p>
            <p className="text-base" style={{ color: ABERDARE_THEME.text }}>
              Imported spend excluded:{' '}
              {formatCurrencyZar(scenario.importedSpend)}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
