'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, Plus } from 'lucide-react'
import { CardLabel } from '@/components/ui/Card'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'

export type NeedItem = {
  key: string
  title: string
  /** Grey line under the title: which company, which area. */
  sub: string
  href: string
}

const VISIBLE = 3

/**
 * Keel "PENDING APPROVALS · 3 AWAITING YOU": small inner cards, each with a
 * title, a grey sub-line and a quiet Review button. Compliance Cards: ONE
 * full-width primary button at the bottom ("See all {n}").
 *
 * Every item comes from data the dashboard already loads (the next step, the
 * companies that need attention, and the engine's readiness reasons). "See
 * all" opens the rest here; there is no separate page for them.
 */
export function NeedsYouCard({ items, className }: { items: NeedItem[]; className?: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, VISIBLE)
  return (
    <section
      aria-labelledby="next-heading"
      data-tour="setup-checklist"
      className={cn('flex min-w-0 flex-col rounded-card border border-line bg-surface p-5 shadow-card sm:p-6', className)}
    >
      <CardLabel as="h2" id="next-heading">
        Needs you · {items.length} {items.length === 1 ? 'item' : 'items'}
      </CardLabel>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 py-6">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
          <p className="text-base font-semibold text-ink">Nothing is waiting on you</p>
          <p className="text-sm text-label">Every scorecard is up to date. Start a new one when you are ready.</p>
          <Link href="/start" className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-1' })}>
            <Plus className="h-4 w-4" aria-hidden /> Start new
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {shown.map((item) => (
              <li key={item.key} className="flex items-center gap-3 rounded-control border border-line p-3.5 sm:p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink" title={item.title}>
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-label" title={item.sub}>
                    {item.sub}
                  </p>
                </div>
                <Link href={item.href} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'shrink-0' })}>
                  Review<span className="sr-only">: {item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-4">
            {items.length > VISIBLE ? (
              <button
                type="button"
                onClick={() => setAll((v) => !v)}
                aria-expanded={all}
                className={buttonStyles({ variant: 'primary', className: 'w-full' })}
              >
                {all ? 'Show fewer' : `See all ${items.length}`}
                <ChevronRight className={cn('h-4 w-4 transition-transform duration-150', all && '-rotate-90')} aria-hidden />
              </button>
            ) : (
              <Link href={items[0].href} className={buttonStyles({ variant: 'primary', className: 'w-full' })}>
                Start with the first
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  )
}
