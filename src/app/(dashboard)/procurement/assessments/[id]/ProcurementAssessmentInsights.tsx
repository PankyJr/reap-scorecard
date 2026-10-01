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

export type { ProcurementSupplierBreakdownRow } from './RecognisedSupplierBreakdownSection'
export { RecognisedSupplierBreakdownSection } from './RecognisedSupplierBreakdownSection'

/** Shared surface: flat border, square corners (serious / document-style) */
export const cardSurface =
  'overflow-hidden rounded-2xl border border-line/90 bg-surface shadow-sm'

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
        'rounded-2xl border border-bad/30 bg-bad-soft/55 px-5 py-5 sm:px-6 sm:py-5',
      labelEyebrow:
        'text-sm font-medium text-bad/70',
      levelTitle:
        'mt-2 text-2xl font-semibold tracking-[-0.04em] text-bad sm:text-3xl',
      caption: 'mt-2 text-sm leading-5 text-bad/70',
    }
  }
  const levelMatch = l.match(/level\s*(\d+)/)
  const n = levelMatch ? Number(levelMatch[1]) : NaN
  if (Number.isFinite(n)) {
    if (n <= 2) {
      return {
        panel:
          'rounded-2xl border border-ok/30 bg-ok-soft/60 px-5 py-5 sm:px-6 sm:py-5',
        labelEyebrow:
          'text-sm font-medium text-ok/70',
        levelTitle:
          'mt-2 text-2xl font-semibold tracking-[-0.04em] text-ok sm:text-3xl',
        caption: 'mt-2 text-sm leading-5 text-ok/70',
      }
    }
    if (n <= 4) {
      return {
        panel:
          'rounded-2xl border border-teal-200 bg-teal-50/60 px-5 py-5 sm:px-6 sm:py-5',
        labelEyebrow:
          'text-sm font-medium text-teal-700/70',
        levelTitle:
          'mt-2 text-2xl font-semibold tracking-[-0.04em] text-teal-950 sm:text-3xl',
        caption: 'mt-2 text-sm leading-5 text-teal-900/70',
      }
    }
    if (n <= 6) {
      return {
        panel:
          'rounded-2xl border border-sky-200 bg-sky-50/60 px-5 py-5 sm:px-6 sm:py-5',
        labelEyebrow:
          'text-sm font-medium text-sky-700/70',
        levelTitle:
          'mt-2 text-2xl font-semibold tracking-[-0.04em] text-sky-950 sm:text-3xl',
        caption: 'mt-2 text-sm leading-5 text-sky-900/70',
      }
    }
    if (n <= 8) {
      return {
        panel:
          'rounded-2xl border border-line bg-sunken/70 px-5 py-5 sm:px-6 sm:py-5',
        labelEyebrow:
          'text-sm font-medium text-muted',
        levelTitle:
          'mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink sm:text-3xl',
        caption: 'mt-2 text-sm leading-5 text-muted',
      }
    }
  }
  return {
    panel:
      'rounded-2xl border border-line bg-sunken/70 px-5 py-5 sm:px-6 sm:py-5',
    labelEyebrow:
      'text-sm font-medium text-muted',
    levelTitle:
      'mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink sm:text-3xl',
    caption: 'mt-2 text-sm leading-5 text-muted',
  }
}

