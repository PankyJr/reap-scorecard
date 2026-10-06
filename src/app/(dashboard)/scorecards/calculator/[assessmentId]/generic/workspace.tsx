import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Circle, CircleDot } from 'lucide-react'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import {
  AREA_COPY,
  droppedLevelSentence,
  losingPoints,
  minimumFor,
  type AreaKey,
  type AreaRow,
  type AreaStatus,
  type LiveScore,
} from '@/lib/scorecard/generic/ux/areas'
import { formatElementPoints, formatPoints } from '@/lib/scorecard/generic/ux/display-values'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { Term } from '@/components/ui/Term'

export type WorkspaceView = {
  rows: AreaRow[]
  score: LiveScore
  current: AreaKey | null
  next: AreaRow | null
  reviewHref: string
  hubHref: string
}

/** Colour only ever means status: green done, blue in progress, grey not started, amber a problem. */
const STATUS: Record<AreaStatus, { word: string; icon: typeof Circle; iconClass: string; barClass: string }> = {
  done: { word: 'Done', icon: CheckCircle2, iconClass: 'text-ok', barClass: 'bg-ok' },
  progress: { word: 'In progress', icon: CircleDot, iconClass: 'text-info', barClass: 'bg-info' },
  todo: { word: 'Not started', icon: Circle, iconClass: 'text-faint', barClass: 'bg-line-strong' },
  problem: { word: 'Needs attention', icon: AlertTriangle, iconClass: 'text-warn', barClass: 'bg-warn' },
}

