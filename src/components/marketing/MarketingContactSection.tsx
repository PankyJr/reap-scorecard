import { Suspense } from 'react'
import { cn } from '@/components/marketing/cn'
import { MarketingContactForm } from '@/components/marketing/MarketingContactForm'
import MarketingContactDetails from '@/components/marketing/MarketingContactDetails'
import { marketingBrandTextClass, marketingSectionContainerClass } from '@/components/marketing/marketingLayout'

function ContactFormFallback() {
  return (
    <div className="animate-pulse border border-slate-200 bg-white p-8">
      <div className="h-6 w-48 bg-slate-200" />
      <div className="mt-6 space-y-4">
        <div className="h-10 bg-slate-100" />
        <div className="h-10 bg-slate-100" />
        <div className="h-32 bg-slate-100" />
      </div>
    </div>
  )
}

export default function MarketingContactSection() {
  return (
    <section className="border-t border-slate-200 bg-gradient-to-b from-[#05363A]/6 via-white to-white">
      <div className={marketingSectionContainerClass}>
        <div className="py-14 sm:py-16 lg:py-20">
          <div className="max-w-2xl border-l-4 border-[#05363A] pl-6">
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.2em]',
                marketingBrandTextClass,
              )}
            >
              Get in touch
            </p>
            <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[32px]">
              Tell us what you&apos;re working on
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Share a bit of context—we&apos;ll reply with clear next steps, whether you need
              advisory, training, or scorecard support.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <Suspense fallback={<ContactFormFallback />}>
                <MarketingContactForm />
              </Suspense>
            </div>
            <div className="lg:col-span-5">
              <MarketingContactDetails />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
