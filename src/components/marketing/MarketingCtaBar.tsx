'use client'

import Link from 'next/link'
import { MarketingButton } from '@/components/marketing/ui/button'

interface MarketingCtaBarProps {
  text?: string
  highlight?: string
  primaryText?: string
  primaryHref?: string
  secondaryText?: string
  secondaryHref?: string
}

export default function MarketingCtaBar({
  text = 'Learn more about our solutions and how we can support your',
  highlight = 'transformation journey.',
  primaryText = 'Schedule a call with us',
  primaryHref = '/contact',
  secondaryText = 'Become a Client',
  secondaryHref = '/contact',
}: MarketingCtaBarProps) {
  return (
    <section className="w-full bg-[#05363A]">
      <div className="mx-auto w-full px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-lg font-medium leading-relaxed text-white sm:text-xl">
            {text} <span className="text-emerald-300">{highlight}</span>
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <MarketingButton
              asChild
              className="h-11 rounded-none bg-white px-6 text-sm font-semibold text-slate-900 hover:bg-slate-50 border-0"
            >
              <Link href={secondaryHref}>{secondaryText}</Link>
            </MarketingButton>

            <MarketingButton
              asChild
              variant="outline"
              className="h-11 rounded-none px-6 text-sm font-semibold border-2 border-white/60 bg-transparent text-white hover:bg-white/10 hover:border-white/80"
            >
              <Link href={primaryHref}>{primaryText}</Link>
            </MarketingButton>
          </div>
        </div>
      </div>
    </section>
  )
}
