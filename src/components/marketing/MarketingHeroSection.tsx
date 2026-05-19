'use client'

import Link from 'next/link'
import { cn } from '@/components/marketing/cn'
import {
  marketingHeroChromePtClass,
  marketingHeroPullUpClass,
  marketingSectionContainerClass,
} from '@/components/marketing/marketingLayout'

const EYEBROW = 'B-BBEE advisory • REAP Scorecard • Procurement reporting'

const HEADLINE = 'Turn your procurement data into a clear B-BBEE scorecard'

const SUBCOPY =
  'REAP Solutions helps South African businesses move from supplier data and TMPS calculations to measurable procurement scores, evidence-ready reporting, and client-ready PDF reports.'

export default function MarketingHeroSection() {
  return (
    <section
      aria-label="Hero"
      className={cn(
        'relative isolate flex h-[100svh] w-full max-h-[100svh] flex-col overflow-hidden bg-black',
        marketingHeroPullUpClass,
        marketingHeroChromePtClass,
      )}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        tabIndex={-1}
      >
        <source src="/marketing/assets/hero1.mp4" type="video/mp4" />
      </video>

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/75"
        aria-hidden
      />

      <div
        className={cn(
          marketingSectionContainerClass,
          'relative z-10 flex h-full min-h-0 flex-1 flex-col',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col justify-end pb-4 sm:pb-6 lg:pb-8">
          <div className="max-w-3xl text-left lg:max-w-4xl">
            <p className="text-xs font-normal tracking-wide text-white/65 sm:text-[13px]">{EYEBROW}</p>

            <h1 className="mt-4 text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:mt-5 sm:text-5xl sm:leading-[1.08] md:text-6xl md:leading-[1.06] lg:text-[3.5rem] lg:leading-[1.05] xl:text-[3.75rem]">
              {HEADLINE}
            </h1>

            <p className="mt-5 max-w-2xl text-base font-normal leading-relaxed text-white/75 sm:mt-6 sm:text-lg sm:leading-relaxed lg:max-w-xl">
              {SUBCOPY}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center border border-white/90 bg-black/50 px-6 text-sm font-medium text-white transition hover:bg-black/70 sm:h-12 sm:px-7"
              >
                Book a consultation
              </Link>
              <Link
                href="/scorecard"
                className="inline-flex h-11 items-center justify-center border border-white/10 bg-white/15 px-6 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20 sm:h-12 sm:px-7"
              >
                Explore REAP Scorecard
              </Link>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/15 pb-4 pt-4 sm:pb-5 sm:pt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.38em] text-white/45 sm:text-[11px] sm:tracking-[0.42em]">
            SCROLL TO EXPLORE
          </p>
        </div>
      </div>
    </section>
  )
}
