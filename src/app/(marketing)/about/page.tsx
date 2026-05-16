import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingButton } from '@/components/marketing/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'
import MarketingTimelineSection from '@/components/marketing/MarketingTimelineSection'
import MarketingTeamSection from '@/components/marketing/MarketingTeamSection'

export const metadata: Metadata = {
  title: 'About REAP Solutions | Our Mission & Approach',
  description: 'Learn about REAP Solutions and how we transform B-BBEE from compliance to growth strategy.',
}

export default function MarketingAboutPage() {
  return (
    <>
      <section className="relative w-full bg-white overflow-hidden">
        <div className="relative z-10 mx-auto w-full px-6 py-20 sm:px-10 sm:py-24 lg:px-16">
          <p className="inline-flex items-center gap-2 text-[#05363A] text-sm sm:text-base mb-4">
            <Sparkles className="h-4 w-4" />
            About
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold leading-tight tracking-tight text-slate-900">
            Making transformation meaningful.
          </h1>
          <p className="mt-5 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            We help organisations turn B-BBEE requirements into{' '}
            <span className="bg-[#05363A] px-1.5 py-0.5 font-medium text-white">practical, evidence-ready initiatives</span>.
          </p>
          <div className="mt-12 h-px w-full bg-slate-200" />
        </div>
      </section>

      <MarketingTimelineSection />

      <MarketingTeamSection
        kicker="TEAM"
        title="Team and Advisory Council with B-BBEE Expertise and Practical Implementation Experience"
        highlightPhrases={['Advisory Council', 'B-BBEE Expertise', 'Implementation Experience']}
        ctaText="Explore our team"
        ctaHref="/about#team"
        sectionLabel="OUR TEAM"
      />

      <section className="w-full bg-white">
        <div className="mx-auto w-full px-6 py-12 sm:py-16 sm:px-10 lg:px-16">
          <div className="w-full">
            <div className="border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-10 text-white overflow-hidden relative">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.18),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(16,185,129,0.12),transparent_55%)]" />
              </div>

              <div className="relative z-10 grid gap-6 lg:grid-cols-12 items-center">
                <div className="lg:col-span-8">
                  <h3 className="text-2xl sm:text-3xl font-bold">Ready to turn B-BBEE into a growth strategy?</h3>
                  <p className="mt-2 text-white/80 text-base sm:text-lg leading-relaxed">
                    Let&apos;s map the highest-impact initiatives, close evidence gaps, and build a defensible, sustainable score.
                  </p>
                </div>
                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                  <MarketingButton
                    asChild
                    variant="outline"
                    className="border-white/60 text-white bg-white/20 hover:bg-white/30 hover:border-white/80"
                  >
                    <Link href="/contact">
                      Book a consult <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </MarketingButton>
                  <MarketingButton
                    asChild
                    variant="outline"
                    className="border-white/60 text-white bg-white/20 hover:bg-white/30 hover:border-white/80"
                  >
                    <Link href="/solutions">View solutions</Link>
                  </MarketingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
