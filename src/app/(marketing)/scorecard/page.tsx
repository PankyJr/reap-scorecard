import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingButton } from '@/components/marketing/ui/button'
import { ClipboardCheck, FileDown, LineChart } from 'lucide-react'
import {
  MarketingSubpageHero,
  marketingSubpageHeroOutlineBtnClass,
  marketingSubpageHeroPrimaryBtnClass,
} from '@/components/marketing/MarketingSubpageHero'

export const metadata: Metadata = {
  title: 'REAP Scorecard | Procurement assessments & reporting',
  description:
    'Run procurement maturity assessments, track suppliers, and export evidence-ready reports — integrated with the REAP Scorecard workspace.',
}

export default function MarketingScorecardProductPage() {
  return (
    <>
      <MarketingSubpageHero
        eyebrow="REAP Scorecard"
        title="Evidence-ready procurement and scorecard performance in one workspace."
        description="Assess suppliers, monitor trends, and export professional reports — without losing the rigour your stakeholders expect."
        actions={
          <>
            <MarketingButton
              asChild
              className={`${marketingSubpageHeroPrimaryBtnClass} h-12 px-8`}
            >
              <Link href="/login">Sign in to Scorecard</Link>
            </MarketingButton>
            <MarketingButton
              asChild
              variant="outline"
              className={`${marketingSubpageHeroOutlineBtnClass} h-12 px-8`}
            >
              <Link href="/scorecard#features">Explore features</Link>
            </MarketingButton>
          </>
        }
      />

      <section id="features" className="w-full bg-white pb-20">
        <div className="mx-auto w-full px-6 sm:px-10 lg:px-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-10">Built for teams who live in the details</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="border-2 border-slate-200 p-6">
              <ClipboardCheck className="h-9 w-9 text-[#05363A] mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Structured assessments</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Guided procurement assessments with clear inputs, audit-friendly outputs, and repeatable cycles.
              </p>
            </div>
            <div className="border-2 border-slate-200 p-6">
              <LineChart className="h-9 w-9 text-[#05363A] mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Trends you can defend</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Portfolio views and scorecard analytics designed for leadership reviews and working sessions.
              </p>
            </div>
            <div className="border-2 border-slate-200 p-6">
              <FileDown className="h-9 w-9 text-[#05363A] mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Professional exports</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                PDF and workbook exports that match how you already present to EXCO, procurement forums, and partners.
              </p>
            </div>
          </div>

          <div className="mt-14 border border-slate-200 bg-slate-50 p-8 sm:p-10">
            <p className="text-slate-700 max-w-3xl">
              REAP Scorecard is the authenticated SaaS experience on this same site: sign in to reach your dashboard,
              procurement assessments, admin tools, and saved work — no separate marketing subdomain required.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <MarketingButton asChild className="bg-slate-900 text-white hover:bg-slate-800 border-0 rounded-none">
                <Link href="/login">Go to login</Link>
              </MarketingButton>
              <MarketingButton asChild variant="outline" className="rounded-none border-2 border-slate-300">
                <Link href="/contact">Talk to us about rollout</Link>
              </MarketingButton>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