function AreaLink({ row, current }: { row: AreaRow; current: boolean }) {
  const status = STATUS[row.status]
  const Icon = status.icon
  const share = row.available ? Math.max(0, Math.min(1, (row.achieved ?? 0) / row.available)) : 0
  return (
    <Link
      href={row.href}
      aria-current={current ? 'page' : undefined}
      className={`block rounded-control px-3 py-2.5 transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 ${
        current ? 'bg-brand-soft' : ''
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className={`h-5 w-5 shrink-0 ${status.iconClass}`} aria-hidden />
        <span className={`min-w-0 flex-1 truncate text-[15px] ${current ? 'font-semibold text-ink' : 'text-ink'}`}>{row.label}</span>
        {row.available != null ? (
          <span className="shrink-0 text-sm tabular-nums text-muted">{formatElementPoints(row.achieved, row.available)}</span>
        ) : null}
        <span className="sr-only">, {status.word}</span>
      </span>
      {row.available != null ? (
        <span className="mt-1.5 ml-7.5 block h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
          <span className={`block h-full rounded-full ${status.barClass}`} style={{ width: `${share * 100}%` }} />
        </span>
      ) : null}
      {row.note ? (
        <span className={`mt-1 ml-7.5 block text-sm ${row.status === 'problem' ? 'text-warn' : 'text-muted'}`}>{row.note}</span>
      ) : null}
    </Link>
  )
}

/** The checklist: a sidebar on desktop, the main list on a phone. Any order. */
export function AreaChecklist({ view }: { view: WorkspaceView }) {
  const setup = view.rows.filter((row) => row.setup)
  const areas = view.rows.filter((row) => !row.setup)
  const done = areas.filter((row) => row.status === 'done').length
  return (
    <nav aria-label="Scorecard areas" className="rounded-card border border-line bg-surface p-2">
      <p className="px-3 pb-1 pt-2 text-sm font-semibold text-muted">First</p>
      <ul>
        {setup.map((row) => (
          <li key={row.key}>
            <AreaLink row={row} current={row.key === view.current} />
          </li>
        ))}
      </ul>
      <p className="px-3 pb-1 pt-4 text-sm font-semibold text-muted">
        The seven <Term k="element">areas</Term>{' '}
        <span className="font-normal">
          ({done} of {areas.length} done)
        </span>
      </p>
      <ul>
        {areas.map((row) => (
          <li key={row.key}>
            <AreaLink row={row} current={row.key === view.current} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Always visible: the points and level on the figures entered so far, from the
 * engine. Pinned to the bottom of the screen on a phone. Says plainly which
 * priority area dropped the level, and offers the one next step.
 */
export function LiveScoreBar({ view }: { view: WorkspaceView }) {
  const { score } = view
  const warning = droppedLevelSentence(score)
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-4px_16px_rgba(5,30,33,0.08)] backdrop-blur lg:sticky lg:bottom-4 lg:mx-0 lg:rounded-card lg:border lg:px-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0" aria-live="polite">
          <p className="text-sm text-muted">Score so far</p>
          <p className="text-lg font-semibold tabular-nums text-ink">
            {formatPoints(score.totalPoints)} points · {score.level}
            {!score.isFinal ? <span className="ml-1.5 text-[15px] font-normal text-muted">(not final yet)</span> : null}
          </p>
          {warning ? (
            <p className="mt-0.5 flex items-start gap-1.5 text-sm text-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{warning}</span>
            </p>
          ) : null}
        </div>
        {view.next ? (
          <Link href={view.next.href} className={buttonStyles({ variant: 'primary', className: 'shrink-0' })}>
            Next: {view.next.label} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link href={view.reviewHref} className={buttonStyles({ variant: 'primary', className: 'shrink-0' })}>
            Review my scorecard <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}

/** On a phone an area is full screen: this is the way back to the list. */
export function BackToAreas({ view }: { view: WorkspaceView }) {
  return (
    <Link href={view.hubHref} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand hover:underline lg:hidden">
      <ArrowLeft className="h-4 w-4" aria-hidden /> All areas
    </Link>
  )
}

/**
 * The top of an area: what it measures, the points so far (live), the
 * minimum if it is a priority area (the engine's threshold), and where the
 * points are being lost.
 */
export function AreaIntro(args: { areaKey: AreaKey; preview: GenericScorecardCalculation }) {
  const element = args.preview.elements.find((e) => e.elementKey === args.areaKey)
  const minimum = minimumFor(args.preview, args.areaKey)
  const lost = losingPoints(element)
  if (!element) return null
  const minimumScope =
    minimum && minimum.basisPoints !== element.basePointsAvailable
      ? `of the ${formatPoints(minimum.basisPoints)} ${args.areaKey === 'ownership' ? 'net value ' : ''}points `
      : ''
  return (
    <section className="space-y-4 rounded-card border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
        <p className="font-serif text-3xl font-semibold tabular-nums text-ink">
          {formatElementPoints(element.basePointsAchieved, element.basePointsAvailable)}
          <span className="ml-2 font-sans text-base font-normal text-muted">points so far</span>
        </p>
        {element.bonusPointsAvailable > 0 ? (
          <p className="text-[15px] tabular-nums text-muted">
            plus {formatPoints(element.bonusPointsAchieved)} of {formatPoints(element.bonusPointsAvailable)}{' '}
            <Term k="bonusPoints">bonus points</Term>
          </p>
        ) : null}
      </div>
      <p className="text-[15px] text-ink">{AREA_COPY[args.areaKey].measures}</p>

      {minimum ? (
        <p
          className={`rounded-control px-3 py-2 text-[15px] ${
            minimum.evaluated && minimum.passed === false ? 'bg-warn-soft text-ink' : 'bg-sunken text-ink'
          }`}
        >
          <Term k="subMinimum">Priority area</Term>: you need at least {formatPoints(minimum.thresholdPoints)} points{' '}
          {minimumScope}here or you drop a level.{' '}
          {minimum.evaluated && minimum.achievedPoints != null ? (
            <strong>
              {minimum.passed ? 'Met' : 'Not met'}: {formatPoints(minimum.achievedPoints)} so far.
            </strong>
          ) : null}
        </p>
      ) : null}

      {lost.length > 0 ? (
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Where you’re losing points</h2>
          <ul className="mt-2 space-y-2">
            {lost.map((row) => (
              <li key={row.name} className="text-[15px]">
                <span className="font-medium text-ink">{row.name}</span>{' '}
                <span className="tabular-nums text-muted">
                  {formatPoints(row.achieved)} of {formatPoints(row.available)}
                </span>
                <span className="block text-sm text-muted">{row.why}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : element.status === 'scored' ? (
        <p className="text-[15px] text-ok">Full points: nothing lost here.</p>
      ) : null}
    </section>
  )
}

/** "Worth up to 6 points" for a section of fields, from the engine's indicator budgets. */
export function sectionWorth(element: GenericScorecardCalculation['elements'][number] | undefined, prefixes: string[]) {
  if (!element) return null
  const indicators = element.indicators.filter((i) => prefixes.some((p) => i.indicatorKey.startsWith(p)))
  if (indicators.length === 0) return null
  const available = indicators.reduce((sum, i) => sum + i.basePointsAvailable, 0)
  const achieved = indicators.reduce((sum, i) => sum + (i.basePointsAchieved ?? 0), 0)
  const bonus = indicators.reduce((sum, i) => sum + (i.bonusPointsAvailable ?? 0), 0)
  return { available, achieved, bonus }
}

/** A short group of fields that says what it is worth. */
export function AreaSection(args: {
  title: string
  description?: string
  worth: ReturnType<typeof sectionWorth>
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{args.title}</h2>
        {args.worth ? (
          <p className="text-sm tabular-nums text-muted">
            {formatPoints(args.worth.achieved)} of {formatPoints(args.worth.available)} points
            {args.worth.bonus > 0 ? ` (+${formatPoints(args.worth.bonus)} bonus)` : ''}
          </p>
        ) : null}
      </div>
      {args.description ? <p className="-mt-2 text-[15px] text-muted">{args.description}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">{args.children}</div>
    </section>
  )
}
