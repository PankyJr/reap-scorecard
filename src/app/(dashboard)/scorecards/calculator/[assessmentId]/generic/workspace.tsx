import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Circle, CircleDot } from 'lucide-react'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import {
  droppedLevelSentence,
  losingPoints,
  minimumFor,
  type AreaKey,
  type AreaRow,
  type AreaStatus,
  type LiveScore,
} from '@/lib/scorecard/generic/ux/areas'
import { formatPoints } from '@/lib/scorecard/generic/ux/display-values'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { Term } from '@/components/ui/Term'
import { ScoreCard } from '@/components/scorecard/ScoreCard'
import { buildScorecardView, groupKeyForArea } from '@/components/scorecard/scorecard-view'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { Callout } from '@/components/ui/Callout'
import { MiniBar } from '@/components/ui/MiniBar'
import { SectionTitle } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'

export type WorkspaceView = {
  rows: AreaRow[]
  score: LiveScore
  current: AreaKey | null
  next: AreaRow | null
  reviewHref: string
  hubHref: string
}

/** The same capsule words as the area tiles on Home. */
const STATUS: Record<AreaStatus, { word: string; tone: ChipTone; icon: typeof Circle; iconClass: string }> = {
  done: { word: 'Done', tone: 'success', icon: CheckCircle2, iconClass: 'text-teal' },
  progress: { word: 'In progress', tone: 'progress', icon: CircleDot, iconClass: 'text-teal' },
  todo: { word: 'Not started', tone: 'neutral', icon: Circle, iconClass: 'text-icon' },
  problem: { word: 'Needs attention', tone: 'attention', icon: AlertTriangle, iconClass: 'text-attention' },
}

/** Each area's colour; the three ESD parts use the three coral tints. */
const AREA_STROKE: Partial<Record<AreaKey, string>> = {
  ownership: 'stroke-el-own',
  management_control: 'stroke-el-mc',
  skills_development: 'stroke-el-skills',
  preferential_procurement: 'stroke-el-esd-pp',
  supplier_development: 'stroke-el-esd-sd',
  enterprise_development: 'stroke-el-esd-ed',
  socio_economic_development: 'stroke-el-sed',
}

/** A 20px ring in the area's colour, filled to earned / available. */
function TinyRing({ areaKey, share }: { areaKey: AreaKey; share: number }) {
  const size = 20
  const stroke = 2.5
  const r = size / 2 - stroke / 2
  const length = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-track" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" className={AREA_STROKE[areaKey] ?? 'stroke-teal'} strokeDasharray={length} strokeDashoffset={length * (1 - share)} />
    </svg>
  )
}

function AreaLink({ row, current }: { row: AreaRow; current: boolean }) {
  const status = STATUS[row.status]
  const Icon = status.icon
  const share = row.available ? Math.max(0, Math.min(1, (row.achieved ?? 0) / row.available)) : 0
  return (
    <Link
      href={row.href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex min-h-[52px] items-center gap-2.5 rounded-[10px] px-2.5 py-2 transition-[background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25',
        current ? 'bg-surface shadow-pill' : 'hover:bg-wash',
      )}
    >
      {row.setup ? <Icon className={cn('mt-px h-5 w-5 shrink-0 self-start', status.iconClass)} aria-hidden /> : <span className="mt-px self-start"><TinyRing areaKey={row.key} share={share} /></span>}
      <span className="min-w-0 flex-1">
        {/* The name never truncates: it wraps to a second line if it must. */}
        <span className={cn('block text-body', current ? 'font-medium text-ink' : 'text-nav-ink')}>{row.label}</span>
        <span className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          {row.available != null ? (
            <span className="text-meta tabular-nums text-label">
              {formatPoints(row.achieved ?? 0)} of {formatPoints(row.available)}
            </span>
          ) : row.note ? (
            <span className="min-w-0 text-meta text-label">{row.note}</span>
          ) : (
            <span />
          )}
          <Chip tone={status.tone} className="shrink-0">
            {status.word}
          </Chip>
        </span>
      </span>
    </Link>
  )
}

