import Link from 'next/link'
import { CARD_FRAME, CARD_INTERACTIVE } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Num } from '@/components/ui/Num'
import { cn } from '@/components/ui/cn'
import { formatCeiling, formatPointsOf } from '@/components/ui/format'
import type { ScorecardView } from './scorecard-view'

/**
 * The five areas as tiles (KPI Tile, konsstepnov, rebuilt; stats-05
 * proportions). Each: the area name, "15.98 of 25" with the figure in Number
 * Flow, a 4px bar in the area's colour, and "Below minimum" when the engine
 * says the area failed its priority sub-minimum. The whole tile opens the
 * area. Three text sizes: 13 (name, "of"), 22 (figure), 12 (chip).
 */
export function AreaTiles({ view, hrefBase, className }: { view: ScorecardView; hrefBase: string; className?: string }) {
  return (
    <ul className={cn('grid grid-cols-1 gap-6 min-[360px]:grid-cols-2 lg:grid-cols-5', className)} aria-label="Points by area">
      {view.groups.map((group, index) => {
        const share = group.available > 0 ? Math.min(1, group.earned / group.available) : 0
        const last = index === view.groups.length - 1
        return (
          <li key={group.key} className={cn('min-w-0', last && view.groups.length % 2 === 1 && 'min-[360px]:col-span-2 lg:col-span-1')}>
            <Link
              href={`${hrefBase}/${group.slug}`}
              className={cn('flex h-full flex-col p-6', CARD_FRAME, CARD_INTERACTIVE)}
              aria-label={`${group.label}: ${formatPointsOf(group.earned, group.available)}${group.belowSubminimum ? ', below its priority sub-minimum' : ''}`}
            >
              <span className="line-clamp-2 min-h-9 text-meta text-label" title={group.label}>
                {group.label}
              </span>
              <span className="mt-3 flex h-10 items-center gap-1.5 whitespace-nowrap">
                <Num value={group.earned} className="text-heading font-semibold tracking-tight text-ink" />
                <span className="text-meta text-label">of {formatCeiling(group.available)}</span>
              </span>
              <span className="mt-4 block h-1 overflow-hidden rounded-full bg-track" aria-hidden>
                <span className={cn('block h-full rounded-full', group.colour)} style={{ width: `${share * 100}%` }} />
              </span>
              <span className="mt-3 flex min-h-[22px] items-center">
                {group.belowSubminimum ? <Chip tone="attention">Below minimum</Chip> : null}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
