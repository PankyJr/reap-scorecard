'use client'

import Link from 'next/link'
import { MarketingButton } from '@/components/marketing/ui/button'
import { useEffect, useRef } from 'react'

interface MarketingHeroSectionProps {
  title?: string
  subtitle?: string
  supportingLine?: string
  primaryCTA?: {
    text: string
    href: string
  }
  secondaryCTA?: {
    text: string
    href: string
  }
}

export default function MarketingHeroSection({
  title = 'Your Trusted Partner for B-BBEE Transformation Solutions',
  subtitle = 'We enable organisations to access professionally managed transformation strategies that drive sustainable growth and create measurable value for all stakeholders.',
  supportingLine,
  primaryCTA = { text: 'Become a Client', href: '/contact' },
  secondaryCTA = { text: 'Schedule a call with us', href: '/contact?intent=schedule' },
}: MarketingHeroSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isVisible = true

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  return (
    <section
      aria-label="Hero"
      className="relative min-h-screen w-full overflow-hidden bg-slate-950"
      style={{ backgroundColor: '#020617' }}
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 z-0" />
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover z-10"
          style={{ objectFit: 'cover' }}
        >
          <source src="/marketing/assets/hero1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/55 z-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-20" />
      </div>

      <div className="relative z-10 mx-auto w-full flex min-h-screen items-end px-6 pb-20 sm:px-10 sm:pb-24 lg:px-16 lg:pb-28">
        <div className="w-full">
          <div className="max-w-7xl">
            {supportingLine ? (
              <p
                className={`mb-5 text-xs font-medium tracking-[0.18em] text-white/70 sm:text-sm transition-all duration-700 motion-reduce:transition-none ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                {supportingLine}
              </p>
            ) : null}

            <h1
              className={`text-white font-semibold tracking-tight leading-[1.02]
                text-4xl sm:text-5xl md:text-6xl lg:text-7xl
                transition-all duration-700 motion-reduce:transition-none ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                }`}
            >
              {title}
            </h1>

            <p
              className={`mt-5 max-w-5xl text-sm sm:text-base md:text-lg leading-relaxed text-white/85
                transition-all duration-700 motion-reduce:transition-none ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                }`}
              style={{ transitionDelay: '80ms' }}
            >
              {subtitle}
            </p>

            <div
              className={`mt-8 flex flex-col gap-2 sm:flex-row sm:gap-4
                transition-all duration-700 motion-reduce:transition-none ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                }`}
              style={{ transitionDelay: '140ms' }}
            >
              <MarketingButton
                asChild
                size="lg"
                className="h-10 w-full sm:w-auto sm:flex-1 sm:max-w-[200px] md:max-w-none md:flex-none md:h-12 rounded-none px-4 md:px-7 text-xs sm:text-sm md:text-base font-semibold whitespace-nowrap
                  border-2 border-white bg-transparent text-white
                  hover:bg-white/10 hover:border-white/80
                  transition-all duration-200
                  focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Link href={primaryCTA.href}>{primaryCTA.text}</Link>
              </MarketingButton>
              <MarketingButton
                asChild
                size="lg"
                variant="outline"
                className="h-10 w-full sm:w-auto sm:flex-1 sm:max-w-[200px] md:max-w-none md:flex-none md:h-12 rounded-none px-4 md:px-7 text-xs sm:text-sm md:text-base font-semibold whitespace-nowrap
                  border-white/25 bg-white/10 text-white
                  hover:bg-white/15 hover:border-white/35
                  backdrop-blur-sm
                  transition-all duration-200
                  focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Link href={secondaryCTA.href}>{secondaryCTA.text}</Link>
              </MarketingButton>
            </div>
          </div>

          <div className="mt-10 h-px w-[min(1400px,95vw)] bg-white/20" />
        </div>
      </div>

      <div className="absolute bottom-16 z-10 w-full px-6 sm:bottom-20 sm:px-10 lg:px-16">
        <div className="w-[min(1400px,95vw)]">
          <p className="text-[11px] sm:text-xs font-medium tracking-[0.22em] text-white/60">SCROLL TO EXPLORE</p>
        </div>
      </div>
    </section>
  )
}
