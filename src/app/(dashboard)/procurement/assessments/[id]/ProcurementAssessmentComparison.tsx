import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  type ProcurementComparisonSnapshot,
  formatSignedPoints,
} from '@/lib/procurement/compareAssessments'
import { formatCurrencyZar } from '@/lib/procurement/format'
import { cardSurface } from './ProcurementAssessmentInsights'

function signedCurrency(delta: number): string {
  const mag = formatCurrencyZar(Math.abs(delta))
  if (delta > 0.5) return `+${mag}`
  if (delta < -0.5) return `−${mag}`
  return formatCurrencyZar(0)
}

export function ProcurementAssessmentComparison({
  comparison,
}: {
  comparison: ProcurementComparisonSnapshot
}) {
  const {
    previousMeta,
    pointsSentence,
    tmpsDelta,
    bbbeeSpendDelta,
    strongestCategoryImprovement,
    biggestCategoryDecline,
  } = comparison

  const prevLabel =
    previousMeta.assessmentYear != null
      ? `${previousMeta.assessmentYear}`
      : new Date(previousMeta.createdAt).toLocaleDateString()

  return (
    <div className={`${cardSurface} px-5 py-4 sm:px-6 sm:py-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-faint">
            Compared to previous assessment
          </p>
          <p className="mt-1.5 text-sm text-muted">
            Baseline: year {prevLabel} · saved{' '}
            {new Date(previousMeta.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/procurement/assessments/${previousMeta.id}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-line-strong hover:bg-sunken hover:text-ink"
        >
          Open previous
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-line-strong bg-sunken px-3.5 py-3 sm:col-span-2 lg:col-span-3">
          <dt className="text-sm font-bold  text-faint">
            Procurement points
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-ink">
            {pointsSentence}
          </dd>
        </div>
        <div className="rounded-xl border border-line-strong bg-sunken px-3.5 py-3">
          <dt className="text-sm font-bold  text-faint">
            Total measured procurement spend (TMPS)
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-ink">
            {signedCurrency(tmpsDelta)}
          </dd>
        </div>
        <div className="rounded-xl border border-line-strong bg-sunken px-3.5 py-3">
          <dt className="text-sm font-bold  text-faint">
            Recognised B-BBEE procurement spend
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-ink">
            {signedCurrency(bbbeeSpendDelta)}
          </dd>
        </div>
        {strongestCategoryImprovement ? (
          <div className="rounded-xl border border-ok/30 bg-ok-soft/80 px-3.5 py-3 sm:col-span-1">
            <dt className="text-sm font-bold  text-ok">
              Strongest indicator gain
            </dt>
            <dd className="mt-1 text-sm font-semibold tracking-tight text-ok">
              {strongestCategoryImprovement.name}{' '}
              <span className="tabular-nums">
                ({formatSignedPoints(strongestCategoryImprovement.delta)} pts)
              </span>
            </dd>
          </div>
        ) : null}
        {biggestCategoryDecline ? (
          <div className="rounded-xl border border-bad/30 bg-bad-soft/80 px-3.5 py-3 sm:col-span-1">
            <dt className="text-sm font-bold  text-bad">
              Largest indicator drop
            </dt>
            <dd className="mt-1 text-sm font-semibold tracking-tight text-bad">
              {biggestCategoryDecline.name}{' '}
              <span className="tabular-nums">
                ({formatSignedPoints(biggestCategoryDecline.delta)} pts)
              </span>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}
