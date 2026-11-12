'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Halal Lab segmented control: grey #F2F2F4 track, radius 10, the selected
 * option a white raised pill. Options are links (filters in the URL) or
 * buttons (local state).
 */
export type SegmentOption = { value: string; label: ReactNode; href?: string; count?: number }

export function Segmented({ options, value, onChange, label, className }: { options: SegmentOption[]; value: string; onChange?: (value: string) => void; label: string; className?: string }) {
  return (
    // Links (filters in the URL) sit in a nav; buttons switch local tabs.
    <div role={options.some((o) => o.href) ? 'navigation' : 'tablist'} aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-control bg-segment p-0.5', className)}>
      {options.map((option) => {
        const selected = option.value === value
        const cls = cn(
          'inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 text-body font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 sm:h-8',
          selected ? 'bg-surface text-ink shadow-pill' : 'text-label hover:text-ink',
        )
        const inner = (
          <>
            {option.label}
            {option.count != null ? <span className={cn('tabular-nums', selected ? 'text-label' : 'text-subtle')}>{option.count}</span> : null}
          </>
        )
        return option.href ? (
          <Link key={option.value} href={option.href} aria-current={selected ? 'page' : undefined} className={cls} scroll={false}>
            {inner}
          </Link>
        ) : (
          <button key={option.value} type="button" role="tab" aria-selected={selected} onClick={() => onChange?.(option.value)} className={cls}>
            {inner}
          </button>
        )
      })}
    </div>
  )
}
