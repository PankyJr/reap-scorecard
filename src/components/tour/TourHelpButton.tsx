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
        'group inline-flex h-9 items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition',
        'hover:border-[#063b3f]/25 hover:bg-[#063b3f]/[0.04] hover:text-[#063b3f]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#063b3f]/30 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className ?? '',
      ].join(' ')}
      data-tour="help-button"
      aria-label="Start platform guide"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#063b3f]/10 text-[#063b3f] transition group-hover:bg-[#063b3f]/15">
        <Compass className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="hidden sm:inline">Need help?</span>
    </button>
  )
}
