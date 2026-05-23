import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import MarketingScorecardCapabilities from '@/components/marketing/MarketingScorecardCapabilities'
import MarketingScorecardCta from '@/components/marketing/MarketingScorecardCta'
import MarketingScorecardPreviewSection from '@/components/marketing/MarketingScorecardPreviewSection'
import {
  MarketingSubpageHero,
  marketingSubpageHeroOutlineBtnClass,
  marketingSubpageHeroPrimaryBtnClass,
} from '@/components/marketing/MarketingSubpageHero'
import { MarketingButton } from '@/components/marketing/ui/button'

export const metadata: Metadata = {
  title: 'REAP Scorecard | Procurement assessments & B-BBEE reporting',
  description:
    'Upload supplier workbooks, map procurement fields, choose TMPS denominators, preview B-BBEE procurement points, and export evidence-ready PDF reports.',
  keywords:
    'REAP Scorecard, procurement scorecard, TMPS, B-BBEE procurement, supplier assessment, South Africa',
}

export default function MarketingScorecardProductPage() {
  return (
    <>
      <MarketingSubpageHero
        eyebrow="REAP Scorecard"
        title="Turn procurement data into scorecard results you can defend."
        description="Upload supplier workbooks, map fields, confirm your TMPS denominator, preview procurement points, and export professional reports—all in one workspace."
        actions={
          <>
            <MarketingButton asChild className={`${marketingSubpageHeroPrimaryBtnClass} h-12 px-8`}>
              <Link href="/login">
                Sign in to Scorecard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </MarketingButton>
            <MarketingButton
              asChild
              variant="outline"
              className={`${marketingSubpageHeroOutlineBtnClass} h-12 px-8`}
            >
              <Link href="#workflow">See the workflow</Link>
            </MarketingButton>
          </>
        }
      />

      <MarketingScorecardPreviewSection />

      <MarketingScorecardCapabilities />

      <MarketingScorecardCta />
    </>
  )
}
