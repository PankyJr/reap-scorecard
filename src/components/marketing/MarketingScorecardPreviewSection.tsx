'use client'

import { MarketingScorecardSystemPreview } from '@/components/marketing/MarketingScorecardSystemPreview'
import { SCORECARD_WORKFLOW_STEPS } from '@/components/marketing/marketingScorecardPageData'
import { cn } from '@/components/marketing/cn'
import { marketingBrandTextClass, marketingSectionContainerClass } from '@/components/marketing/marketingLayout'

export default function MarketingScorecardPreviewSection() {
  return (
    <section
      id="workflow"
      className="scroll-mt-28 border-t border-slate-200 bg-gradient-to-b from-slate-100/70 via-slate-50/40 to-white"
    >
      <div className={cn(marketingSectionContainerClass, 'pb-14 pt-14 sm:pb-16 sm:pt-16')}>
        <div className="max-w-3xl border-l-4 border-[#05363A] pl-6">
          <p
            className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.2em]',
              marketingBrandTextClass,
            )}
          >
            Product workflow
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 sm:text-3xl">
            From supplier data to{' '}
            <span className={marketingBrandTextClass}>procurement visibility</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            Walk through the same steps clients use—upload, map, confirm TMPS, preview points, and
            export reports. Interactive preview with sample data only.
          </p>
        </div>

        <ol className="mt-10 flex flex-wrap gap-2 sm:gap-3" aria-label="Scorecard workflow steps">
          {SCORECARD_WORKFLOW_STEPS.map((step, i) => (
            <li key={step.id}>
              <span className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <span
                  className={cn(
                    'font-mono text-xs font-semibold tabular-nums',
                    marketingBrandTextClass,
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-medium">{step.label}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-8 min-w-0">
          <MarketingScorecardSystemPreview hideIntro />
        </div>
      </div>
    </section>
  )
}
