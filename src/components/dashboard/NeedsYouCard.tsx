'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, Plus } from 'lucide-react'
import { CARD_FRAME, CardLabel } from '@/components/ui/Card'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'

export type NeedItem = {
  key: string
  title: string
  /** Grey line under the title: which company, which area. */
  sub: string
  href: string
}

const VISIBLE = 4

/**
 * "Needs you": clean rows, no inner boxes, no repeated buttons. Each row is a
 * link: title (up to two lines), a grey sub-line, a chevron; hairlines
 * between. One primary Texture button at the bottom.
 *
 * The items are data the dashboard already loads (the next step, companies
 * needing attention, the engine's readiness reasons in plain English).
 */
export function NeedsYouCard({ items, className }: { items: NeedItem[]; className?: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, VISIBLE)
  return (
    <section aria-labelledby="next-heading" data-tour="setup-checklist" className={cn('flex min-w-0 flex-col p-6', CARD_FRAME, className)}>
      <div className="flex min-h-9 items-center">
        <CardLabel as="h2" id="next-heading">
          Needs you · {items.length} {items.length === 1 ? 'item' : 'items'}
        </CardLabel>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-2 pt-4">
          <CheckCircle2 className="h-[18px] w-[18px] text-success" aria-hidden />
          <p className="text-body font-semibold text-ink">Nothing is waiting on you</p>
          <p className="text-meta text-label">Every scorecard is up to date.</p>
          <Link href="/start" className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-2' })}>
            <Plus aria-hidden /> Start new
          </Link>
        </div>
      ) : (
        <>
          <ul className="-mx-6 mt-4 flex-1 border-t border-line">
            {shown.map((item) => (
              <li key={item.key} className="border-b border-line last:border-b-0">
                <Link
                  href={item.href}
                  // Fixed height for a two-line title + sub-line, so rows never jump and the skeleton matches.
                  className="group flex h-[84px] items-center gap-3 px-6 py-3 transition-colors duration-150 hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-body font-medium text-ink">{item.title}</span>
                    <span className="mt-0.5 block truncate text-meta text-label" title={item.sub}>
                      {item.sub}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {items.length > VISIBLE ? (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              aria-expanded={all}
              className={buttonStyles({ variant: 'primary', className: 'mt-4 w-full' })}
            >
              {all ? 'Show fewer' : `See all ${items.length}`}
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
