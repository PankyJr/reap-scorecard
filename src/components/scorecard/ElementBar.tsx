'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/components/ui/cn'
import { formatCeiling, formatPointsOf, formatPts } from '@/components/ui/format'
import type { ElementGroup, ElementGroupKey, ScorecardView } from './scorecard-view'

/**
 * Keel budget bar + Compliance Cards legend and tooltip.
 *
 *   "{earned} of {available} points"
 *   one stacked bar: 10px, rounded ends, 2px gaps, five element colours sized
 *   by points earned against the scorecard's total, grey track for the rest
 *   legend rows: dot · name · "7.25 of 25"
 *
 * Hover or keyboard focus on a segment or a legend row opens the dark tooltip
 * (earned, available, shortfall; the ESD split; the engine's biggest gap).
 * Esc closes it. Tooltips are extra: every number is also on the page.
 *
 * full     the dashboard: big header, legend rows
 * compact  an element page: one line, the current element lit, others dimmed
 */
export function ElementBar({
  view,
  variant = 'full',
  current,
  hrefFor,
  className,
}: {
  view: ScorecardView
  variant?: 'full' | 'compact'
  /** Compact: the element this page is about. */
  current?: ElementGroupKey
  /** Where each element's figures are entered, for the legend links. */
  hrefFor?: (group: ElementGroup) => string | null
  className?: string
}) {
  const [hot, setHot] = useState<ElementGroupKey | null>(null)
  const lit = (key: ElementGroupKey) => (variant === 'compact' && current ? key === current : hot === null || hot === key)
  const remainder = Math.max(0, view.available - view.earned)
  const compact = variant === 'compact'

  return (
    <div className={cn('min-w-0', className)}>
      <p className={cn('font-semibold tabular-nums text-ink', compact ? 'text-sm' : 'text-title leading-tight')}>
        {formatPts(view.earned)} <span className={cn('font-normal text-label', compact ? '' : 'text-lg')}>of {formatCeiling(view.available)} points</span>
        {view.bonusEarned > 0 ? (
          <span className={cn('ml-2 font-normal text-label', compact ? 'text-xs' : 'text-sm')}>+ {formatPts(view.bonusEarned)} bonus</span>
        ) : null}
      </p>

      {/* The bar. Fixed 10px (design rule 18). Segments are flex-grown by points. */}
      <div
        className={cn('flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full', compact ? 'mt-2' : 'mt-4')}
        role="group"
        aria-label={`Points by area: ${formatPointsOf(view.earned, view.available)}`}
        onMouseLeave={() => setHot(null)}
      >
        {view.groups
          .filter((g) => g.earned > 0)
          .map((group) => (
            <Tooltip key={group.key} content={<GroupTip group={group} />}>
              <button
                type="button"
                aria-label={`${group.label}: ${formatPointsOf(group.earned, group.available)}`}
                onMouseEnter={() => setHot(group.key)}
                onFocus={() => setHot(group.key)}
                onBlur={() => setHot(null)}
                className={cn(
                  'flex h-full min-w-1 gap-0.5 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                  lit(group.key) ? 'opacity-100' : 'opacity-30',
                )}
                style={{ flexGrow: group.earned, flexBasis: 0 } as CSSProperties}
              >
                {group.parts
                  .filter((p) => p.earned > 0)
                  .map((part) => (
                    <span key={part.key} className={cn('block h-full', part.colour)} style={{ flexGrow: part.earned, flexBasis: 0 }} />
                  ))}
              </button>
            </Tooltip>
          ))}
        {remainder > 0 ? <span className="block h-full bg-track" style={{ flexGrow: remainder, flexBasis: 0 }} aria-hidden /> : null}
      </div>

      {compact ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-label" aria-label="Areas">
          {view.groups.map((group) => (
            <li key={group.key} className={cn('flex items-center gap-1.5 transition-opacity duration-150', lit(group.key) ? 'opacity-100' : 'opacity-50')}>
              <span className={cn('h-2 w-2 rounded-full', group.dot)} aria-hidden />
              <span className={cn(group.key === current && 'font-semibold text-ink')}>{group.short}</span>
              <span className="tabular-nums">{formatPointsOf(group.earned, group.available)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-5 space-y-0.5" aria-label="Points by area">
          {view.groups.map((group) => {
            const href = hrefFor?.(group) ?? null
            const row: ReactNode = (
              <>
                <span className={cn('h-2 w-2 shrink-0 rounded-full', group.dot)} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-ink" title={group.label}>
                  {group.label}
                </span>
                {group.belowSubminimum ? (
                  <Chip tone="attention" size="sm">
                    Below priority sub-minimum
                  </Chip>
                ) : null}
                <span className="shrink-0 text-sm tabular-nums text-ink">
                  {formatPts(group.earned)} <span className="text-label">of {formatCeiling(group.available)}</span>
                </span>
              </>
            )
            const rowClass = cn(
              '-mx-2 flex min-h-11 items-center gap-3 rounded-sm px-2 transition-[background-color,opacity] duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 sm:min-h-9',
              lit(group.key) ? 'opacity-100' : 'opacity-60',
            )
            const handlers = {
              onMouseEnter: () => setHot(group.key),
              onMouseLeave: () => setHot(null),
              onFocus: () => setHot(group.key),
              onBlur: () => setHot(null),
            }
            return (
              <li key={group.key}>
                <Tooltip content={<GroupTip group={group} />} side="top">
                  {href ? (
                    <Link href={href} className={rowClass} {...handlers}>
                      {row}
                    </Link>
                  ) : (
                    <button type="button" className={cn(rowClass, 'w-full text-left')} {...handlers}>
                      {row}
                    </button>
                  )}
                </Tooltip>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** The dark tooltip body (Compliance Cards): title + value, a rule, then dot lines. */
function GroupTip({ group }: { group: ElementGroup }) {
  return (
    <div className="w-60 space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{group.short === group.label ? group.label : group.short}</span>
        <span className="text-sm tabular-nums">{formatPointsOf(group.earned, group.available)}</span>
      </div>
      <div className="h-px bg-tooltip-line" />
      {group.parts.length > 1 ? (
        <ul className="space-y-1.5 text-xs">
          {group.parts.map((part) => (
            <li key={part.key} className="flex items-center gap-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', part.colour)} aria-hidden />
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
        {group.bonusAvailable > 0 ? (
          <>
            <dt className="text-tooltip-muted">Bonus</dt>
            <dd className="text-right tabular-nums">{formatPointsOf(group.bonusEarned, group.bonusAvailable)}</dd>
          </>
        ) : null}
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
