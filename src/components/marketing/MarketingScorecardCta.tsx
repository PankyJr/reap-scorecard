import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import {
  marketingBrandBgClass,
  marketingBrandBgHoverClass,
  marketingBrandBorderClass,
  marketingSectionContainerClass,
} from '@/components/marketing/marketingLayout'
import { MarketingButton } from '@/components/marketing/ui/button'

export default function MarketingScorecardCta() {
  return (
    <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
      <div className={cn(marketingSectionContainerClass, 'pt-4 sm:pt-8')}>
        <div className="grid gap-10 border border-slate-200 lg:grid-cols-12 lg:gap-0">
          <div className="border-b border-slate-200 bg-[#05363A] p-8 text-white sm:p-10 lg:col-span-5 lg:border-b-0 lg:border-r lg:border-r-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              Your workspace
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              Sign in to run live assessments
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              REAP Scorecard is the authenticated experience on this site—dashboard, procurement
              assessments, saved work, and exports. No separate subdomain.
            </p>
            <Link
              href="/login"
              className={cn(
                'mt-8 inline-flex h-11 items-center justify-center border border-white bg-white px-6 text-sm font-semibold text-[#05363A] transition hover:bg-slate-100',
              )}
            >
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>

          <div className="flex flex-col justify-center p-8 sm:p-10 lg:col-span-7">
            <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Need help rolling out to your team?
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              We can align implementation with your advisory engagement—data templates, TMPS
              conventions, and reporting formats your stakeholders already expect.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <MarketingButton
                asChild
                className={cn(
                  'h-11 rounded-none border-0 px-6 text-sm font-semibold text-white',
                  marketingBrandBorderClass,
                  marketingBrandBgClass,
                  marketingBrandBgHoverClass,
                )}
              >
                <Link href="/contact?intent=scorecard">Talk to us about rollout</Link>
              </MarketingButton>
              <MarketingButton
                asChild
                variant="outline"
                className="h-11 rounded-none border-2 border-slate-300 px-6 text-sm font-semibold"
              >
                <Link href="/solutions">View advisory services</Link>
              </MarketingButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
