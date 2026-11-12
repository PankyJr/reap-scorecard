import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { CARD_FRAME, CARD_INTERACTIVE } from '@/components/ui/Card'
import { Num } from '@/components/ui/Num'
import { cn } from '@/components/ui/cn'
import { formatCeiling, formatPointsOf } from '@/components/ui/format'
import { AreaRing } from './Rings'
import { areaState, type ScorecardView } from './scorecard-view'

/**
 * The five areas as tiles (Brownee), equal height in a row:
 *
 *   (ring+icon)                 64%
 *   Ownership
 *   15.98 of 25
 *   [In progress]
 *   ─────────────────────────────
 *   3 figures missing
 *
 * The whole tile opens the area. The footer line is always there.
 */
export function AreaTiles({ view, hrefBase, className }: { view: ScorecardView; hrefBase: string; className?: string }) {
  return (
    <ul className={cn('grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-5', className)} aria-label="Points by area">
      {view.groups.map((group, index) => {
        const state = areaState(group)
        const pct = group.available > 0 ? Math.round((group.earned / group.available) * 100) : 0
        const last = index === view.groups.length - 1
        return (
          <li key={group.key} className={cn('min-w-0', last && view.groups.length % 2 === 1 && 'min-[360px]:col-span-2 lg:col-span-1')}>
            <Link
              href={`${hrefBase}/${group.slug}`}
              aria-label={`${group.label}: ${formatPointsOf(group.earned, group.available)}, ${state.label}, ${state.footer}`}
              className={cn('flex h-full flex-col p-5', CARD_FRAME, CARD_INTERACTIVE)}
            >
              <span className="flex items-start justify-between">
                <AreaRing group={group} />
                <span className="text-meta font-medium tabular-nums text-label">{pct}%</span>
              </span>
              <span className="mt-4 truncate text-body font-medium text-ink" title={group.label}>
                {group.short}
              </span>
              <span className="mt-1 flex items-baseline gap-1 whitespace-nowrap">
                <Num value={group.earned} className="text-section font-semibold text-ink" />
                <span className="text-meta text-label">of {formatCeiling(group.available)}</span>
              </span>
              <span className="mt-3 flex">
                <Chip tone={state.tone}>{state.label}</Chip>
              </span>
              {/* Pushes the footer to the bottom so every tile in the row lines up. */}
              <span className="min-h-4 flex-1" aria-hidden />
              <span
                className={cn(
                  'border-t border-line pt-3 text-meta',
                  state.footerTone === 'attention' ? 'text-attention' : state.footerTone === 'success' ? 'text-success' : 'text-label',
                )}
              >
                {state.footer}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
