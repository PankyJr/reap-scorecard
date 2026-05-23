import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import { ServicePlusIcon } from '@/components/marketing/ServicePlusIcon'
import {
  getMarketingServicePath,
  MARKETING_SERVICES,
} from '@/components/marketing/marketingServicesData'
import {
  marketingBrandBgHoverClass,
  marketingBrandBorderClass,
  marketingBrandTextClass,
  marketingSectionContainerClass,
} from '@/components/marketing/marketingLayout'

export default function MarketingServicesSection() {
  return (
    <section className="relative bg-white">
      <div className={marketingSectionContainerClass}>
        <div className="pb-20 pt-14 sm:pt-16">
          <div className="flex flex-col gap-8 border-l-4 border-[#05363A] pl-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-4xl">
              <p
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.2em]',
                  marketingBrandTextClass,
                )}
              >
                Advisory services
              </p>
              <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0B0F0F] md:text-[40px]">
                Unlock growth, streamline operations, and{' '}
                <span className={marketingBrandTextClass}>achieve measurable results</span>
              </h2>
            </div>
            <Link
              href="/contact"
              className={cn(
                'inline-flex h-11 shrink-0 items-center justify-center self-start border px-6 text-sm font-medium text-white transition lg:mb-1',
                marketingBrandBorderClass,
                'bg-[#05363A]',
                marketingBrandBgHoverClass,
              )}
            >
              Get in touch
            </Link>
          </div>

          <div className="mt-12 overflow-hidden border border-slate-200">
            <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x">
              {MARKETING_SERVICES.map((item) => (
                <Link
                  key={item.slug}
                  href={getMarketingServicePath(item.slug)}
                  className="group flex h-full min-h-[220px] flex-col p-8 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 sm:min-h-[240px] sm:p-10 lg:p-10 xl:p-12"
                >
                  <ServicePlusIcon className="mb-8" />

                  <h3 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-xl">
                    {item.title}
                  </h3>

                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                    {item.description}
                  </p>

                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-slate-900">
                    View service
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-0.5"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
