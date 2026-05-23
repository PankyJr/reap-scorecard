import { cn } from '@/components/marketing/cn'
import { SCORECARD_AUDIENCE, SCORECARD_CAPABILITIES } from '@/components/marketing/marketingScorecardPageData'
import {
  marketingBrandTextClass,
  marketingSectionContainerClass,
} from '@/components/marketing/marketingLayout'

export default function MarketingScorecardCapabilities() {
  return (
    <>
      <section id="capabilities" className="scroll-mt-28 bg-white">
        <div className={marketingSectionContainerClass}>
          <div className="py-16 sm:py-20">
            <div className="max-w-2xl border-l-4 border-[#05363A] pl-6">
              <p
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.2em]',
                  marketingBrandTextClass,
                )}
              >
                Built for practitioners
              </p>
              <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[32px]">
                Everything you need to run assessments with confidence
              </h2>
            </div>

            <div className="mt-12 overflow-hidden border border-slate-200 md:grid md:grid-cols-3 md:divide-x md:divide-slate-200">
              {SCORECARD_CAPABILITIES.map(({ title, description, icon: Icon }) => (
                <div key={title} className="border-b border-slate-200 p-8 last:border-b-0 md:border-b-0 md:p-10">
                  <span className="inline-flex h-9 w-9 items-center justify-center border border-[#05363A] bg-[#05363A]/5 text-[#05363A]">
                    <Icon className="h-4 w-4" strokeWidth={1.25} aria-hidden />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className={marketingSectionContainerClass}>
          <div className="grid gap-10 py-14 sm:grid-cols-2 sm:py-16 lg:gap-16">
            {SCORECARD_AUDIENCE.map(({ title, description, icon: Icon }) => (
              <div key={title} className="flex gap-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-slate-900 bg-white text-slate-900">
                  <Icon className="h-5 w-5" strokeWidth={1.25} aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
