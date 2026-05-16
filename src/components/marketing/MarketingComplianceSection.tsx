'use client'

import Link from 'next/link'
import { MarketingButton } from '@/components/marketing/ui/button'
import { ArrowRight } from 'lucide-react'

type ComplianceItem = {
  region: string
  title: string
}

interface MarketingComplianceSectionProps {
  kicker?: string
  titleAccent?: string
  titleMain?: string
  description?: string
  ctaText?: string
  ctaHref?: string
  items?: ComplianceItem[]
}

const defaultItems: ComplianceItem[] = [
  {
    region: 'SOUTH AFRICA',
    title:
      'B-BBEE Strategy, Ownership Advisory, ESD and Skills Planning support aligned to measurable outcomes.',
  },
  {
    region: 'NATIONAL',
    title:
      'Training & coaching programs to help leadership and teams understand the Codes and implement transformation correctly.',
  },
  {
    region: 'ENTERPRISE',
    title:
      'Practical implementation guidance and ongoing advisory support for sustained compliance confidence.',
  },
]

export default function MarketingComplianceSection({
  kicker = 'COMPLIANCE & GOVERNANCE',
  titleAccent = 'Compliance',
  titleMain = 'Focused',
  description = 'REAP Solutions supports organisations with practical transformation advisory aligned to governance, evidence readiness, and sustainable outcomes.',
  ctaText = 'About us',
  ctaHref = '/about',
  items = defaultItems,
}: MarketingComplianceSectionProps) {
  return (
    <section className="w-full bg-white">
      <div className="mx-auto w-full px-6 py-14 sm:py-16 sm:px-10 lg:px-16">
        <div className="border border-slate-200 bg-white p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium tracking-[0.18em] text-slate-500">{kicker}</p>

              <h2 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                <span className="text-emerald-600">{titleAccent}</span> <span className="text-slate-900">-</span>{' '}
                <span className="text-slate-900">{titleMain}</span>
              </h2>
            </div>

            <div className="lg:col-span-5 lg:pt-10">
              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>

              <div className="mt-6">
                <MarketingButton asChild variant="outline" className="h-11 rounded-none px-6 text-sm font-semibold">
                  <Link href={ctaHref} className="flex items-center">
                    {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </MarketingButton>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="space-y-8 w-full">
              {items.map((item, idx) => (
                <div key={`${item.region}-${idx}`}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold tracking-[0.16em] text-slate-500">{item.region}</span>
                  </div>

                  <h3 className="mt-3 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{item.title}</h3>

                  {idx < items.length - 1 && <div className="mt-6 h-px w-full bg-slate-200" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
