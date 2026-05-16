import Link from 'next/link'
import { MarketingButton } from '@/components/marketing/ui/button'
import { Play, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import MarketingHeroSection from '@/components/marketing/MarketingHeroSection'
import MarketingProductsSection from '@/components/marketing/MarketingProductsSection'
import MarketingComplianceSection from '@/components/marketing/MarketingComplianceSection'
import MarketingTeamSection from '@/components/marketing/MarketingTeamSection'
import MarketingCtaBar from '@/components/marketing/MarketingCtaBar'
import MarketingPartnersSection from '@/components/marketing/MarketingPartnersSection'
import MarketingNewsletterSection from '@/components/marketing/MarketingNewsletterSection'

export const metadata: Metadata = {
  title: 'REAP Solutions | B-BBEE Transformation Consulting | South Africa',
  description:
    'Specialist enterprise B-BBEE consulting. 20+ years combined experience. We translate business strategy into sustainable transformation solutions that drive growth and create value for stakeholders.',
  keywords:
    'B-BBEE consulting, transformation advisory, enterprise supplier development, South Africa empowerment consulting, B-BBEE strategy, ownership advisory',
}

export default function MarketingHomePage() {
  return (
    <>
      <MarketingHeroSection
        title="Your Trusted Partner for B-BBEE Transformation Solutions"
        subtitle="We enable organisations to access professionally managed transformation strategies that drive sustainable growth and create measurable value for all stakeholders."
        supportingLine="Built for modern enterprises • Secure • Scalable • Data-driven"
        primaryCTA={{
          text: 'Become a Client',
          href: '/contact',
        }}
        secondaryCTA={{
          text: 'Schedule a call with us',
          href: '/contact',
        }}
      />

      <MarketingProductsSection />

      <div className="w-full bg-white">
        <div className="mx-auto w-full px-6 sm:px-10 lg:px-16">
          <div className="h-px w-full bg-slate-200" />
        </div>
      </div>

      <section className="w-full bg-white pt-20 sm:pt-24 lg:pt-32 pb-12 sm:pb-16 lg:pb-20">
        <div className="mx-auto w-full px-6 sm:px-10 lg:px-16">
          <div className="mb-12">
            <p className="text-xs font-medium tracking-[0.18em] text-slate-500 mb-4">WATCH & LEARN</p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-4">See How We Work</h2>
            <p className="text-lg text-slate-600 max-w-2xl">
              Get an inside look at our B-BBEE transformation process and discover how we help businesses achieve meaningful
              transformation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <Link href="/contact?from=video-overview" className="group block">
              <div className="relative aspect-video w-full bg-black rounded-none overflow-hidden mb-4">
                <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-none">
                  <span className="text-xs font-medium text-slate-700 tracking-wide">COMING SOON</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-60">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                    <Play className="h-8 w-8 text-black ml-1" fill="black" />
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-none flex items-center gap-1.5 opacity-60">
                  <Clock className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-xs font-medium text-slate-700">2:45</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#05363A] transition-colors">
                REAP Solutions Overview
              </h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Learn about our comprehensive B-BBEE transformation services and how REAP Solutions helps businesses achieve
                meaningful transformation.
              </p>
              <span className="text-[#05363A] font-medium text-sm inline-flex items-center gap-1">Contact us — Video coming soon</span>
            </Link>

            <Link href="/contact?from=video-process" className="group block">
              <div className="relative aspect-video w-full bg-black rounded-none overflow-hidden mb-4">
                <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-none">
                  <span className="text-xs font-medium text-slate-700 tracking-wide">COMING SOON</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-60">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                    <Play className="h-8 w-8 text-black ml-1" fill="black" />
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-none flex items-center gap-1.5 opacity-60">
                  <Clock className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-xs font-medium text-slate-700">1:30</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#05363A] transition-colors">
                The Transformation Process
              </h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Discover our streamlined transformation process designed for efficiency and measurable outcomes.
              </p>
              <span className="text-[#05363A] font-medium text-sm inline-flex items-center gap-1">Contact us — Video coming soon</span>
            </Link>
          </div>

          <div className="mt-16 h-px w-full bg-slate-200" />
        </div>
      </section>

      <section className="w-full bg-white pt-8 sm:pt-10 lg:pt-12 pb-20 sm:pb-24 lg:pb-32">
        <div className="mx-auto w-full px-6 sm:px-10 lg:px-16">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-10 max-w-7xl">
              A transformation consultancy blending strategic expertise with dedicated, partnership-driven service.
            </h2>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <MarketingButton
                asChild
                size="lg"
                className="h-14 px-8 text-base bg-slate-900 text-white hover:bg-slate-800 rounded-none font-semibold border-0"
              >
                <Link href="/contact">Become a Client</Link>
              </MarketingButton>
              <MarketingButton
                asChild
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base bg-white text-slate-900 hover:bg-slate-50 rounded-none font-semibold border-2 border-slate-300 hover:border-slate-400"
              >
                <Link href="/contact?intent=schedule">Schedule a call with us</Link>
              </MarketingButton>
            </div>
          </div>

          <div className="mt-16 h-px w-full bg-slate-200" />
        </div>
      </section>

      <MarketingComplianceSection />

      <MarketingTeamSection />

      <MarketingCtaBar />

      <MarketingPartnersSection />

      <MarketingNewsletterSection />
    </>
  )
}
