'use client'

import { Compass } from 'lucide-react'
import { useTour } from '@/components/tour/TourProvider'

export function TourHelpButton({ className }: { className?: string }) {
  const { openTour, isOpen } = useTour()

  return (
    <button
      type="button"
      onClick={() => openTour()}
      disabled={isOpen}
      className={[
        'group inline-flex h-9 items-center gap-2 rounded-full border border-line/90 bg-surface px-3.5 text-sm font-medium text-ink shadow-sm transition',
        'hover:border-brand/25 hover:bg-brand/[0.04] hover:text-brand',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className ?? '',
      ].join(' ')}
      data-tour="help-button"
      aria-label="Start platform guide"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand transition group-hover:bg-brand/15">
        <Compass className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="hidden sm:inline">Need help?</span>
    </button>
  )
}