/**
 * The checklist (Never Before Seen getting-started): "x of 7 done" with a
 * bar on top, then the two set-up steps and the seven areas. Each area has a
 * tiny ring in its colour, its points and a capsule. The current one is a
 * white raised pill on the grey list. A sidebar on desktop; on a phone it is
 * the overview itself.
 */
export function AreaChecklist({ view }: { view: WorkspaceView }) {
  const setup = view.rows.filter((row) => row.setup)
  const areas = view.rows.filter((row) => !row.setup)
  const done = areas.filter((row) => row.status === 'done').length
  return (
    <nav aria-label="Scorecard areas" className="rounded-card border border-line bg-sunken p-2">
      <div className="px-2.5 pb-3 pt-2">
        <p className="flex items-baseline justify-between text-meta">
          <span className="font-medium text-ink">
            <Term k="element">Areas</Term> done
          </span>
          <span className="tabular-nums text-label">
            {done} of {areas.length} done
          </span>
        </p>
        <MiniBar value={done} max={areas.length} width="w-full" className="mt-2 block" />
      </div>
      <p className="px-2.5 pb-1 pt-2 text-caps font-medium text-icon">First</p>
      <ul className="space-y-0.5">
        {setup.map((row) => (
          <li key={row.key}>
            <AreaLink row={row} current={row.key === view.current} />
          </li>
        ))}
      </ul>
      <p className="px-2.5 pb-1 pt-4 text-caps font-medium text-icon">The seven areas</p>
      <ul className="space-y-0.5">
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
 * The bar along the bottom: white, a hairline on top, "Level so far" on the
 * left and the one next step on the right. Pinned to the bottom of the screen.
 */
export function LiveScoreBar({ view }: { view: WorkspaceView }) {
  const { score } = view
  const warning = droppedLevelSentence(score)
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 py-3 lg:sticky lg:-mx-8 lg:mt-8 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0" aria-live="polite">
          {/* The level only: the points are in the score card at the top of the page. */}
          <p className="text-meta text-label">Level so far</p>
          <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
            {score.level}
            {!score.isFinal ? <Chip tone="neutral">Not final</Chip> : null}
          </p>
          {warning ? (
            <p className="mt-0.5 flex items-start gap-1.5 text-meta text-attention">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sm:hidden">
                Dropped one level: {score.droppedBy.length} {score.droppedBy.length === 1 ? 'area is' : 'areas are'} below
                the minimum.
              </span>
              <span className="hidden sm:inline">{warning}</span>
            </p>
          ) : null}
        </div>
        {view.next ? (
          <Link href={view.next.href} className={buttonStyles({ variant: 'primary', className: 'shrink-0' })}>
            Next: {view.next.label} <ArrowRight aria-hidden />
          </Link>
        ) : (
          <Link href={view.reviewHref} className={buttonStyles({ variant: 'primary', className: 'shrink-0' })}>
            Review my scorecard <ArrowRight aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}

/** On a phone an area is full screen: this is the way back to the list. */
export function BackToAreas({ view }: { view: WorkspaceView }) {
  return (
    <Link href={view.hubHref} className={buttonStyles({ variant: 'plain', className: '-ml-2 lg:hidden' })}>
      <ArrowLeft aria-hidden /> All areas
    </Link>
  )
}

/**
 * The top of an area: the compact score card with this area's ring lit and
 * the rest at 30%, the priority minimum (the engine's threshold) as a callout,
 * and "Where you're losing points" as a list with a small bar per line.
 */
export function AreaIntro(args: { areaKey: AreaKey; preview: GenericScorecardCalculation; company?: string; year?: number | null }) {
  const element = args.preview.elements.find((e) => e.elementKey === args.areaKey)
  const minimum = minimumFor(args.preview, args.areaKey)
  const lost = losingPoints(element)
  if (!element) return null
  const minimumScope =
    minimum && minimum.basisPoints !== element.basePointsAvailable
      ? `of the ${formatPoints(minimum.basisPoints)} ${args.areaKey === 'ownership' ? 'net value ' : ''}points `
      : ''
  const group = groupKeyForArea(args.areaKey)
  const failed = Boolean(minimum?.evaluated && minimum.passed === false)
  return (
    <>
      {/* The whole scorecard, compact, with this area lit. The total appears only here. */}
      <ScoreCard view={buildScorecardView(args.preview)} company={args.company ?? 'This scorecard'} year={args.year} compact emphasis={group} fillKey={`area-${args.areaKey}`} />

      <section className="space-y-4" aria-label="This area">
        <p className="flex flex-wrap items-baseline gap-x-2 text-body text-label">
          <span className="text-section font-semibold tabular-nums text-ink">{formatPoints(element.basePointsAchieved)}</span>
          of {formatPoints(element.basePointsAvailable)} points in this area
          {element.bonusPointsAvailable > 0 ? (
            <span className="tabular-nums">
              · plus {formatPoints(element.bonusPointsAchieved)} of {formatPoints(element.bonusPointsAvailable)} <Term k="bonusPoints">bonus points</Term>
            </span>
          ) : null}
        </p>

        {minimum ? (
          <Callout tone={failed ? 'attention' : 'neutral'} title={minimum.evaluated && minimum.achievedPoints != null ? `${minimum.passed ? 'Met' : 'Not met'}: ${formatPoints(minimum.achievedPoints)} so far` : undefined}>
            <Term k="subMinimum">Priority area</Term>: you need at least {formatPoints(minimum.thresholdPoints)} points {minimumScope}here or you drop a level.
          </Callout>
        ) : null}

        {lost.length > 0 ? (
          <div>
            <SectionTitle as="h2">Where you’re losing points</SectionTitle>
            <ul className="mt-2 divide-y divide-divider border-y border-line">
              {lost.map((row) => {
                const share = row.available > 0 ? row.achieved / row.available : 0
                return (
                  <li key={row.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 py-3">
                    <span className="min-w-0 truncate text-body font-medium text-ink">{row.name}</span>
                    <span className="flex items-center gap-2.5 whitespace-nowrap text-meta tabular-nums text-label">
                      <MiniBar value={row.achieved} max={row.available} colour={share < 0.5 ? 'bg-danger' : 'bg-attention'} />
                      {formatPoints(row.achieved)} of {formatPoints(row.available)}
                    </span>
                    <span className="col-span-2 text-meta text-label">{row.why}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : element.status === 'scored' ? (
          <p className="flex items-center gap-1.5 text-body text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Full points: nothing lost here.
          </p>
        ) : null}
      </section>
    </>
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

/**
 * A group of fields (Untitled UI settings): title and helper text on the left
 * (280px), the fields on the right in two columns, and what the group is
 * worth ("3.98 of 6.00 points" with a small bar) at the top right.
 */
export function AreaSection(args: {
  title: string
  description?: string
  worth: ReturnType<typeof sectionWorth>
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-x-6 gap-y-4 border-t border-line py-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="min-w-0">
        <SectionTitle as="h2">{args.title}</SectionTitle>
        {args.description ? <p className="mt-1 text-meta text-label">{args.description}</p> : null}
      </div>
      <div className="min-w-0 space-y-4">
        {args.worth ? (
          <p className="flex items-center gap-2.5 text-meta tabular-nums text-label xl:justify-end">
            <MiniBar value={args.worth.achieved} max={args.worth.available} />
            <span>
              <span className="font-medium text-ink">{formatPoints(args.worth.achieved)}</span> of {formatPoints(args.worth.available)} points
              {args.worth.bonus > 0 ? ` (+${formatPoints(args.worth.bonus)} bonus)` : ''}
            </span>
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">{args.children}</div>
      </div>
    </section>
  )
}
