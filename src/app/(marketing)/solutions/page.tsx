import type { Metadata } from 'next'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import MarketingServicesSection from '@/components/marketing/MarketingServicesSection'
import MarketingSolutionsCta from '@/components/marketing/MarketingSolutionsCta'
import { buildMarketingMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'B-BBEE Solutions & Consulting Services',
  description:
    'Comprehensive B-BBEE transformation consulting — strategy, ownership advisory, enterprise supplier development, and skills planning for South African businesses.',
  path: '/solutions',
  keywords: ['B-BBEE solutions', 'transformation consulting', 'B-BBEE services South Africa'],
})

export default function MarketingSolutionsPage() {
  return (
    <>
      <MarketingSubpageHero
        eyebrow="Solutions"
        title="Your transformation has a story worth telling—we help you tell it right."
        description="We turn B-BBEE requirements into practical, evidence-ready outcomes that drive growth and scorecard results."
      />

      <MarketingServicesSection />

      <MarketingSolutionsCta />
    </>
  )
}
