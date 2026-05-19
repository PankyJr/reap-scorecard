'use client'

import Link from 'next/link'
import { ArrowRight, FileSearch, GitBranch, FileText } from 'lucide-react'
import { marketingSectionContainerClass } from '@/components/marketing/marketingLayout'

const CARDS = [
  {
    title: 'Evidence readiness',
    description:
      'Supplier data, ownership fields, procurement spend, and supporting records stay visible throughout the workflow.',
    icon: FileSearch,
  },
  {
    title: 'Governance visibility',
    description:
      'Saved assessment runs, denominator choices, and score changes are easier to review before reporting.',
    icon: GitBranch,
  },
  {
    title: 'Client-ready reporting',
    description:
      'Turn procurement data into clean scorecard views and PDF reports for internal or client review.',
    icon: FileText,
  },
] as const

const WORKFLOW = ['Supplier data', 'TMPS denominator', 'Procurement points', 'PDF reports'] as const

export default function MarketingComplianceSection() {
  return (
    <section className="w-full border-t border-slate-200/70 bg-gradient-to-b from-slate-50/40 to-white">
      <div className={marketingSectionContainerClass}>
        {/* Advisory + platform bridge */}
        <div className="grid grid-cols-1 gap-8 border-b border-slate-100 py-10 sm:py-12 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-6">
            <h2 className="text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 sm:text-3xl">
              Advisory where it matters.
              <span className="mt-1 block text-[#05363A]">Software where it saves time.</span>
            </h2>
          </div>
          <div className="lg:col-span-6">
            <p className="text-[15px] leading-relaxed text-slate-600">
              REAP combines transformation advisory with a digital scorecard workflow, helping teams move from
              supplier data to procurement visibility and client-ready reports.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {WORKFLOW.map((item) => (
                <li
                  key={item}
                  className="rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Evidence & governance */}
        <div className="py-12 sm:py-14">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#05363A]">
              Evidence & governance
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Built for evidence-ready transformation reporting.
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              Organise supplier data, choose the correct TMPS denominator, review procurement points, and export
              client-ready reports — with advisory support when you need it.
            </p>
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
            {CARDS.map(({ title, description, icon: Icon }) => (
              <li
                key={title}
                className="flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-7"
              >
                <Icon className="h-5 w-5 text-white/90" strokeWidth={1.75} aria-hidden />
                <h4 className="mt-4 text-[15px] font-semibold text-white">{title}</h4>
                <p className="mt-2 text-[13px] leading-relaxed text-white/75">{description}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/scorecard"
              className="inline-flex h-10 items-center gap-2 bg-[#05363A] px-5 text-sm font-medium text-white transition hover:bg-[#064a50]"
            >
              Explore REAP Scorecard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-slate-600 transition hover:text-[#05363A]"
            >
              Book a consultation
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
