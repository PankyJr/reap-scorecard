import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import MarketingTrainingCatalog from '@/components/marketing/MarketingTrainingCatalog'
import {
  MarketingSubpageHero,
  marketingSubpageHeroOutlineBtnClass,
  marketingSubpageHeroPrimaryBtnClass,
} from '@/components/marketing/MarketingSubpageHero'
import { MarketingButton } from '@/components/marketing/ui/button'
import { buildMarketingMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'B-BBEE Training & Executive Education',
  description:
    'Executive training on B-BBEE codes, enterprise supplier development, and transformation strategy. Build lasting capability inside your organisation.',
  path: '/training',
  keywords: ['B-BBEE training', 'transformation training South Africa', 'B-BBEE codes workshop'],
})

export default function TrainingPage() {
  return (
    <>
      <MarketingSubpageHero
        eyebrow="Training & Education"
        title="Build transformation capability—from the boardroom to implementation."
        description="Executive education programs designed for practitioners and leaders who need to understand B-BBEE, implement strategies, and embed transformation into organisational culture."
        actions={
          <>
            <MarketingButton asChild className={marketingSubpageHeroPrimaryBtnClass}>
              <Link href="/contact?intent=training">
                Book a workshop <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </MarketingButton>
            <MarketingButton asChild variant="outline" className={marketingSubpageHeroOutlineBtnClass}>
              <Link href="#core-training-programs">View programmes</Link>
            </MarketingButton>
          </>
        }
      />

      <MarketingTrainingCatalog />
    </>
  )
}
