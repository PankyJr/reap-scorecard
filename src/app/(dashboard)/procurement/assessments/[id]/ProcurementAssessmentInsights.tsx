import clsx from 'clsx'
import type { ProcurementCategoryResult } from '@/lib/procurement/assessment'
import {
  PROCUREMENT_MAX_POINTS,
  getProcurementExecutiveScorecardLine,
  type ProcurementCategoryInsight,
  type ProcurementWhatThisMeans,
} from '@/lib/procurement/insights'
import { TMPS_EXCLUSIONS, TMPS_INCLUSIONS } from '@/lib/procurement/tmps'
import type { ProcurementTmpsCustomLine } from '@/lib/procurement/tmpsCustom'
import type { ProcurementTmpsDenominatorSource } from '@/lib/procurement/tmpsDenominator'
import {
  formatCurrencyZar,
  formatPercentage,
  formatPoints,
  formatPercentFromRatio,
} from '@/lib/procurement/format'

/** Shared surface: layered shadow + hairline ring for depth without loud chrome */
export const cardSurface =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05),0_22px_44px_-14px_rgba(15,23,42,0.11)] ring-1 ring-slate-900/[0.035]'

function procurementLevelHeroPanelStyles(level: string | null | undefined): {
  panel: string
  labelEyebrow: string
  levelTitle: string
  caption: string
} {
  const l = (level ?? '').toLowerCase()
  if (l.includes('non-compliant') || l.includes('non compliant')) {
    return {
      panel:
        'rounded-3xl border border-rose-200/80 bg-rose-50/55 px-5 py-5 sm:px-6 sm:py-5',
      labelEyebrow:
        'text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-700/70',
      levelTitle:
        'mt-2 text-2xl font-semibold tracking-[-0.04em] text-rose-950 sm:text-3xl',
      caption: 'mt-2 text-sm leading-5 text-rose-900/70',
    }
  }
  const levelMatch = l.match(/level\s*(\d+)/)
  const n = levelMatch ? Number(levelMatch[1]) : NaN
  if (Number.isFinite(n)) {
    if (n <= 2) {
      return {
        panel:
          'rounded-3xl border border-emerald-200 bg-emerald-50/60 px-5 py-5 sm:px-6 sm:py-5',
        labelEyebrow:
          'text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700/70',
        levelTitle:
          'mt-2 text-2xl font-semibold tracking-[-0.04em] text-emerald-950 sm:text-3xl',
        caption: 'mt-2 text-sm leading-5 text-emerald-900/70',
      }
    }
    if (n <= 4) {
      return {
        panel:
          'rounded-3xl border border-teal-200 bg-teal-50/60 px-5 py-5 sm:px-6 sm:py-5',
        labelEyebrow:
          'text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700/70',
        levelTitle:
          'mt-2 text-2xl font-semibold tracking-[-0.04em] text-teal-950 sm:text-3xl',
        caption: 'mt-2 text-sm leading-5 text-teal-900/70',
      }
    }
    if (n <= 6) {
      return {
        panel:
          'rounded-3xl border border-sky-200 bg-sky-50/60 px-5 py-5 sm:px-6 sm:py-5',
        labelEyebrow:
          'text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700/70',
        levelTitle:
          'mt-2 text-2xl font-semibold tracking-[-0.04em] text-sky-950 sm:text-3xl',
        caption: 'mt-2 text-sm leading-5 text-sky-900/70',
      }
    }
    if (n <= 8) {
      return {
        panel:
          'rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6 sm:py-5',
        labelEyebrow:
          'text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500',
        levelTitle:
          'mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl',
        caption: 'mt-2 text-sm leading-5 text-slate-600',
      }
    }
  }
  return {
    panel:
      'rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-6 sm:py-5',
    labelEyebrow:
      'text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500',
    levelTitle:
      'mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl',
    caption: 'mt-2 text-sm leading-5 text-slate-600',
  }
}

/** Compact pill for procurement summary header (level bands). */
function procurementLevelSummaryPillClass(level: string): string {
  const l = level.toLowerCase()
  if (l.includes('non-compliant') || l.includes('non compliant')) {
    return 'border-rose-200/80 bg-rose-50/90 text-rose-800'
  }
  const levelMatch = l.match(/level\s*(\d+)/)
  const n = levelMatch ? Number(levelMatch[1]) : NaN
  if (Number.isFinite(n)) {
    if (n <= 2) return 'border-emerald-200 bg-emerald-50/90 text-emerald-800'
    if (n <= 4) return 'border-teal-200 bg-teal-50/90 text-teal-900'
    if (n <= 6) return 'border-sky-200 bg-sky-50/90 text-sky-900'
    if (n <= 8) return 'border-slate-200 bg-slate-50/90 text-slate-800'
  }
  return 'border-slate-200 bg-slate-50/90 text-slate-800'
}

