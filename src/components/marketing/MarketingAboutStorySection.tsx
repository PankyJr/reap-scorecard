import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import {
  ABOUT_CORE_SERVICES,
  ABOUT_EDUCATION_PROGRAMS,
  ABOUT_INTRO_PARAGRAPHS,
  REAP_TAGLINE,
} from '@/components/marketing/marketingAboutData'
import {
  marketingBrandBgClass,
  marketingBrandBgHoverClass,
  marketingBrandTextClass,
  marketingSectionContainerClass,
} from '@/components/marketing/marketingLayout'
import { MarketingYearsStat } from '@/components/marketing/MarketingYearsStat'

const STORY_INDEX = ['01', '02', '03'] as const

export default function MarketingAboutStorySection() {
  return (
    <section className="w-full bg-white">
      <div className={marketingSectionContainerClass}>
        <div className="py-14 sm:py-16 lg:py-20">
          <div className="grid w-full gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
            <div className="lg:col-span-8">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${marketingBrandTextClass}`}>
                Who we are
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
                Specialist B-BBEE advisory for{' '}
                <span className={marketingBrandTextClass}>South African organisations</span>
              </h2>
              <p className="mt-4 text-sm font-medium text-slate-500 sm:text-base">{REAP_TAGLINE}</p>
            </div>

            <div className="lg:col-span-4 lg:pb-1">
              <MarketingYearsStat label="Years of combined expertise across law, finance, tax, HR, training, and sales" />
            </div>
          </div>

          <div className="mt-10 grid w-full gap-8 sm:mt-12 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-slate-200">
            {ABOUT_INTRO_PARAGRAPHS.map((paragraph, index) => (
              <div
                key={paragraph.slice(0, 32)}
                className={cn(
                  'relative lg:px-8',
                  index === 0 && 'lg:pl-0',
                  index === ABOUT_INTRO_PARAGRAPHS.length - 1 && 'lg:pr-0',
                )}
              >
                <span
                  className="pointer-events-none select-none text-[3.5rem] font-semibold leading-none text-slate-100 sm:text-[4rem]"
                  aria-hidden
                >
                  {STORY_INDEX[index]}
                </span>
                <p className="relative -mt-6 text-base leading-relaxed text-slate-600 sm:-mt-8 sm:text-[17px]">
                  {paragraph}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 overflow-hidden sm:mt-14 lg:grid lg:grid-cols-2">
            <Link
              href="/solutions"
              className={cn(
                'group flex min-h-[280px] flex-col p-8 text-white transition-colors sm:p-10',
                marketingBrandBgClass,
                marketingBrandBgHoverClass,
                'border-b border-white/15 lg:border-b-0 lg:border-r lg:border-white/15',
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">What we do</p>
              <ul className="mt-5 grid gap-2 text-sm leading-relaxed text-white/85 sm:grid-cols-2 sm:gap-x-8">
                {ABOUT_CORE_SERVICES.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-white/40" aria-hidden>
                      —
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                Explore solutions
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>

            <Link
              href="/training"
              className={cn(
                'group flex min-h-[280px] flex-col p-8 text-white transition-colors sm:p-10',
                marketingBrandBgClass,
                marketingBrandBgHoverClass,
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Training</p>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-white/85">
                {ABOUT_EDUCATION_PROGRAMS.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-white/40" aria-hidden>
                      —
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-white/65">
                Programmes that build lasting capability inside your organisation.
              </p>
              <span className="mt-auto pt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                View programmes
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
