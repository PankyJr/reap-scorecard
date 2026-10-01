'use client'

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
    <div className="rounded-2xl border border-brand/15 bg-brand/[0.03] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Compass className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Interactive guides</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Step-by-step walkthroughs that highlight exactly where to click. Action steps require you
            to interact with the real UI.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {GUIDE_BUTTONS.map((item) => (
              <button
                key={item.guideId}
                type="button"
                onClick={() => openGuide(item.guideId, 0)}
                className="inline-flex items-center rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:border-brand/25 hover:bg-brand/[0.04] hover:text-brand"
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
