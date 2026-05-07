import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  type ProcurementComparisonSnapshot,
  formatSignedPoints,
} from '@/lib/procurement/compareAssessments'
import { formatCurrency } from '@/lib/procurement/format'
import { cardSurface } from './ProcurementAssessmentInsights'

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
    <div className={`${cardSurface} px-5 py-4 sm:px-6 sm:py-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Compared to previous assessment
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Baseline: year {prevLabel} · saved{' '}
            {new Date(previousMeta.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/procurement/assessments/${previousMeta.id}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-900/[0.02] transition hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-950"
        >
          Open previous
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 shadow-sm">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Procurement points
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-slate-950">
            {formatSignedPoints(scoreDelta)}{' '}
            <span className="font-normal text-slate-500">vs prior</span>
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 shadow-sm">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {levelTrendLabel(reapLevelRankDelta)}
          </dt>
          <dd className="mt-1 text-sm font-semibold tracking-tight text-slate-950">
            {reapLevelPrevious}
            <span className="mx-1 font-normal text-slate-400">→</span>
            {reapLevelCurrent}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 shadow-sm">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Measured procurement (TMPS)
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-slate-950">
            {signedCurrency(tmpsDelta)}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 shadow-sm">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recognised B-BBEE spend
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-slate-950">
            {signedCurrency(bbbeeSpendDelta)}
          </dd>
        </div>
        {strongestCategoryImprovement ? (
          <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/60 px-3.5 py-3 shadow-sm sm:col-span-1">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Strongest category gain
            </dt>
            <dd className="mt-1 text-sm font-semibold tracking-tight text-emerald-950">
              {strongestCategoryImprovement.name}{' '}
              <span className="tabular-nums">
                ({formatSignedPoints(strongestCategoryImprovement.delta)} pts)
              </span>
            </dd>
          </div>
        ) : null}
        {biggestCategoryDecline ? (
          <div className="rounded-xl border border-rose-200/90 bg-rose-50/60 px-3.5 py-3 shadow-sm sm:col-span-1">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
              Largest category pullback
            </dt>
            <dd className="mt-1 text-sm font-semibold tracking-tight text-rose-950">
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
