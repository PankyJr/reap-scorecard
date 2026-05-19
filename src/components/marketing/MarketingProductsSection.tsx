'use client'

import { MarketingScorecardSystemPreview } from '@/components/marketing/MarketingScorecardSystemPreview'
import { cn } from '@/components/marketing/cn'
import { marketingSectionContainerClass } from '@/components/marketing/marketingLayout'

const EYEBROW = 'REAP SCORECARD WORKFLOW'

const HEADING = 'From supplier data to procurement visibility.'

const SUPPORTING_COPY =
  'Walk through the same workflow clients use to upload supplier workbooks, map procurement fields, choose the correct TMPS denominator, preview points, and prepare client-ready reports.'

export default function MarketingProductsSection() {
  return (
    <section
      aria-labelledby="scorecard-workflow-heading"
      className="border-t border-slate-200/80 bg-gradient-to-b from-slate-100/90 via-slate-50/50 to-slate-50/20"
    >
      <div className={cn(marketingSectionContainerClass, 'pb-12 pt-14 sm:pb-14 sm:pt-16')}>
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#05363A]">{EYEBROW}</p>
          <h2
            id="scorecard-workflow-heading"
            className="mt-3 text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 sm:text-3xl lg:text-[2rem]"
          >
            {HEADING}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-[1.05rem]">
            {SUPPORTING_COPY}
          </p>
          <p className="mt-3 text-xs text-slate-500">Interactive preview · sample data only</p>
        </div>

        <div className="-mx-1 mt-6 min-w-0 sm:mx-0 sm:mt-8 lg:mt-10">
          <MarketingScorecardSystemPreview hideIntro />
        </div>
      </div>
    </section>
  )
}
