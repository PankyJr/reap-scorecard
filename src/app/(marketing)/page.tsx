import type { Metadata } from 'next'
import MarketingHeroSection from '@/components/marketing/MarketingHeroSection'
import MarketingHomeIntroSection from '@/components/marketing/MarketingHomeIntroSection'
import MarketingProductsSection from '@/components/marketing/MarketingProductsSection'
import MarketingComplianceSection from '@/components/marketing/MarketingComplianceSection'
import MarketingTeamSection from '@/components/marketing/MarketingTeamSection'
import MarketingCtaBar from '@/components/marketing/MarketingCtaBar'
import MarketingPartnersSection from '@/components/marketing/MarketingPartnersSection'
import MarketingNewsletterSection from '@/components/marketing/MarketingNewsletterSection'
import { buildMarketingMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMarketingMetadata({
  absoluteTitle: true,
  title: 'REAP Solutions | B-BBEE Advisory & REAP Scorecard Platform',
  description:
    'REAP Solutions combines B-BBEE transformation advisory with REAP Scorecard — procurement scoring, TMPS, supplier mapping, saved assessments, and PDF reporting for South African businesses.',
  path: '/',
  keywords: [
    'B-BBEE consulting South Africa',
    'B-BBEE advisory Pretoria',
    'REAP Scorecard',
    'procurement scorecard',
    'transformation advisory',
    'enterprise supplier development',
    'TMPS procurement',
  ],
})

export default function MarketingHomePage() {
  return (
    <>
      <MarketingHeroSection />

      <MarketingHomeIntroSection />

      <MarketingProductsSection />

      <MarketingComplianceSection />

      <MarketingTeamSection />

      <MarketingCtaBar />

      <MarketingPartnersSection />

      <MarketingNewsletterSection />
    </>
  )
}
