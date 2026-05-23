import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import { HOME_INTRO, HOME_PILLARS } from '@/components/marketing/marketingHomeData'
import {
  marketingBrandBgHoverClass,
  marketingBrandBgClass,
  marketingBrandTextClass,
  marketingSectionContainerClass,
  marketingSectionDividerClass,
} from '@/components/marketing/marketingLayout'

export default function MarketingHomeIntroSection() {
  return (
    <section className="bg-white">
      <div className={marketingSectionContainerClass}>
        <div className="py-14 sm:py-16 lg:py-20">
          <div className="w-full border-l-4 border-[#05363A] pl-6 sm:pl-8">
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.2em]',
                marketingBrandTextClass,
              )}
            >
              {HOME_INTRO.eyebrow}
            </p>
            <h2 className="mt-3 text-[28px] font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-[32px] lg:text-[36px]">
              {HOME_INTRO.headline}
              <span className={cn('mt-1 block', marketingBrandTextClass)}>
                {HOME_INTRO.headlineAccent}
              </span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              {HOME_INTRO.body}
            </p>
          </div>

          <div className="mt-12 overflow-hidden lg:grid lg:grid-cols-3">
            {HOME_PILLARS.map((pillar, i) => (
              <Link
                key={pillar.title}
                href={pillar.href}
                className={cn(
                  'group flex flex-col p-8 text-white transition-colors sm:p-9',
                  marketingBrandBgClass,
                  marketingBrandBgHoverClass,
                  i < HOME_PILLARS.length - 1 && 'border-b border-white/15 lg:border-b-0',
                  i > 0 && 'lg:border-l lg:border-white/15',
                )}
              >
                <h3 className="text-lg font-semibold tracking-tight text-white">{pillar.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/75">
                  {pillar.description}
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white transition-colors group-hover:text-white/90">
                  {pillar.cta}
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
        <div className={marketingSectionDividerClass} aria-hidden />
      </div>
    </section>
  )
}
