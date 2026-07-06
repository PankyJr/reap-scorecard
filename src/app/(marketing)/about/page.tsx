import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingButton } from '@/components/marketing/ui/button'
import { ArrowRight } from 'lucide-react'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import MarketingAboutStorySection from '@/components/marketing/MarketingAboutStorySection'
import MarketingTeamSection from '@/components/marketing/MarketingTeamSection'
import MarketingTimelineSection from '@/components/marketing/MarketingTimelineSection'
import { ABOUT_HERO, MARKETING_PRACTICE_MEMBERS } from '@/components/marketing/marketingAboutData'
import { buildMarketingMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'About Us',
  description:
    'REAP Solutions — Your Empowerment Transformation Partner. Specialist B-BBEE advisory, training, and implementation across South Africa.',
  path: '/about',
  keywords: ['about REAP Solutions', 'B-BBEE experts South Africa', 'transformation advisory company'],
})

export default function MarketingAboutPage() {
  return (
    <>
      <MarketingSubpageHero
        eyebrow={ABOUT_HERO.eyebrow}
        title={ABOUT_HERO.title}
        description={ABOUT_HERO.description}
      />

      <MarketingAboutStorySection />

      <MarketingTimelineSection />

      <MarketingTeamSection
        kicker="DELIVERY"
        title="Specialist practice areas behind every engagement"
        highlightPhrases={['practice areas']}
        sectionLabel="HOW WE DELIVER"
        ctaText="View all solutions"
        ctaHref="/solutions"
        members={MARKETING_PRACTICE_MEMBERS}
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
