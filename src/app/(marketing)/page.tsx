import type { Metadata } from 'next'
import MarketingHeroSection from '@/components/marketing/MarketingHeroSection'
import MarketingProductsSection from '@/components/marketing/MarketingProductsSection'
import MarketingComplianceSection from '@/components/marketing/MarketingComplianceSection'
import MarketingTeamSection from '@/components/marketing/MarketingTeamSection'
import MarketingCtaBar from '@/components/marketing/MarketingCtaBar'
import MarketingPartnersSection from '@/components/marketing/MarketingPartnersSection'
import MarketingNewsletterSection from '@/components/marketing/MarketingNewsletterSection'

export const metadata: Metadata = {
  title: 'REAP Solutions | B-BBEE Advisory & REAP Scorecard Platform',
  description:
    'REAP Solutions combines B-BBEE transformation advisory with REAP Scorecard — procurement scoring, TMPS, supplier mapping, saved assessments, and PDF reporting for South African businesses.',
  keywords:
    'B-BBEE consulting, REAP Scorecard, procurement scorecard, transformation advisory, enterprise supplier development, South Africa',
}

export default function MarketingHomePage() {
  return (
    <>
      <MarketingHeroSection />

      <MarketingProductsSection />

      <MarketingComplianceSection />

      <MarketingTeamSection />

      <MarketingCtaBar />

      <MarketingPartnersSection />

      <MarketingNewsletterSection />
    </>
  )
}
