'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { CheckCircle2, Circle, X } from 'lucide-react'
import { MiniBar } from '@/components/ui/MiniBar'
import { CARD_FRAME, SectionTitle } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { checklistDismissed, reportOpened, setChecklistDismissed, subscribeHelpStorage } from '@/components/help/help-storage'

export type GettingStartedItem = { key: string; label: string; done: boolean; href: string }

/**
 * Getting started (Home): five steps from a new account to a finished report.
 * Each item ticks itself from data Home already loaded; "Download the report"
 * ticks when a report is opened in this browser (no download is recorded in
 * the database). Hidden once everything is done, or when dismissed.
 */
export function GettingStartedCard({ items }: { items: GettingStartedItem[] }) {
  const dismissed = useSyncExternalStore(subscribeHelpStorage, checklistDismissed, () => false)
  const opened = useSyncExternalStore(subscribeHelpStorage, reportOpened, () => false)
  const resolved = items.map((item) => (item.key === 'report' ? { ...item, done: item.done || opened } : item))
  const done = resolved.filter((item) => item.done).length
  if (dismissed || done === resolved.length) return null
  const nextKey = resolved.find((item) => !item.done)?.key

  return (
    <section aria-labelledby="getting-started-title" data-help="getting-started" className={cn(CARD_FRAME, 'p-5 sm:p-6')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <SectionTitle id="getting-started-title">Getting started</SectionTitle>
          <p className="mt-0.5 text-meta text-label">From a new account to a finished report.</p>
        </div>
        <span className="shrink-0 text-meta tabular-nums text-label">
          {done} of {resolved.length} done
        </span>
        <button
          type="button"
          onClick={() => setChecklistDismissed(true)}
          aria-label="Hide the getting started checklist"
          title="Hide (you can show it again from the Help centre)"
          className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-label transition-colors duration-150 hover:bg-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 sm:h-8 sm:w-8"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <MiniBar value={done} max={resolved.length} width="w-full" className="mt-3 block" />
      <ol className="mt-4 grid gap-2 sm:grid-cols-5">
        {resolved.map((item, i) => {
          const Icon = item.done ? CheckCircle2 : Circle
          const isNext = item.key === nextKey
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                data-checklist-item={item.key}
                data-done={item.done ? 'true' : 'false'}
                className={cn(
                  'flex h-full min-h-[52px] items-start gap-2.5 rounded-control px-3 py-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25',
                  isNext ? 'bg-wash hover:bg-segment' : 'hover:bg-wash',
                )}
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', item.done ? 'text-teal' : 'text-icon')} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-meta tabular-nums text-label">Step {i + 1}</span>
                  <span className={cn('block text-body', item.done ? 'text-label' : 'font-medium text-ink')}>{item.label}</span>
                  <span className="sr-only">{item.done ? ' (done)' : ' (to do)'}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
