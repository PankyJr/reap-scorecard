import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  type ProcurementComparisonSnapshot,
  formatSignedPoints,
} from '@/lib/procurement/compareAssessments'
import { formatCurrency } from '@/lib/procurement/format'

function signedCurrency(delta: number): string {
  const u = formatCurrency(Math.abs(delta))
  if (delta > 0.5) return `+${u}`
  if (delta < -0.5) return `-${u}`
  return formatCurrency(0)
}

function levelTrendLabel(rankDelta: number): string {
  if (rankDelta > 0) return 'REAP level improved'
  if (rankDelta < 0) return 'REAP level declined'
  return 'REAP level unchanged'
}

export function ProcurementAssessmentComparison({
  comparison,
}: {
  comparison: ProcurementComparisonSnapshot
}) {
  const {
    previousMeta,
    scoreDelta,
    reapLevelCurrent,
    reapLevelPrevious,
    reapLevelRankDelta,
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Compared to previous assessment
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Baseline: year {prevLabel} · saved{' '}
            {new Date(previousMeta.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/procurement/assessments/${previousMeta.id}`}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-700 transition hover:text-slate-950"
        >
          Open previous
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">Procurement points</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {formatSignedPoints(scoreDelta)}{' '}
            <span className="font-normal text-slate-500">vs prior</span>
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">
            {levelTrendLabel(reapLevelRankDelta)}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
            {reapLevelPrevious}
            <span className="mx-1 font-normal text-slate-400">→</span>
            {reapLevelCurrent}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">Measured procurement (TMPS)</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {signedCurrency(tmpsDelta)}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">Recognised B-BBEE spend</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {signedCurrency(bbbeeSpendDelta)}
          </dd>
        </div>
        {strongestCategoryImprovement ? (
          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2.5 sm:col-span-1">
            <dt className="text-[11px] font-medium text-emerald-800">Strongest category gain</dt>
            <dd className="mt-0.5 text-sm font-semibold text-emerald-950">
              {strongestCategoryImprovement.name}{' '}
              <span className="tabular-nums">
                ({formatSignedPoints(strongestCategoryImprovement.delta)} pts)
              </span>
            </dd>
          </div>
        ) : null}
        {biggestCategoryDecline ? (
          <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 px-3 py-2.5 sm:col-span-1">
            <dt className="text-[11px] font-medium text-rose-800">Largest category pullback</dt>
            <dd className="mt-0.5 text-sm font-semibold text-rose-950">
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
