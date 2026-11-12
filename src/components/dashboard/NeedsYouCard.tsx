'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Info, ListTodo, Plus } from 'lucide-react'
import { CARD_FRAME, SectionTitle } from '@/components/ui/Card'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'

export type NeedKind = 'next' | 'attention' | 'todo' | 'notice'

export type NeedItem = {
  key: string
  title: string
  /** Grey line under the title: which company, which area. */
  sub: string
  href: string
  kind?: NeedKind
}

const KIND: Record<NeedKind, { icon: typeof ArrowRight; tint: string }> = {
  next: { icon: ArrowRight, tint: 'bg-progress-soft text-progress' },
  attention: { icon: AlertTriangle, tint: 'bg-attention-soft text-attention' },
  todo: { icon: ListTodo, tint: 'bg-neutral-soft text-neutral' },
  notice: { icon: Info, tint: 'bg-neutral-soft text-neutral' },
}

const VISIBLE = 4

/**
 * "Needs you" (Keel pending approvals): up to four rows, each with a 28px
 * round tinted icon by type, a title (two lines at most), a grey sub-line and
 * a chevron. "See all" is a plain teal button in the card header.
 */
export function NeedsYouCard({ items, className }: { items: NeedItem[]; className?: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, VISIBLE)
  return (
    <section aria-labelledby="next-heading" data-tour="setup-checklist" className={cn('flex min-w-0 flex-col', CARD_FRAME, className)}>
      <div className="flex min-h-9 items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <SectionTitle id="next-heading">
          Needs you <span className="font-normal text-label">{items.length}</span>
        </SectionTitle>
        {items.length > VISIBLE ? (
          <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className={buttonStyles({ variant: 'plain', size: 'sm', className: '-mr-2' })}>
            {all ? 'Show fewer' : `See all ${items.length}`}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-2 px-5 pb-6 pt-4 sm:px-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-body font-medium text-ink">Nothing is waiting on you</p>
          <p className="text-meta text-label">Every scorecard is up to date.</p>
          <Link href="/start" className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-2' })}>
            <Plus aria-hidden /> Start new
          </Link>
        </div>
      ) : (
        <ul className="mt-2 flex-1 px-2 pb-2 sm:px-3 sm:pb-3">
          {shown.map((item) => {
            const kind = KIND[item.kind ?? 'todo']
            const Icon = kind.icon
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex min-h-[60px] items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors duration-200 hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
                >
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', kind.tint)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-body font-medium text-ink">{item.title}</span>
                    <span className="mt-0.5 block truncate text-meta text-label">{item.sub}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-icon transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
