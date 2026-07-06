'use client'

import Link from 'next/link'
import { cn } from '@/components/marketing/cn'
import { REAP_TAGLINE } from '@/components/marketing/marketingBrandData'
import {
  marketingHeroChromePtClass,
  marketingHeroPullUpClass,
  marketingSectionContainerClass,
} from '@/components/marketing/marketingLayout'

const EYEBROW = REAP_TAGLINE

const HEADLINE = 'B-BBEE expertise that turns transformation into commercial advantage'

const SUBCOPY =
  'We advise South African organisations on strategy, ownership, ESD, and skills—supported by REAP Scorecard for procurement workflows, TMPS, measurable points, and client-ready PDF reporting.'

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

            <div className="mt-8 flex flex-row items-stretch gap-2 sm:mt-9 sm:gap-3">
              <Link
                href="/contact"
                className="inline-flex min-h-11 flex-1 items-center justify-center border border-white/90 bg-black/50 px-2.5 text-center text-xs font-medium leading-tight text-white transition hover:bg-black/70 sm:min-h-12 sm:px-6 sm:text-sm"
              >
                Book a consultation
              </Link>
              <Link
                href="/scorecard"
                className="inline-flex min-h-11 flex-1 items-center justify-center border border-white/10 bg-white/15 px-2.5 text-center text-xs font-medium leading-tight text-white backdrop-blur-sm transition hover:bg-white/20 sm:min-h-12 sm:px-6 sm:text-sm"
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
