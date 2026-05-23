import type { Metadata } from 'next'
import { MarketingSubpageHero } from '@/components/marketing/MarketingSubpageHero'
import MarketingServicesSection from '@/components/marketing/MarketingServicesSection'
import MarketingSolutionsCta from '@/components/marketing/MarketingSolutionsCta'

export const metadata: Metadata = {
  title: 'Our Solutions | REAP Solutions',
  description:
    'Comprehensive B-BBEE transformation consulting services designed to drive growth and profit.',
}

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
