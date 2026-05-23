import Image from 'next/image'
import type { ReactNode } from 'react'
import { cn } from '@/components/marketing/cn'
import { marketingSectionContainerClass } from '@/components/marketing/marketingLayout'

/** Shared dark hero background for marketing subpages (not homepage). */
export const MARKETING_SUBPAGE_HERO_IMAGE = '/heroforall.jpg'

type MarketingSubpageHeroProps = {
  eyebrow: ReactNode
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
  showDivider?: boolean
  className?: string
  /** Tailwind object-position utility for background crop. */
  imagePosition?: string
}

export function MarketingSubpageHero({
  eyebrow,
  title,
  description,
  actions,
  showDivider = false,
  className,
  imagePosition = 'object-cover object-center md:object-[72%_center]',
}: MarketingSubpageHeroProps) {
  return (
    <section
      className={cn('relative isolate w-full min-h-[min(420px,72vh)] overflow-hidden bg-[#030708]', className)}
      aria-label="Page hero"
    >
      <Image
        src={MARKETING_SUBPAGE_HERO_IMAGE}
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn(imagePosition)}
        aria-hidden
      />

      {/* Neutral black overlay — keeps copy readable without tinting the image */}
      <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25"
        aria-hidden
      />

      <div className={cn(marketingSectionContainerClass, 'relative z-10 py-20 sm:py-24 lg:py-28')}>
        <p className="mb-4 text-sm font-medium tracking-wide text-white/55 sm:text-base">
          {eyebrow}
        </p>

        <h1 className="max-w-5xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          {title}
        </h1>

        <div className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
          {description}
        </div>

        {actions ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}

        {showDivider ? <div className="mt-12 h-px w-full bg-white/15" aria-hidden /> : null}
      </div>
    </section>
  )
}

/** Primary CTA on dark subpage heroes. */
export const marketingSubpageHeroPrimaryBtnClass =
  'bg-[#05363A] hover:bg-[#05363A]/90 rounded-none font-semibold text-white border-0'

/** Outline CTA on dark subpage heroes. */
export const marketingSubpageHeroOutlineBtnClass =
  'border-2 border-white/40 text-white hover:bg-white/10 rounded-none font-semibold bg-transparent'