/** Compact pill for procurement summary header (level bands). */
function procurementLevelSummaryPillClass(level: string): string {
  const l = level.toLowerCase()
  if (l.includes('non-compliant') || l.includes('non compliant')) {
    return 'border-bad/30 bg-bad-soft/90 text-bad'
  }
  const levelMatch = l.match(/level\s*(\d+)/)
  const n = levelMatch ? Number(levelMatch[1]) : NaN
  if (Number.isFinite(n)) {
    if (n <= 2) return 'border-ok/30 bg-ok-soft/90 text-ok'
    if (n <= 4) return 'border-teal-200 bg-teal-50/90 text-teal-900'
    if (n <= 6) return 'border-sky-200 bg-sky-50/90 text-sky-900'
    if (n <= 8) return 'border-line bg-sunken/90 text-ink'
  }
  return 'border-line bg-sunken/90 text-ink'
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
    <section className="rounded-2xl border border-line/90 bg-surface shadow-sm print:border print:border-line-strong print:shadow-none">
      <div className="px-6 pt-6 sm:px-7 sm:pt-7">
        <p className="text-sm font-medium text-faint">
          Procurement assessment summary
        </p>
      </div>

      <div className="px-6 pb-6 pt-4 sm:px-7 sm:pb-7 sm:pt-5">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Company</p>
            <h2 className="mt-1 break-words text-2xl font-semibold tracking-[-0.05em] text-ink sm:text-3xl">
              {companyName}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Assessment year{' '}
              <span className="font-medium tabular-nums text-ink">{yearLabel}</span>
            </p>
          </div>

          <div
            className={clsx(
              'inline-flex w-fit shrink-0 items-center rounded-xl border px-4 py-2',
              procurementLevelSummaryPillClass(procurementLevel),
            )}
          >
            <span className="text-sm font-semibold">
              Procurement rating: {procurementLevel}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-line bg-sunken/60 px-5 py-4">
            <p className="text-sm font-medium text-faint">
              Total score
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
              {formatPoints(totalScore)}{' '}
              <span className="font-semibold text-faint">
                / {PROCUREMENT_MAX_POINTS}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-line bg-sunken/60 px-5 py-4">
            <p className="text-sm font-medium text-faint">
              Measured procurement spend
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
              {formatCurrencyZar(totalMeasuredSpend)}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-sunken/60 px-5 py-4">
            <p className="text-sm font-medium text-faint">
              Recognised B-BBEE spend
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
              {formatCurrencyZar(totalBbbeeSpend)}
            </p>
          </div>

          <div
            className={clsx(
              'rounded-xl border px-5 py-4',
              recognisedTilePositive
                ? 'border-ok/30 bg-ok-soft/40'
                : 'border-line bg-sunken/60',
            )}
          >
            <p
              className={clsx(
                'text-sm font-medium',
                recognisedTilePositive ? 'text-ok/70' : 'text-faint',
              )}
            >
              Recognised spend
            </p>
            <p
              className={clsx(
                'mt-3 text-2xl font-semibold tracking-[-0.04em] tabular-nums',
                recognisedTilePositive ? 'text-ok' : 'text-ink',
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
      className="rounded-2xl border border-line/90 bg-surface px-6 py-7 shadow-sm sm:px-8 sm:py-8 print:border print:border-line-strong print:shadow-none"
      aria-labelledby="executive-scorecard-heading"
    >
      <p
        id="executive-scorecard-heading"
        className="text-sm font-medium text-faint"
      >
        Executive scorecard
      </p>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_minmax(0,360px)] lg:items-end">
        <div className="min-w-0">
          <p className="text-base text-muted">Procurement score</p>

          <div className="mt-4 flex flex-wrap items-end gap-2 sm:gap-3">
            <span className="text-6xl font-semibold leading-none tracking-[-0.07em] text-ink tabular-nums sm:text-7xl">
              {formatPoints(totalScore)}
            </span>
            <span className="pb-1 text-3xl font-semibold tracking-[-0.05em] text-faint tabular-nums sm:pb-2 sm:text-4xl">
              / {PROCUREMENT_MAX_POINTS}
            </span>
          </div>

          <div className="mt-6 max-w-sm sm:mt-7">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${pctOfMax}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm tabular-nums text-faint">
              <span>0 pts</span>
              <span>{pctOfMax.toFixed(0)}%</span>
              <span>{maxPtsLabel}</span>
            </div>
          </div>

          <p className="mt-5 max-w-xl text-sm leading-6 text-muted">{summaryLine}</p>
        </div>

        <div className={levelPanel.panel}>
          <p className={levelPanel.labelEyebrow}>Procurement rating (not the B-BBEE level)</p>
          <p className={levelPanel.levelTitle}>{procurementLevel}</p>
          <p className={levelPanel.caption}>
            Based on recognised B-BBEE procurement performance.
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-faint">
              Total measured procurement spend
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
              {formatCurrencyZar(totalMeasuredSpend)}
            </p>
            <p className="mt-1 text-sm text-muted">TMPS denominator</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {tmpsDenominatorSourceLabel}
            </p>
          </div>

          <div className="md:border-l md:border-line md:pl-6">
            <p className="text-sm font-medium text-faint">
              Recognised B-BBEE procurement spend
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
              {formatCurrencyZar(totalBbbeeSpend)}
            </p>
            <p className="mt-1 text-sm text-muted">After recognition rules</p>
          </div>

          <div className="md:border-l md:border-line md:pl-6">
            <p className="text-sm font-medium text-faint">
              Recognised spend
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
              {totalMeasuredSpend > 0
                ? formatPercentage(recognisedSpendRatio, 2)
                : '—'}
            </p>
            <p className="mt-1 text-sm text-muted">Of measured procurement</p>
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
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-muted">
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
    <div className="rounded-2xl border border-line/90 bg-surface px-6 py-7 shadow-sm sm:px-8 sm:py-7">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-faint">
            Interpretation
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[1.65rem]">
            What this means
          </h2>
          {parsed ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              This company scored{' '}
              <span className="font-semibold tabular-nums text-ink">{parsed.score}</span>
              {' out of'}
              <span className="font-semibold tabular-nums text-ink"> {parsed.max}</span>
              {' procurement points.'}
            </p>
          ) : (
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{content.intro}</p>
          )}
        </div>

        {parsed ? (
          <div className="shrink-0 text-left lg:text-right">
            <p className="text-sm font-medium text-faint">
              Procurement score
            </p>
            <div className="mt-3 flex items-baseline gap-2 lg:justify-end">
              <span className="text-4xl font-semibold tracking-[-0.04em] text-ink tabular-nums sm:text-[2.5rem]">
                {parsed.score}
              </span>
              <span className="pb-1 text-2xl font-medium text-faint">/</span>
              <span className="text-4xl font-semibold tracking-[-0.04em] text-ink tabular-nums sm:text-[2.5rem]">
                {parsed.max}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {summaryStrip ? (
        <p className="mt-6 text-sm font-medium tracking-wide text-faint">{summaryStrip}</p>
      ) : null}

      {hasLists ? (
        <>
          <div className="my-7 h-px bg-sunken" />
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
      <p className="text-sm font-medium text-muted">
        Data source
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
        Import summary
      </h2>
      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-sunken/50 px-3.5 py-3">
          <dt className="text-sm font-medium text-muted">Workbook</dt>
          <dd className="mt-1 font-medium text-ink break-words">
            {workbookName?.trim() || '—'}
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-sunken/50 px-3.5 py-3">
          <dt className="text-sm font-medium text-muted">Sheet used</dt>
          <dd className="mt-1 font-medium text-ink break-words">
            {sheetName?.trim() || '—'}
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-sunken/50 px-3.5 py-3">
          <dt className="text-sm font-medium text-muted">Suppliers imported</dt>
          <dd className="mt-1 font-semibold tabular-nums text-ink">
            {supplierCount}
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-sunken/50 px-3.5 py-3">
          <dt className="text-sm font-medium text-muted">TMPS denominator</dt>
          <dd className="mt-1 font-medium text-ink">{tmpsDenominatorSourceLabel}</dd>
        </div>
        <div className="rounded-xl border border-line bg-sunken/50 px-3.5 py-3 sm:col-span-2">
          <dt className="text-sm font-medium text-muted">Assessment year</dt>
          <dd className="mt-1 font-semibold tabular-nums text-ink">{yearLabel}</dd>
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
        'border border-ok/30 bg-ok-soft/90 text-ok shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
    }
  if (status === 'moderate')
    return {
      label: 'Near target',
      className:
        'border border-warn/30 bg-warn-soft/80 text-warn shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]',
    }
  return {
    label: 'Action required',
    className:
      'border border-bad/30 bg-bad-soft/85 text-bad shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
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
        isTable ? 'group max-w-[14rem]' : 'group mt-3 border-t border-line pt-3'
      }
    >
      <summary
        className={`cursor-pointer list-none font-medium text-muted underline decoration-slate-300/80 underline-offset-2 transition hover:text-ink [&::-webkit-details-marker]:hidden ${
          isTable ? 'text-sm' : 'text-sm'
        }`}
      >
        View calculation
      </summary>
      <div
        className={`space-y-1.5 text-sm leading-relaxed text-muted ${
          isTable ? 'mt-2' : 'mt-2.5'
        }`}
      >
        <p>
          <span className="font-medium text-ink">Target:</span>{' '}
          {formatPercentage(cat.targetPercent, 0)} of TMPS
        </p>
        <p>
          <span className="font-medium text-ink">Achieved:</span>{' '}
          {formatCurrencyZar(cat.numeratorValue)} / {formatCurrencyZar(cat.denominatorValue)} ={' '}
          {achievedPctLabel}
        </p>
        <p>
          <span className="font-medium text-ink">Points:</span>{' '}
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
      <p className="text-sm font-medium text-faint">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-ink">
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
      className={`flex flex-col rounded-2xl border border-line/90 bg-surface px-4 pb-4 pt-4 shadow-sm sm:px-4 ${categoryCardAccentClass(cat.status)}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-ink">
            {cat.name}
          </h3>
          <span
            className={`mt-2 inline-flex rounded-xl px-2 py-0.5 text-sm font-medium tracking-tight ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-faint">
            Points
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-ink">
            {formatPoints(cat.pointsAchieved)}
            <span className="font-normal text-faint"> / </span>
            <span className="text-base font-semibold text-muted">
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
        <div className="flex items-baseline justify-between gap-2 text-sm font-medium text-faint">
          <span>Progress to target</span>
          <span className="tabular-nums normal-case tracking-normal text-muted">
            {showGap ? `${bar.toFixed(0)}%` : 'Complete'}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${progressBarFillClass(cat.status)}`}
            style={{ width: `${bar}%` }}
          />
        </div>
      </div>

      {showGap ? (
        <p className="mt-3 text-sm leading-snug text-ink">
          <span className="tabular-nums font-medium text-ink">
            {cat.gapPercentPoints.toFixed(1)} percentage points below target
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-ok/90">At or above target</p>
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
      <div className="border-b border-line/90 px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
          Category performance
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Targets, achieved shares, and procurement points by category.
        </p>
        {summaryLine ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">{summaryLine}</p>
        ) : null}
      </div>

      {/* Desktop / print: compact table */}
      <div className="hidden overflow-x-auto px-4 pb-5 pt-1 lg:block print:block">
        <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line/80 text-sm font-medium text-faint">
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
          <tbody className="divide-y divide-line">
            {insights.map((cat) => {
              const bar = categoryProgressWidth(cat)
              const badge = categoryInsightDisplayLabel(cat.status)
              const targetPct = formatPercentFromRatio(cat.targetPercent, 0)
              const achievedPct = formatPercentFromRatio(cat.achievedPercent, 1)
              const showGap = cat.gapPercentPoints > 0.05
              return (
                <tr key={cat.key} className="align-middle text-ink">
                  <td className="max-w-[11rem] py-3.5 pl-3 pr-2 text-[15px] font-semibold leading-snug text-ink">
                    {cat.name}
                  </td>
                  <td className="px-2 py-3.5">
                    <span
                      className={`inline-flex rounded-xl px-2 py-0.5 text-sm font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right tabular-nums text-ink">
                    {targetPct}
                  </td>
                  <td className="px-2 py-3.5 text-right tabular-nums font-medium text-ink">
                    {achievedPct}
                  </td>
                  <td className="px-2 py-3.5 text-[15px] leading-snug text-muted">
                    {showGap ? (
                      <span className="tabular-nums text-ink">
                        {cat.gapPercentPoints.toFixed(1)} percentage points below target
                      </span>
                    ) : (
                      <span className="text-ok/85">At or above target</span>
                    )}
                  </td>
                  <td className="px-2 py-3.5 text-right tabular-nums text-sm font-semibold text-ink">
                    {formatPoints(cat.pointsAchieved)}
                    <span className="font-normal text-faint"> / </span>
                    {formatPoints(cat.availablePoints, 0)}
                  </td>
                  <td className="px-2 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium  text-faint">
                        {showGap ? `${bar.toFixed(0)}%` : 'Complete'}
                      </span>
                      <div className="h-1.5 w-full max-w-[7rem] overflow-hidden rounded-full bg-slate-200">
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
    <section className="rounded-2xl border border-line/90 bg-surface shadow-sm print:shadow-none">
      <div className="px-6 py-6 sm:px-7">
        <p className="text-sm font-medium text-faint">
          Category analysis
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
              Detailed category breakdown
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Targets, achieved shares, points, and recognised spend by procurement category.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-line" />

      {showSummaryStrip ? (
        <div className="mx-6 mb-5 mt-5 grid gap-3 sm:mx-7 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-sunken px-4 py-3">
            <p className="text-sm font-medium text-faint">
              Categories met
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
              {met} / {total}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-sunken px-4 py-3">
            <p className="text-sm font-medium text-faint">
              Strongest category
            </p>
            <p className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] text-ink">
              {strongestName ?? '—'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-sunken px-4 py-3">
            <p className="text-sm font-medium text-faint">
              Largest gap
            </p>
            <p className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] text-ink">
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
            <tr className="border-b border-line bg-sunken/40">
              <th className="px-6 py-3 text-left text-sm font-medium text-faint sm:px-7">
                Category
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-faint">
                Target
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-faint">
                Achieved
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-faint">
                Points
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-faint">
                Recognised value
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-faint sm:px-7">
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
                  className="group border-b border-line last:border-b-0 hover:bg-sunken/45"
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
                        <p className="font-semibold tracking-[-0.02em] text-ink">
                          {cat.name}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">{secondaryLine}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm tabular-nums text-muted">
                    {formatPercentFromRatio(cat.targetPercent, 0)}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex min-w-[170px] items-center gap-3">
                      <div
                        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200"
                        role="img"
                        aria-label={`Achieved ${achievedLabel} of target; ${Math.round(barPct)}% of target share`}
                      >
                        <div
                          className={clsx(
                            'h-full rounded-full',
                            isMet ? 'bg-brand' : 'bg-slate-300',
                          )}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
                        {achievedLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">
                    <span className="font-semibold text-ink">
                      {cat.pointsAchieved.toFixed(2)}
                    </span>
                    <span className="text-faint"> / {cat.availablePoints.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-4 text-right text-sm tabular-nums text-muted">
                    {formatCurrencyZar(cat.numeratorValue)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums text-muted sm:px-7">
                    {formatCurrencyZar(cat.denominatorValue)}
                  </td>
                </tr>
              )
            })}
            {!categories.length ? (
              <tr>
                <td colSpan={6} className="px-7 py-10 text-center text-sm text-muted">
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
    <section className="rounded-2xl border border-line/90 bg-surface p-6 shadow-sm sm:p-8 print:border print:border-line-strong print:shadow-none">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-faint">
          Guidance
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-ink">
          Recommended improvement actions
        </h2>
        <p className="mt-2 text-base leading-7 text-muted">
          Rule-based suggestions from category gaps and supplier compliance mix.
        </p>
      </div>

      {items.length > 0 ? (
        <ol className="mt-8 divide-y divide-line rounded-2xl border border-line/90 bg-sunken/40">
          {items.map((line, i) => (
            <li
              key={`${i}-${line}`}
              className="flex gap-4 px-5 py-5 sm:items-start"
            >
              <span
                className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-blue-900/40 bg-blue-950 text-sm font-semibold tabular-nums text-white"
                aria-hidden
              >
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 text-[15px] leading-7 text-ink">{line}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-8 rounded-xl border border-ok/30 bg-ok-soft/60 px-5 py-4">
          <p className="text-sm font-medium text-ok">
            No priority improvement actions detected.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ok">
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
    <div className="rounded-2xl border border-line/90 bg-surface shadow-sm print:overflow-visible">
      <div className="px-6 py-7 sm:px-8">
        <p className="text-sm font-medium text-faint">
          TMPS calculation
        </p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <p className="max-w-2xl text-base leading-7 text-muted">{intro}</p>
          <div className="shrink-0 text-left lg:text-right">
            <p className="text-sm font-medium text-faint">
              Saved denominator
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-ink tabular-nums sm:text-[2.5rem]">
              {formatCurrencyZar(savedAmount)}
            </p>
          </div>
        </div>
      </div>

      {hasTmpsBreakdown && tmpsTotals ? (
        <>
          <div className="border-y border-line px-6 py-6 sm:px-8">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-faint">
                  Calculated TMPS (pad)
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink tabular-nums">
                  {formatCurrencyZar(tmpsTotals.tmpsTotal)}
                </p>
              </div>
              <div className="sm:border-l sm:border-line sm:pl-6">
                <p className="text-sm font-medium text-faint">
                  Inclusions
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink tabular-nums">
                  {formatCurrencyZar(tmpsTotals.inclusionsTotal)}
                </p>
              </div>
              <div className="sm:border-l sm:border-line sm:pl-6">
                <p className="text-sm font-medium text-faint">
                  Exclusions
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink tabular-nums">
                  {formatCurrencyZar(tmpsTotals.exclusionsTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 pt-6 sm:px-8">
            <div className="rounded-xl border border-line bg-sunken px-4 py-3.5 text-sm leading-relaxed text-muted sm:px-5 sm:py-4">
              <span className="font-semibold text-ink">TMPS</span>
              <span className="mx-1.5 text-faint sm:mx-2">=</span>
              <span>Inclusions</span>
              <span className="mx-1.5 text-faint sm:mx-2">−</span>
              <span>Exclusions</span>
              <span className="mx-1.5 text-faint sm:mx-2">→</span>
              <span className="tabular-nums">{formatCurrencyZar(tmpsTotals.inclusionsTotal)}</span>
              <span className="mx-1.5 text-faint sm:mx-2">−</span>
              <span className="tabular-nums">{formatCurrencyZar(tmpsTotals.exclusionsTotal)}</span>
              <span className="mx-1.5 text-faint sm:mx-2">=</span>
              <span className="font-semibold tabular-nums text-ink">
                {formatCurrencyZar(tmpsTotals.tmpsTotal)}
              </span>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-2 lg:gap-10">
            <div>
              <p className="text-sm font-medium text-faint">
                Inclusion line items
              </p>
              <div className="mt-4 divide-y divide-line">
                {TMPS_INCLUSIONS.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0"
                  >
                    <span className="text-sm text-muted">{line.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {formatCurrencyZar(Number(assessmentRecord[line.key] ?? 0))}
                    </span>
                  </div>
                ))}
                {customInclusionLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span className="text-sm text-muted">{line.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {formatCurrencyZar(line.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:border-l lg:border-line lg:pl-8">
              <p className="text-sm font-medium text-faint">
                Exclusion line items
              </p>
              <div className="mt-4 divide-y divide-line">
                {TMPS_EXCLUSIONS.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0"
                  >
                    <span className="text-sm text-muted">{line.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {formatCurrencyZar(Number(assessmentRecord[line.key] ?? 0))}
                    </span>
                  </div>
                ))}
                {customExclusionLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span className="text-sm text-muted">{line.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {formatCurrencyZar(line.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-line px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Scoring denominator saved
                </p>
                <p className="mt-1 text-sm text-muted">
                  Stored as total measured procurement spend on the assessment record.
                </p>
                {tmpsDenominatorSource !== 'calculated' ||
                Math.abs(tmpsTotals.tmpsTotal - totalMeasuredSpend) > 0.5 ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Calculated TMPS from this pad:{' '}
                    <span className="font-medium tabular-nums">
                      {formatCurrencyZar(tmpsTotals.tmpsTotal)}
                    </span>
                  </p>
                ) : null}
              </div>
              <p className="text-3xl font-semibold tracking-[-0.04em] text-ink tabular-nums sm:text-right">
                {formatCurrencyZar(totalMeasuredSpend)}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
