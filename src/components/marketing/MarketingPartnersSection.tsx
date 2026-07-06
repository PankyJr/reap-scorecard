'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MarketingButton } from '@/components/marketing/ui/button'
import { ArrowRight } from 'lucide-react'

type PartnerCard = {
  title: string
  description: string
  logoSrc: string
  logoAlt: string
}

interface MarketingPartnersSectionProps {
  kicker?: string
  title?: string
  highlightWord?: string
  ctaText?: string
  ctaHref?: string
  cards?: PartnerCard[]
}

const defaultCards: PartnerCard[] = [
  {
    title: 'Thebe Investment Corporation',
    description: 'B-BBEE strategy and transformation advisory.',
    logoSrc: '/marketing/images/partners/Thebe_Investments_Dark-Skin-Logo.png',
    logoAlt: 'Thebe Investment Corporation',
  },
  {
    title: 'Aberdare Cables',
    description: 'Transformation and advisory support.',
    logoSrc: '/marketing/images/partners/0000692180_resized_aberdare.jpg',
    logoAlt: 'Aberdare Cables',
  },
  {
    title: 'Nokia South Africa',
    description: 'B-BBEE advisory and implementation support.',
    logoSrc: '/marketing/images/partners/Nokia-South-Africa.jpg',
    logoAlt: 'Nokia South Africa',
  },
  {
    title: 'Naamsa',
    description: 'Transformation advisory engagement.',
    logoSrc: '/marketing/images/partners/naamsa-final-logo-600.jpg',
    logoAlt: 'Naamsa',
  },
  {
    title: 'Thermitrex',
    description: 'B-BBEE advisory support.',
    logoSrc: '/marketing/images/partners/cropped-Logo.png',
    logoAlt: 'Thermitrex',
  },
  {
    title: 'SGB-SMIT Power Matla',
    description: 'Transformation and advisory support.',
    logoSrc: '/marketing/images/partners/images.jpeg',
    logoAlt: 'SGB-SMIT Power Matla',
  },
]

export default function MarketingPartnersSection({
  kicker = 'CLIENTS',
  title = 'Organisations we\'ve',
  highlightWord = 'supported',
  ctaText = 'About REAP',
  ctaHref = '/about',
  cards = defaultCards,
}: MarketingPartnersSectionProps) {
  const duplicatedCards = [...cards, ...cards, ...cards, ...cards, ...cards, ...cards]

  return (
    <section className="w-full bg-white overflow-hidden">
      <div className="mx-auto w-full px-6 py-14 sm:py-16 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8">
            <p className="text-xs font-medium tracking-[0.18em] text-slate-500">{kicker}</p>

            <h2 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
              {title} <span className="text-emerald-600">{highlightWord}</span>
            </h2>
          </div>

          <div className="lg:col-span-4 lg:flex lg:justify-end lg:pt-12">
            <MarketingButton asChild variant="outline" className="h-11 rounded-none px-6 text-sm font-semibold">
              <Link href={ctaHref} className="flex items-center">
                {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </MarketingButton>
          </div>
        </div>

        <div className="mt-12 relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <div className="overflow-hidden">
            <div className="flex gap-6 md:gap-12 items-center animate-partner-scroll">
              {duplicatedCards.map((card, index) => (
                <div
                  key={`${card.title}-${index}`}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ minWidth: '200px' }}
                >
                  <div className="relative h-16 w-40 transition-opacity duration-300 opacity-90 hover:opacity-100 grayscale hover:grayscale-0">
                    <Image
                      src={card.logoSrc}
                      alt={card.logoAlt}
                      fill
                      className="object-contain"
                      sizes="160px"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
