import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CARD_FRAME, CARD_INTERACTIVE } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Num } from '@/components/ui/Num'
import { cn } from '@/components/ui/cn'
import { formatCeiling, formatPointsOf } from '@/components/ui/format'
import type { ScorecardView } from './scorecard-view'

/**
 * The five areas as tiles (KPI Tile, rebuilt; stats-05 proportions).
 *
 *   name            two lines reserved, so the figures line up across all five
 *   figures         "15.98 of 25" (Number Flow) and a 4px bar
 *   footer          "On track" / "Below minimum", only where the engine
 *                   evaluated a priority sub-minimum
 *   not started     when the engine says the area has no figures at all:
 *                   "Not started" in grey and "Add figures →" instead
 *
 * The whole tile opens the area (a stretched link on the name). Each tile is
 * as tall as its content: no reserved empty space at the bottom.
 */
export function AreaTiles({ view, hrefBase, className }: { view: ScorecardView; hrefBase: string; className?: string }) {
  return (
    <ul className={cn('grid grid-cols-1 items-start gap-6 min-[360px]:grid-cols-2 lg:grid-cols-5', className)} aria-label="Points by area">
      {view.groups.map((group, index) => {
        const href = `${hrefBase}/${group.slug}`
        const notStarted = group.status === 'not_started'
        const share = group.available > 0 ? Math.min(1, group.earned / group.available) : 0
        const last = index === view.groups.length - 1
        return (
          <li
            key={group.key}
            className={cn('relative flex min-w-0 flex-col p-6', CARD_FRAME, CARD_INTERACTIVE, 'has-[:focus-visible]:-translate-y-px has-[:focus-visible]:border-card-hover has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-canvas', last && view.groups.length % 2 === 1 && 'min-[360px]:col-span-2 lg:col-span-1')}
          >
            <Link
              href={href}
              className="line-clamp-2 h-9 text-meta text-label after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none"
              title={group.label}
              aria-label={notStarted ? `${group.label}: not started` : `${group.label}: ${formatPointsOf(group.earned, group.available)}${group.belowSubminimum ? ', below its priority sub-minimum' : ''}`}
            >
              {group.label}
            </Link>
            {notStarted ? (
              <>
                <p className="mt-3 flex h-10 items-center text-body text-subtle">Not started</p>
                <span className="relative z-10 mt-3 inline-flex items-center gap-1 self-start text-body font-medium text-brand" aria-hidden>
                  Add figures <ArrowRight className="h-4 w-4" />
                </span>
              </>
            ) : (
              <>
                <p className="mt-3 flex h-10 items-center gap-1.5 whitespace-nowrap">
                  <Num value={group.earned} className="text-heading font-semibold tracking-tight text-ink" />
                  <span className="text-meta text-label">of {formatCeiling(group.available)}</span>
                </p>
                <span className="mt-4 block h-1 overflow-hidden rounded-full bg-track" aria-hidden>
                  <span className={cn('block h-full rounded-full', group.colour)} style={{ width: `${share * 100}%` }} />
                </span>
                {group.subminimumMet !== null ? (
                  <span className="mt-3 flex">
                    {group.subminimumMet ? <Chip tone="success">On track</Chip> : <Chip tone="attention">Below minimum</Chip>}
                  </span>
                ) : null}
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}
