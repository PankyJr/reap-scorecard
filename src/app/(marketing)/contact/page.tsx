import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import MarketingContactSection from '@/components/marketing/MarketingContactSection'
import { MarketingContactMapSection } from '@/components/marketing/MarketingContactDetails'
import { MARKETING_CONTACT } from '@/components/marketing/marketingContactData'
import {
  MarketingSubpageHero,
  marketingSubpageHeroOutlineBtnClass,
  marketingSubpageHeroPrimaryBtnClass,
} from '@/components/marketing/MarketingSubpageHero'
import { MarketingButton } from '@/components/marketing/ui/button'
import { buildMarketingMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Contact Us — Book a B-BBEE Consult',
  description:
    'Contact REAP Solutions in Pretoria for B-BBEE strategy, training, ESD, skills planning, and REAP Scorecard. FAQ covers verification prep, national coverage, and how to book a consult.',
  path: '/contact',
  keywords: [
    'contact REAP Solutions',
    'B-BBEE consultant Pretoria',
    'B-BBEE advisory South Africa',
    'REAP Scorecard support',
    'book B-BBEE consult',
  ],
})

export default function ContactPage() {
  return (
    <>
      <MarketingSubpageHero
        eyebrow="Contact"
        title="Let's talk transformation."
        description="Book a consult, request a proposal, or ask a question. We'll respond with clear next steps."
        actions={
          <>
            <MarketingButton asChild className={marketingSubpageHeroPrimaryBtnClass}>
              <a href={`mailto:${MARKETING_CONTACT.email}`}>
                Email us <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </MarketingButton>
            <MarketingButton asChild variant="outline" className={marketingSubpageHeroOutlineBtnClass}>
              <Link href={`tel:${MARKETING_CONTACT.phone}`}>Call {MARKETING_CONTACT.phoneDisplay}</Link>
            </MarketingButton>
          </>
        }
      />

      <MarketingContactSection />

      <MarketingContactMapSection />
    </>
  )
}