/** Client / PDF-friendly summary block. */
export function ProcurementReportSummaryBlock({
  companyName,
  assessmentYear,
  procurementLevel,
  totalScore,
  totalMeasuredSpend,
  totalBbbeeSpend,
  recognisedSpendRatio,
}: {
  companyName: string
  assessmentYear: number | null
  procurementLevel: string
  totalScore: number
  totalMeasuredSpend: number
  totalBbbeeSpend: number
  recognisedSpendRatio: number
}) {
  const yearLabel =
    assessmentYear != null && Number.isFinite(assessmentYear)
      ? String(assessmentYear)
      : '—'

  const recognisedPctLabel =
    totalMeasuredSpend > 0 ? formatPercentage(recognisedSpendRatio, 2) : '—'
  const recognisedTilePositive =
    totalMeasuredSpend > 0 && recognisedSpendRatio >= 0.7

  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] print:border print:border-slate-300 print:shadow-none">
      <div className="px-6 pt-6 sm:px-7 sm:pt-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
          Procurement assessment summary
        </p>
      </div>

      <div className="px-6 pb-6 pt-4 sm:px-7 sm:pb-7 sm:pt-5">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">Company</p>
            <h2 className="mt-1 break-words text-2xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-3xl">
              {companyName}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Assessment year{' '}
              <span className="font-medium tabular-nums text-slate-700">{yearLabel}</span>
            </p>
          </div>

          <div
            className={clsx(
              'inline-flex w-fit shrink-0 items-center rounded-full border px-4 py-2',
              procurementLevelSummaryPillClass(procurementLevel),
            )}
          >
            <span className="text-sm font-semibold">
              Procurement level: {procurementLevel}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Total score
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
              {formatPoints(totalScore)}{' '}
              <span className="font-semibold text-slate-400">
                / {PROCUREMENT_MAX_POINTS}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Measured procurement spend
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
              {formatCurrencyZar(totalMeasuredSpend)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Recognised B-BBEE spend
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
              {formatCurrencyZar(totalBbbeeSpend)}
            </p>
          </div>

          <div
            className={clsx(
              'rounded-2xl border px-5 py-4',
              recognisedTilePositive
                ? 'border-emerald-100 bg-emerald-50/40'
                : 'border-slate-100 bg-slate-50/60',
            )}
          >
            <p
              className={clsx(
                'text-[10px] font-semibold uppercase tracking-[0.22em]',
                recognisedTilePositive ? 'text-emerald-700/70' : 'text-slate-400',
              )}
            >
              Recognised spend
            </p>
            <p
              className={clsx(
                'mt-3 text-2xl font-semibold tracking-[-0.04em] tabular-nums',
                recognisedTilePositive ? 'text-emerald-950' : 'text-slate-950',
              )}
            >
              {recognisedPctLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ExecutiveSummarySection({
  totalScore,
  procurementLevel,
  totalMeasuredSpend,
  totalBbbeeSpend,
  recognisedSpendRatio,
  tmpsDenominatorSourceLabel,
}: {
  totalScore: number
  procurementLevel: string
  totalMeasuredSpend: number
  totalBbbeeSpend: number
  /** recognised spend as a share of TMPS (0–1) when TMPS is positive */
  recognisedSpendRatio: number
  /** How the TMPS / measured procurement denominator was chosen for this assessment */
  tmpsDenominatorSourceLabel: string
}) {
  const pctOfMax =
    PROCUREMENT_MAX_POINTS > 0
      ? Math.min(100, (totalScore / PROCUREMENT_MAX_POINTS) * 100)
      : 0

  const summaryLine = getProcurementExecutiveScorecardLine(procurementLevel)
  const levelPanel = procurementLevelHeroPanelStyles(procurementLevel)
  const maxPtsLabel = `${Math.round(PROCUREMENT_MAX_POINTS)} pts`

  return (
    <section
      className="rounded-[32px] border border-slate-200/70 bg-white px-6 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:px-8 sm:py-8 print:border print:border-slate-300 print:shadow-none"
      aria-labelledby="executive-scorecard-heading"
    >
      <p
        id="executive-scorecard-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400"
      >
        Executive scorecard
      </p>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_minmax(0,360px)] lg:items-end">
        <div className="min-w-0">
          <p className="text-base text-slate-500">Procurement score</p>

          <div className="mt-4 flex flex-wrap items-end gap-2 sm:gap-3">
            <span className="text-6xl font-semibold leading-none tracking-[-0.07em] text-slate-950 tabular-nums sm:text-7xl">
              {formatPoints(totalScore)}
            </span>
            <span className="pb-1 text-3xl font-semibold tracking-[-0.05em] text-slate-400 tabular-nums sm:pb-2 sm:text-4xl">
              / {PROCUREMENT_MAX_POINTS}
            </span>
          </div>

          <div className="mt-6 max-w-sm sm:mt-7">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <div
                className="h-full rounded-full bg-slate-950"
                style={{ width: `${pctOfMax}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs tabular-nums text-slate-400">
              <span>0 pts</span>
              <span>{pctOfMax.toFixed(0)}%</span>
              <span>{maxPtsLabel}</span>
            </div>
          </div>

          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">{summaryLine}</p>
        </div>

        <div className={levelPanel.panel}>
          <p className={levelPanel.labelEyebrow}>Procurement level</p>
          <p className={levelPanel.levelTitle}>{procurementLevel}</p>
          <p className={levelPanel.caption}>
            Based on recognised B-BBEE procurement performance.
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Total measured procurement spend
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
              {formatCurrencyZar(totalMeasuredSpend)}
            </p>
            <p className="mt-1 text-xs text-slate-500">TMPS denominator</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {tmpsDenominatorSourceLabel}
            </p>
          </div>

          <div className="md:border-l md:border-slate-100 md:pl-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Recognised B-BBEE procurement spend
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
              {formatCurrencyZar(totalBbbeeSpend)}
            </p>
            <p className="mt-1 text-xs text-slate-500">After recognition rules</p>
          </div>

          <div className="md:border-l md:border-slate-100 md:pl-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Recognised spend
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
              {totalMeasuredSpend > 0
                ? formatPercentage(recognisedSpendRatio, 2)
                : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Of measured procurement</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function parseScoreIntro(intro: string): {
  before: string
  score: string
  mid: string
  max: string
} | null {
  const m = intro.match(
    /^This company scored ([\d.]+) out of (\d+) procurement points\.$/,
  )
  if (!m) return null
  return {
    before: 'This company scored ',
    score: m[1],
    mid: ' out of ',
    max: m[2],
  }
}

function QuietInsightColumn({
  title,
  accentClass,
  items,
}: {
  title: string
  accentClass: string
  items: string[]
}) {
  if (!items.length) return null
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accentClass}`} aria-hidden />
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function WhatThisMeansSection({
  content,
}: {
  content: ProcurementWhatThisMeans | null
}) {
  if (!content) return null

  const parsed = parseScoreIntro(content.intro)
  const hasLists =
    content.strongAreas.length > 0 || content.improvementAreas.length > 0
  const nStrong = content.strongAreas.length
  const nImp = content.improvementAreas.length
  const summaryStrip =
    hasLists && (nStrong > 0 || nImp > 0)
      ? [
          nStrong > 0
            ? `${nStrong} strength${nStrong === 1 ? '' : 's'} identified`
            : null,
          nImp > 0
            ? `${nImp} improvement area${nImp === 1 ? '' : 's'}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white px-6 py-7 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:px-8 sm:py-7">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Interpretation
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.65rem]">
            What this means
          </h2>
          {parsed ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This company scored{' '}
              <span className="font-semibold tabular-nums text-slate-950">{parsed.score}</span>
              {' out of'}
              <span className="font-semibold tabular-nums text-slate-950"> {parsed.max}</span>
              {' procurement points.'}
            </p>
          ) : (
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{content.intro}</p>
          )}
        </div>

        {parsed ? (
          <div className="shrink-0 text-left lg:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Procurement score
            </p>
            <div className="mt-3 flex items-baseline gap-2 lg:justify-end">
              <span className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums sm:text-[2.5rem]">
                {parsed.score}
              </span>
              <span className="pb-1 text-2xl font-medium text-slate-300">/</span>
              <span className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums sm:text-[2.5rem]">
                {parsed.max}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {summaryStrip ? (
        <p className="mt-6 text-[11px] font-medium tracking-wide text-slate-400">{summaryStrip}</p>
      ) : null}

      {hasLists ? (
        <>
          <div className="my-7 h-px bg-slate-100" />
          <div className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
            <QuietInsightColumn
              title="Strengths"
              accentClass="bg-emerald-500"
              items={content.strongAreas}
            />
            <QuietInsightColumn
              title="Improvement areas"
              accentClass="bg-amber-500"
              items={content.improvementAreas}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

export function ImportSourceCard({
  workbookName,
  sheetName,
  supplierCount,
  assessmentYear,
  tmpsDenominatorSourceLabel,
}: {
  workbookName: string | null
  sheetName: string | null
  supplierCount: number
  assessmentYear: number | null
  tmpsDenominatorSourceLabel: string
}) {
  if (!workbookName?.trim() && !sheetName?.trim()) return null

  const yearLabel =
    assessmentYear != null && Number.isFinite(assessmentYear)
      ? String(assessmentYear)
      : '—'

  return (
    <div className={`${cardSurface} px-6 py-5 sm:px-7 sm:py-6`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Data source
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
        Import summary
      </h2>
      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-3">
          <dt className="text-xs font-medium text-slate-500">Workbook</dt>
          <dd className="mt-1 font-medium text-slate-950 break-words">
            {workbookName?.trim() || '—'}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-3">
          <dt className="text-xs font-medium text-slate-500">Sheet used</dt>
          <dd className="mt-1 font-medium text-slate-950 break-words">
            {sheetName?.trim() || '—'}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-3">
          <dt className="text-xs font-medium text-slate-500">Suppliers imported</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">
            {supplierCount}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-3">
          <dt className="text-xs font-medium text-slate-500">TMPS denominator</dt>
          <dd className="mt-1 font-medium text-slate-950">{tmpsDenominatorSourceLabel}</dd>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-3 sm:col-span-2">
          <dt className="text-xs font-medium text-slate-500">Assessment year</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-950">{yearLabel}</dd>
        </div>
      </dl>
    </div>
  )
}

function categoryInsightDisplayLabel(
  status: ProcurementCategoryInsight['status'],
): { label: string; className: string } {
  if (status === 'strong')
    return {
      label: 'Strong',
      className:
        'border border-emerald-200/80 bg-emerald-50/90 text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
    }
  if (status === 'moderate')
    return {
      label: 'Near target',
      className:
        'border border-amber-200/80 bg-amber-50/80 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]',
    }
  return {
    label: 'Action required',
    className:
      'border border-rose-200/75 bg-rose-50/85 text-rose-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
  }
}

function categoryProgressWidth(cat: ProcurementCategoryInsight): number {
  if (cat.targetPercent <= 0) return 0
  return Math.min(100, (cat.achievedPercent / cat.targetPercent) * 100)
}

function progressBarFillClass(status: ProcurementCategoryInsight['status']): string {
  if (status === 'strong') return 'bg-emerald-500/85'
  if (status === 'moderate') return 'bg-amber-500/75'
  return 'bg-rose-500/80'
}

function categoryCardAccentClass(
  status: ProcurementCategoryInsight['status'],
): string {
  if (status === 'strong') return 'border-l-[3px] border-l-emerald-400/60'
  if (status === 'moderate') return 'border-l-[3px] border-l-amber-400/55'
  return 'border-l-[3px] border-l-rose-400/55'
}

function CategoryViewCalculation({
  cat,
  variant = 'card',
}: {
  cat: ProcurementCategoryInsight
  variant?: 'card' | 'table'
}) {
  const achievedPctLabel = formatPercentage(cat.achievedPercent, 2)
  const isTable = variant === 'table'
  return (
    <details
      className={
        isTable ? 'group max-w-[14rem]' : 'group mt-3 border-t border-slate-100 pt-3'
      }
    >
      <summary
        className={`cursor-pointer list-none font-medium text-slate-500 underline decoration-slate-300/80 underline-offset-2 transition hover:text-slate-800 [&::-webkit-details-marker]:hidden ${
          isTable ? 'text-[11px]' : 'text-xs'
        }`}
      >
        View calculation
      </summary>
      <div
        className={`space-y-1.5 text-xs leading-relaxed text-slate-600 ${
          isTable ? 'mt-2' : 'mt-2.5'
        }`}
      >
        <p>
          <span className="font-medium text-slate-700">Target:</span>{' '}
          {formatPercentage(cat.targetPercent, 0)} of TMPS
        </p>
        <p>
          <span className="font-medium text-slate-700">Achieved:</span>{' '}
          {formatCurrencyZar(cat.numeratorValue)} / {formatCurrencyZar(cat.denominatorValue)} ={' '}
          {achievedPctLabel}
        </p>
        <p>
          <span className="font-medium text-slate-700">Points:</span>{' '}
          {formatPoints(cat.pointsAchieved)} / {formatPoints(cat.availablePoints, 0)}
        </p>
      </div>
    </details>
  )
}

function CategoryMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  )
}

function CategoryInsightCard({ cat }: { cat: ProcurementCategoryInsight }) {
  const bar = categoryProgressWidth(cat)
  const badge = categoryInsightDisplayLabel(cat.status)
  const targetPct = formatPercentFromRatio(cat.targetPercent, 0)
  const achievedPct = formatPercentFromRatio(cat.achievedPercent, 1)
  const showGap = cat.gapPercentPoints > 0.05

  return (
    <div
      className={`flex flex-col rounded-xl border border-slate-200/60 bg-white px-4 pb-4 pt-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4 ${categoryCardAccentClass(cat.status)}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-slate-950">
            {cat.name}
          </h3>
          <span
            className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium tracking-tight ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
            Points
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-950">
            {formatPoints(cat.pointsAchieved)}
            <span className="font-normal text-slate-400"> / </span>
            <span className="text-base font-semibold text-slate-600">
              {formatPoints(cat.availablePoints, 0)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <CategoryMetric label="Target" value={targetPct} />
        <CategoryMetric label="Achieved" value={achievedPct} />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          <span>Progress to target</span>
          <span className="tabular-nums normal-case tracking-normal text-slate-500">
            {showGap ? `${bar.toFixed(0)}%` : 'Complete'}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${progressBarFillClass(cat.status)}`}
            style={{ width: `${bar}%` }}
          />
        </div>
      </div>

      {showGap ? (
        <p className="mt-3 text-sm leading-snug text-slate-700">
          <span className="tabular-nums font-medium text-slate-900">
            {cat.gapPercentPoints.toFixed(1)} percentage points below target
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-emerald-900/90">At or above target</p>
      )}

      <CategoryViewCalculation cat={cat} />
    </div>
  )
}

export function CategoryInsightsSection({
  insights,
  strongestName,
  weakestName,
}: {
  insights: ProcurementCategoryInsight[]
  strongestName: string | null
  weakestName: string | null
}) {
  if (!insights.length) return null

  const summaryParts: string[] = []
  if (strongestName) summaryParts.push(`Best-performing: ${strongestName}`)
  if (weakestName) summaryParts.push(`Highest opportunity: ${weakestName}`)
  const summaryLine = summaryParts.join(' · ')

  return (
    <div className={cardSurface}>
      <div className="border-b border-slate-100/90 px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
          Category performance
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Targets, achieved shares, and procurement points by category.
        </p>
        {summaryLine ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-500">{summaryLine}</p>
        ) : null}
      </div>

      {/* Desktop / print: compact table */}
      <div className="hidden overflow-x-auto px-4 pb-5 pt-1 lg:block print:block">
        <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <th className="py-3 pl-3 pr-2 font-medium">Category</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 text-right font-medium">Target</th>
              <th className="px-2 py-3 text-right font-medium">Achieved</th>
              <th className="min-w-[10rem] px-2 py-3 font-medium">Gap</th>
              <th className="px-2 py-3 text-right font-medium">Points</th>
              <th className="w-36 px-2 py-3 font-medium">Progress</th>
              <th className="py-3 pl-2 pr-3 text-left font-medium">
                <span className="sr-only">Calculation</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {insights.map((cat) => {
              const bar = categoryProgressWidth(cat)
              const badge = categoryInsightDisplayLabel(cat.status)
              const targetPct = formatPercentFromRatio(cat.targetPercent, 0)
              const achievedPct = formatPercentFromRatio(cat.achievedPercent, 1)
              const showGap = cat.gapPercentPoints > 0.05
              return (
                <tr key={cat.key} className="align-middle text-slate-800">
                  <td className="max-w-[11rem] py-3.5 pl-3 pr-2 text-[13px] font-semibold leading-snug text-slate-950">
                    {cat.name}
                  </td>
                  <td className="px-2 py-3.5">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right tabular-nums text-slate-700">
                    {targetPct}
                  </td>
                  <td className="px-2 py-3.5 text-right tabular-nums font-medium text-slate-900">
                    {achievedPct}
                  </td>
                  <td className="px-2 py-3.5 text-[13px] leading-snug text-slate-600">
                    {showGap ? (
                      <span className="tabular-nums text-slate-800">
                        {cat.gapPercentPoints.toFixed(1)} percentage points below target
                      </span>
                    ) : (
                      <span className="text-emerald-900/85">At or above target</span>
                    )}
                  </td>
                  <td className="px-2 py-3.5 text-right tabular-nums text-sm font-semibold text-slate-900">
                    {formatPoints(cat.pointsAchieved)}
                    <span className="font-normal text-slate-400"> / </span>
                    {formatPoints(cat.availablePoints, 0)}
                  </td>
                  <td className="px-2 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        {showGap ? `${bar.toFixed(0)}%` : 'Complete'}
                      </span>
                      <div className="h-1.5 w-full max-w-[7rem] overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${progressBarFillClass(cat.status)}`}
                          style={{ width: `${bar}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pl-2 pr-3 align-top">
                    <CategoryViewCalculation cat={cat} variant="table" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / narrow: stacked cards */}
      <div className="grid grid-cols-1 gap-3 p-4 sm:px-5 sm:pb-5 lg:hidden print:hidden">
        {insights.map((cat) => (
          <CategoryInsightCard key={cat.key} cat={cat} />
        ))}
      </div>
    </div>
  )
}

export type ProcurementSupplierBreakdownRow = {
  id: string
  supplier_name: string
  supplier_type: string
  level: string
  value_ex_vat: number | string | null
  bbbee_spend: number | string | null
  recognition_percent: number | string | null
  is_51_black_owned?: boolean | null
  is_30_black_women_owned?: boolean | null
  is_51_bdgs?: boolean | null
}

function formatBbbeeLevel(level: string): string {
  if (!level || level === 'Non-Compliant') return 'Non-Compliant'
  if (/^\d+$/.test(level.trim())) return `Level ${level.trim()}`
  return level
}

function recognitionPercentDisplay(recognition: number | string | null | undefined): string {
  const n = Number(recognition ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return formatPercentFromRatio(n, 0)
}

function contributionBucketTags(row: ProcurementSupplierBreakdownRow): string[] {
  const tags: string[] = []
  if (row.supplier_type === 'EME') tags.push('EME')
  if (row.supplier_type === 'QSE') tags.push('QSE')
  if (row.is_51_black_owned) tags.push('51% BO')
  if (row.is_30_black_women_owned) tags.push('30% BWO')
  if (row.is_51_bdgs) tags.push('51% BDG')
  return tags
}

function recognitionRatioBadgeClass(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 'border border-slate-200/80 bg-slate-50 text-slate-600'
  }
  if (ratio >= 1.2) {
    return 'border border-emerald-200/70 bg-emerald-50/90 text-emerald-900'
  }
  if (ratio >= 1) {
    return 'border border-emerald-100 bg-emerald-50/50 text-emerald-900'
  }
  if (ratio >= 0.85) {
    return 'border border-amber-200/70 bg-amber-50/85 text-amber-950'
  }
  return 'border border-slate-200/80 bg-slate-100/70 text-slate-700'
}

function MutedPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-md border border-slate-200/70 bg-slate-50/90 px-2 py-0.5 text-xs font-medium text-slate-600">
      {label}
    </span>
  )
}

function ContributionBucketChips({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return <span className="text-xs text-slate-400">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex rounded-md border border-slate-200/70 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.04)]"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

export function RecognisedSupplierBreakdownSection({
  suppliers,
}: {
  suppliers: ProcurementSupplierBreakdownRow[]
}) {
  const totalActual = suppliers.reduce(
    (sum, r) => sum + (Number(r.value_ex_vat ?? 0) || 0),
    0,
  )
  const totalRecognised = suppliers.reduce(
    (sum, r) => sum + (Number(r.bbbee_spend ?? 0) || 0),
    0,
  )
  const count = suppliers.length

  return (
    <div className={`min-w-0 ${cardSurface} print:overflow-visible`}>
      <div className="border-b border-slate-200/60 bg-slate-50/40 px-5 py-4 sm:flex sm:items-start sm:justify-between sm:gap-6 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            Recognised supplier breakdown
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Actual spend, recognised value, recognition percentage, and contribution buckets
            (from supplier flags and recognition rules).
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0 sm:justify-end">
          <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-700 shadow-sm">
            {count} supplier{count === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-700 shadow-sm">
            {formatCurrencyZar(totalRecognised)} recognised
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-700 shadow-sm">
            {formatCurrencyZar(totalActual)} actual spend
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] border-collapse text-left text-sm print:min-w-0">
          <thead className="border-b border-slate-200 bg-slate-50/95 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3.5 pl-6 text-left font-semibold sm:pl-7">Supplier</th>
              <th className="px-3 py-3.5 text-left font-semibold">Type</th>
              <th className="px-3 py-3.5 text-left font-semibold">Level</th>
              <th className="px-3 py-3.5 text-right font-semibold">Actual spend</th>
              <th className="px-3 py-3.5 text-right font-semibold">Recognised spend</th>
              <th className="px-3 py-3.5 text-center font-semibold">Recognition</th>
              <th className="px-5 py-3.5 pr-6 text-left font-semibold sm:pr-7">
                Contribution buckets
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.length ? (
              suppliers.map((s) => {
                const v = Number(s.value_ex_vat ?? 0) || 0
                const b = Number(s.bbbee_spend ?? 0) || 0
                const ratio = Number(s.recognition_percent ?? 0) || 0
                const recLabel = recognitionPercentDisplay(s.recognition_percent)
                const buckets = contributionBucketTags(s)
                return (
                  <tr
                    key={s.id}
                    className="align-middle odd:bg-white even:bg-slate-50/[0.25] hover:bg-slate-50/80"
                  >
                    <td className="max-w-[16rem] px-5 py-4 pl-6 align-middle text-[15px] font-semibold leading-snug text-slate-950 sm:max-w-none sm:pl-7">
                      {s.supplier_name}
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <MutedPill label={s.supplier_type} />
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <MutedPill label={formatBbbeeLevel(s.level)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right align-middle text-sm font-medium tabular-nums text-slate-800">
                      {formatCurrencyZar(v)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right align-middle text-sm font-semibold tabular-nums text-slate-950">
                      {formatCurrencyZar(b)}
                    </td>
                    <td className="px-3 py-4 text-center align-middle">
                      <span
                        className={`inline-flex min-w-[3.25rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${recognitionRatioBadgeClass(ratio)}`}
                      >
                        {recLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 pr-6 align-middle sm:pr-7">
                      <ContributionBucketChips tags={buckets} />
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                  No suppliers captured for this assessment yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function categoryBreakdownMetCounts(categories: ProcurementCategoryResult[]): {
  met: number
  total: number
} {
  if (!categories.length) return { met: 0, total: 0 }
  const total = categories.length
  const met = categories.filter(
    (c) => c.targetPercent <= 0 || c.achievedPercent >= c.targetPercent,
  ).length
  return { met, total }
}

/** Detailed procurement category table — dashboard + client report. */
export function DetailedCategoryBreakdownSection({
  categories,
  strongestName,
  weakestName,
}: {
  categories: ProcurementCategoryResult[]
  strongestName: string | null
  weakestName: string | null
}) {
  const { met, total } = categoryBreakdownMetCounts(categories)
  const showSummaryStrip = categories.length > 0

  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] print:shadow-none">
      <div className="px-6 py-6 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
          Category analysis
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              Detailed category breakdown
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Targets, achieved shares, points, and recognised spend by procurement category.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {showSummaryStrip ? (
        <div className="mx-6 mb-5 mt-5 grid gap-3 sm:mx-7 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Categories met
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
              {met} / {total}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Strongest category
            </p>
            <p className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] text-slate-950">
              {strongestName ?? '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Largest gap
            </p>
            <p className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] text-slate-950">
              {weakestName ?? '—'}
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={clsx(
          'overflow-x-auto pb-6',
          showSummaryStrip ? '' : 'pt-5',
        )}
      >
        <table className="min-w-[980px] w-full border-collapse text-left text-sm print:min-w-0">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/40">
              <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:px-7">
                Category
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Target
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Achieved
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Points
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Recognised value
              </th>
              <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:px-7">
                TMPS base
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const hasTarget = cat.targetPercent > 0
              const isMet = !hasTarget || cat.achievedPercent >= cat.targetPercent
              const barPct = hasTarget
                ? Math.min(100, (cat.achievedPercent / cat.targetPercent) * 100)
                : 0
              const gapPp = hasTarget
                ? Math.max(0, (cat.targetPercent - cat.achievedPercent) * 100)
                : 0
              const achievedLabel = formatPercentFromRatio(cat.achievedPercent, 1)
              const secondaryLine = isMet
                ? 'Target met'
                : `${gapPp.toFixed(1)} pp below target`

              return (
                <tr
                  key={cat.key}
                  className="group border-b border-slate-100 last:border-b-0 hover:bg-slate-50/45"
                >
                  <td className="px-6 py-4 align-middle sm:px-7">
                    <div className="flex items-center gap-3">
                      <span
                        className={clsx(
                          'h-2 w-2 shrink-0 rounded-full',
                          isMet ? 'bg-emerald-500' : 'bg-amber-400',
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="font-semibold tracking-[-0.02em] text-slate-950">
                          {cat.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{secondaryLine}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm tabular-nums text-slate-500">
                    {formatPercentFromRatio(cat.targetPercent, 0)}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex min-w-[170px] items-center gap-3">
                      <div
                        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"
                        role="img"
                        aria-label={`Achieved ${achievedLabel} of target; ${Math.round(barPct)}% of target share`}
                      >
                        <div
                          className={clsx(
                            'h-full rounded-full',
                            isMet ? 'bg-slate-950' : 'bg-slate-300',
                          )}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-950">
                        {achievedLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">
                    <span className="font-semibold text-slate-950">
                      {cat.pointsAchieved.toFixed(2)}
                    </span>
                    <span className="text-slate-400"> / {cat.availablePoints.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-4 text-right text-sm tabular-nums text-slate-600">
                    {formatCurrencyZar(cat.numeratorValue)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-500 sm:px-7">
                    {formatCurrencyZar(cat.denominatorValue)}
                  </td>
                </tr>
              )
            })}
            {!categories.length ? (
              <tr>
                <td colSpan={6} className="px-7 py-10 text-center text-sm text-slate-500">
                  No procurement results captured for this assessment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function RecommendationsSection({ items }: { items: string[] }) {
  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-8 print:border print:border-slate-300 print:shadow-none">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          Guidance
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-slate-950">
          Recommended improvement actions
        </h2>
        <p className="mt-2 text-base leading-7 text-slate-500">
          Rule-based suggestions from category gaps and supplier compliance mix.
        </p>
      </div>

      {items.length > 0 ? (
        <ol className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-slate-50/40">
          {items.map((line, i) => (
            <li
              key={`${i}-${line}`}
              className="flex gap-4 px-5 py-5 sm:items-start"
            >
              <span
                className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-900/40 bg-blue-950 text-xs font-semibold tabular-nums text-white shadow-sm"
                aria-hidden
              >
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 text-[15px] leading-7 text-slate-700">{line}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
          <p className="text-sm font-medium text-emerald-900">
            No priority improvement actions detected.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-700">
            Current procurement categories are meeting the rule-based guidance thresholds.
          </p>
        </div>
      )}
    </section>
  )
}

type AssessmentTmpsRecord = Record<string, number | string | null | undefined>

export function TmpsBreakdownSection({
  hasTmpsBreakdown,
  assessmentRecord,
  tmpsTotals,
  totalMeasuredSpend,
  tmpsDenominatorSource,
  customInclusionLines = [],
  customExclusionLines = [],
}: {
  hasTmpsBreakdown: boolean
  assessmentRecord: AssessmentTmpsRecord
  tmpsTotals: { inclusionsTotal: number; exclusionsTotal: number; tmpsTotal: number } | null
  totalMeasuredSpend: number
  tmpsDenominatorSource: ProcurementTmpsDenominatorSource
  customInclusionLines?: ProcurementTmpsCustomLine[]
  customExclusionLines?: ProcurementTmpsCustomLine[]
}) {
  const savedAmount = totalMeasuredSpend

  const intro =
    !hasTmpsBreakdown || !tmpsTotals
      ? 'TMPS breakdown was not stored as line items for this assessment; the saved scoring denominator is shown below.'
      : tmpsDenominatorSource === 'calculated'
        ? 'TMPS equals total inclusions minus total exclusions (including custom TMPS lines). That calculated total was saved as the measured procurement denominator for scoring.'
        : tmpsDenominatorSource === 'manual'
          ? 'A fixed TMPS amount was chosen as the measured procurement denominator. The pad breakdown below is for context; category scores used the saved denominator.'
          : 'Supplier spend from your grid (total of line amounts ex VAT) was used as the TMPS denominator. The pad breakdown below is for context; category scores used the saved denominator.'

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] print:overflow-visible">
      <div className="px-6 py-7 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          TMPS calculation
        </p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <p className="max-w-2xl text-base leading-7 text-slate-600">{intro}</p>
          <div className="shrink-0 text-left lg:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Saved denominator
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums sm:text-[2.5rem]">
              {formatCurrencyZar(savedAmount)}
            </p>
          </div>
        </div>
      </div>

      {hasTmpsBreakdown && tmpsTotals ? (
        <>
          <div className="border-y border-slate-100 px-6 py-6 sm:px-8">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Calculated TMPS (pad)
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 tabular-nums">
                  {formatCurrencyZar(tmpsTotals.tmpsTotal)}
                </p>
              </div>
              <div className="sm:border-l sm:border-slate-100 sm:pl-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Inclusions
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 tabular-nums">
                  {formatCurrencyZar(tmpsTotals.inclusionsTotal)}
                </p>
              </div>
              <div className="sm:border-l sm:border-slate-100 sm:pl-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Exclusions
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 tabular-nums">
                  {formatCurrencyZar(tmpsTotals.exclusionsTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 pt-6 sm:px-8">
            <div className="rounded-2xl bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-600 sm:px-5 sm:py-4">
              <span className="font-semibold text-slate-950">TMPS</span>
              <span className="mx-1.5 text-slate-300 sm:mx-2">=</span>
              <span>Inclusions</span>
              <span className="mx-1.5 text-slate-300 sm:mx-2">−</span>
              <span>Exclusions</span>
              <span className="mx-1.5 text-slate-300 sm:mx-2">→</span>
              <span className="tabular-nums">{formatCurrencyZar(tmpsTotals.inclusionsTotal)}</span>
              <span className="mx-1.5 text-slate-300 sm:mx-2">−</span>
              <span className="tabular-nums">{formatCurrencyZar(tmpsTotals.exclusionsTotal)}</span>
              <span className="mx-1.5 text-slate-300 sm:mx-2">=</span>
              <span className="font-semibold tabular-nums text-slate-950">
                {formatCurrencyZar(tmpsTotals.tmpsTotal)}
              </span>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-2 lg:gap-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Inclusion line items
              </p>
              <div className="mt-4 divide-y divide-slate-100">
                {TMPS_INCLUSIONS.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0"
                  >
                    <span className="text-sm text-slate-500">{line.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatCurrencyZar(Number(assessmentRecord[line.key] ?? 0))}
                    </span>
                  </div>
                ))}
                {customInclusionLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span className="text-sm text-slate-500">{line.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatCurrencyZar(line.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:border-l lg:border-slate-100 lg:pl-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Exclusion line items
              </p>
              <div className="mt-4 divide-y divide-slate-100">
                {TMPS_EXCLUSIONS.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0"
                  >
                    <span className="text-sm text-slate-500">{line.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatCurrencyZar(Number(assessmentRecord[line.key] ?? 0))}
                    </span>
                  </div>
                ))}
                {customExclusionLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span className="text-sm text-slate-500">{line.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatCurrencyZar(line.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Scoring denominator saved
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Stored as total measured procurement spend on the assessment record.
                </p>
                {tmpsDenominatorSource !== 'calculated' ||
                Math.abs(tmpsTotals.tmpsTotal - totalMeasuredSpend) > 0.5 ? (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Calculated TMPS from this pad:{' '}
                    <span className="font-medium tabular-nums">
                      {formatCurrencyZar(tmpsTotals.tmpsTotal)}
                    </span>
                  </p>
                ) : null}
              </div>
              <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums sm:text-right">
                {formatCurrencyZar(totalMeasuredSpend)}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
