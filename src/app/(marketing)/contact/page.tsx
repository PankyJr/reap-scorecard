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

export const metadata: Metadata = {
  title: 'Contact REAP Solutions | Book a Consult',
  description:
    'Get in touch with REAP Solutions. Book a consult, request a proposal, or ask a question about B-BBEE strategy, training, and REAP Scorecard.',
}

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
