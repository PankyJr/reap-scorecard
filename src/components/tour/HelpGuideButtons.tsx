'use client'

import { buttonStyles } from '@/components/ui/buttonStyles'
import { Compass } from 'lucide-react'
import { useTour } from '@/components/tour/TourProvider'

const GUIDE_BUTTONS = [
  { guideId: 'first-time-setup', label: 'First-time setup guide' },
  { guideId: 'full-platform', label: 'Full platform tour' },
  { guideId: 'companies', label: 'Companies guide' },
  { guideId: 'procurement', label: 'Procurement scorecard guide' },
  { guideId: 'workbook-upload', label: 'Workbook upload guide' },
  { guideId: 'export-pdf', label: 'Export & PDF guide' },
] as const

export function HelpGuideButtons() {
  const { openGuide } = useTour()

  return (
    <div className="rounded-card border border-card bg-brand-soft/40 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-soft text-teal">
          <Compass className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-ink">Interactive guides</p>
          <p className="mt-1 text-meta leading-relaxed text-label">
            Step-by-step walkthroughs that highlight exactly where to click. Action steps require you
            to interact with the real UI.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {GUIDE_BUTTONS.map((item) => (
              <button
                key={item.guideId}
                type="button"
                onClick={() => openGuide(item.guideId, 0)}
                className={buttonStyles({ variant: 'secondary', size: 'sm' })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
