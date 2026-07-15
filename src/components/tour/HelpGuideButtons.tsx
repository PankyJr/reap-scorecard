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
    <div className="rounded-2xl border border-[#063b3f]/15 bg-[#063b3f]/[0.03] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#063b3f]/10 text-[#063b3f]">
          <Compass className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Interactive guides</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Step-by-step walkthroughs that highlight exactly where to click. Action steps require you
            to interact with the real UI.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {GUIDE_BUTTONS.map((item) => (
              <button
                key={item.guideId}
                type="button"
                onClick={() => openGuide(item.guideId, 0)}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-[#063b3f]/25 hover:bg-[#063b3f]/[0.04] hover:text-[#063b3f]"
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
