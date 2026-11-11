'use client'

import { useState, type ReactNode } from 'react'
import { CardLabel } from '@/components/ui/Card'
import { Chip, DeltaPill, type ChipTone } from '@/components/ui/Chip'
import { Num } from '@/components/ui/Num'
import { PartitionBar } from '@/components/ui/PartitionBar'
import { cn } from '@/components/ui/cn'
import { formatCeiling, formatPointsOf, formatPts } from '@/components/ui/format'
import { plainLevelSentence } from '@/lib/scorecard/generic/ux/areas'
import { heroSentence, type ElementGroup, type ElementGroupKey, type ScorecardView } from './scorecard-view'

/**
 * The score hero: the Stats Bento "64%" feature card (uilayout), rebuilt in
 * deep REAP teal.
 *
 *   B-BBEE SCORE · {company} · {year}              white 60%
 *   Non-compliant so far. 7 areas still need…      serif 26/32, white
 *   Not final yet: the score on the figures…       14/20, white 72%
 *   23.08  of 109  [chip]                          serif 72/1, Number Flow
 *   ▬▬ ▬ ▬▬▬▬▬▬▬▬▬▬▬▬▬                             Partition Bar, area tints
 *   ● Ownership 16.10 of 25 …                       legend, 13/18
 *
 * A faint diagonal line texture (white 4%) fades in from the top-right
 * corner, as on the reference. Nothing glows.
 *
 * Every figure is the engine's own (see scorecard-view.ts).
 */
export function ScoreHero(args: {
  view: ScorecardView
  company: string
  year: number | null
  /** The engine's total at the last Calculate, if there was one. */
  previousTotal?: number | null
  /** Quiet facts beside the score, from data already loaded ("Areas done", "Company size"). */
  stats?: Array<{ label: string; value: ReactNode }>
  className?: string
}) {
  const { view } = args
  const [hot, setHot] = useState<ElementGroupKey | null>(null)
  const sentence = heroSentence(view)
  const support = view.isFinal
    ? plainLevelSentence(view.level, view.recognition)
    : 'Not final yet: this is the score on the figures entered so far.'
  const delta = args.previousTotal != null && Math.abs(view.total - args.previousTotal) >= 0.005 ? view.total - args.previousTotal : null
  const levelTone: ChipTone = !view.isFinal ? 'neutral' : view.levelNumber == null ? 'attention' : 'success'

  return (
    <section
      aria-labelledby="score-hero-label"
      className={cn('relative isolate flex min-w-0 flex-col overflow-hidden rounded-card border border-brand-deep bg-brand p-6 text-on-teal shadow-card', args.className)}
    >
      {/* Diagonal line texture, white at 4%, fading out from the top-right corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3 bg-[repeating-linear-gradient(45deg,var(--color-on-teal-texture)_0,var(--color-on-teal-texture)_1px,transparent_1px,transparent_10px)] [mask-image:radial-gradient(ellipse_at_top_right,black_0%,transparent_70%)]"
      />

      <div className="flex min-h-9 items-center">
        <CardLabel as="h2" id="score-hero-label" className="truncate text-on-teal-subtle">
          B-BBEE score · {args.company}
          {args.year ? ` · ${args.year}` : ''}
        </CardLabel>
      </div>

      <p className="mt-4 max-w-[34ch] text-balance font-serif text-sentence font-medium">
        {sentence.lead}
        {sentence.reason ? ` ${sentence.reason}` : ''}
      </p>
      <p className="mt-2 max-w-[60ch] text-meta text-on-teal-muted">{support}</p>

      {/* Score block: the score, "of 109" and the chip share one baseline; quiet facts on the right. */}
      <div className="my-auto flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <p className="font-serif text-score font-medium tracking-tight">
            <Num value={view.total} />
            <span className="sr-only"> points</span>
          </p>
          <p className="font-serif text-sentence text-on-teal-subtle">of {formatCeiling(view.available)}</p>
          <Chip tone={levelTone}>
            {view.level}
            {!view.isFinal ? ' · not final' : ''}
          </Chip>
          {delta != null ? <DeltaPill value={delta} suffix="since last calculated" /> : null}
        </div>
        {args.stats && args.stats.length > 0 ? (
          <dl className="grid shrink-0 gap-y-1.5 text-meta">
            {args.stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline justify-between gap-6">
                <dt className="text-on-teal-subtle">{stat.label}</dt>
                <dd className="font-semibold tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {/* The bar is pinned to the bottom with at least 32px above it. */}
      <div className="pt-8">
        <PartitionBar
          label={`Points by area: ${formatPointsOf(view.earned, view.available)}`}
          remainder={Math.max(0, view.available - view.earned)}
          remainderColour="bg-on-teal-track"
          parts={view.groups.map((group) => ({
            key: group.key,
            value: group.earned,
            colour: group.colourOnTeal,
            label: `${group.label}: ${formatPointsOf(group.earned, group.available)}`,
            tooltip: <AreaTip group={group} />,
            onHover: (on) => setHot(on ? group.key : null),
            dimmed: hot !== null && hot !== group.key,
          }))}
        />
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Areas">
          {view.groups.map((group) => (
            <li
              key={group.key}
              className={cn('min-w-0 text-meta transition-opacity duration-150', hot !== null && hot !== group.key ? 'opacity-60' : 'opacity-100')}
            >
              {/* Names only: the figures are in the tiles and in each segment's tooltip. */}
              <span className="flex items-center gap-1.5 text-on-teal-muted">
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', group.colourOnTeal)} aria-hidden />
                <span className="truncate">{group.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** The dark tooltip: area, earned / available / shortfall, the ESD split, the engine's biggest gap. */
function AreaTip({ group }: { group: ElementGroup }) {
  return (
    <div className="w-60 space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-semibold">{group.label}</span>
      </div>
      <div className="h-px bg-tooltip-line" />
      {group.parts.length > 1 ? (
        <ul className="space-y-1.5 text-xs">
          {group.parts.map((part) => (
            <li key={part.key} className="flex items-center gap-2">
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', part.colourOnTeal)} aria-hidden />
              <span className="flex-1">{part.label}</span>
              <span className="tabular-nums text-tooltip-muted">{formatPointsOf(part.earned, part.available)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-xs">
        <dt className="text-tooltip-muted">Earned</dt>
        <dd className="text-right tabular-nums">{formatPts(group.earned)}</dd>
        <dt className="text-tooltip-muted">Available</dt>
        <dd className="text-right tabular-nums">{formatCeiling(group.available)}</dd>
        <dt className="text-tooltip-muted">Shortfall</dt>
        <dd className="text-right tabular-nums">{formatPts(group.shortfall)}</dd>
      </dl>
      {group.belowSubminimum ? (
        <p className="text-xs">
          Below its priority sub-minimum: {formatPts(group.belowSubminimum.achieved)} of the {formatPts(group.belowSubminimum.threshold)} points needed.
        </p>
      ) : null}
      {group.biggestGap ? (
        <p className="text-xs text-tooltip-muted">
          Most points to win: {group.biggestGap.name} ({formatPointsOf(group.biggestGap.achieved, group.biggestGap.available)})
        </p>
      ) : null}
    </div>
  )
}
