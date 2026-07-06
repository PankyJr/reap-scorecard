'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { MarketingButton } from '@/components/marketing/ui/button'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import {
  MARKETING_TEAM_MEMBERS,
  type MarketingTeamMember,
} from '@/components/marketing/marketingAboutData'
import { MarketingTeamPortrait } from '@/components/marketing/MarketingTeamPortrait'

type TeamMember = MarketingTeamMember

interface MarketingTeamSectionProps {
  kicker?: string
  title?: string
  highlightPhrases?: string[]
  ctaText?: string
  ctaHref?: string
  sectionLabel?: string
  members?: TeamMember[]
}

const defaultMembers: TeamMember[] = MARKETING_TEAM_MEMBERS

export default function MarketingTeamSection({
  kicker,
  title = 'Team and advisory council with B-BBEE expertise and implementation experience',
  highlightPhrases = ['B-BBEE expertise', 'implementation experience'],
  ctaText = 'Meet our team',
  ctaHref = '/about#team',
  sectionLabel = 'OUR TEAM',
  members = defaultMembers,
}: MarketingTeamSectionProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const membersPerPage = 5
  const totalPages = Math.ceil(members.length / membersPerPage)
  const startIndex = currentPage * membersPerPage
  const endIndex = startIndex + membersPerPage
  const currentMembers = members.slice(startIndex, endIndex)

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  const renderTitle = () => {
    let output: (string | ReactNode)[] = [title]
    highlightPhrases.forEach((phrase) => {
      output = output.flatMap((chunk, idx) => {
        if (typeof chunk !== 'string') return [chunk]
        const parts = chunk.split(phrase)
        if (parts.length === 1) return [chunk]
        const merged: (string | ReactNode)[] = []
        parts.forEach((p, i) => {
          if (p) merged.push(p)
          if (i < parts.length - 1)
            merged.push(
              <span key={`${phrase}-${idx}-${i}`} className="text-emerald-600">
                {phrase}
              </span>,
            )
        })
        return merged
      })
    })
    return output
  }

  return (
    <section id="team" className="w-full scroll-mt-28 bg-white">
      <div className="mx-auto w-full px-6 py-14 sm:py-16 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8">
            {kicker ? (
              <p className="text-xs font-medium tracking-[0.18em] text-slate-500">{kicker}</p>
            ) : null}

            <h2 className={`text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl ${kicker ? 'mt-6' : ''}`}>
              {renderTitle()}
            </h2>
          </div>

          <div className="lg:col-span-4 lg:flex lg:justify-end lg:pt-12">
            <MarketingButton
              asChild
              variant="outline"
              className="h-11 rounded-none px-6 text-sm font-semibold border-2 border-slate-400 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-500 hover:text-slate-700"
            >
              <Link href={ctaHref} className="flex items-center">
                {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </MarketingButton>
          </div>
        </div>

        <div className="mt-10 h-px w-full bg-slate-200" />

        <div className="mt-6 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold tracking-[0.16em] text-slate-900">{sectionLabel}</span>
        </div>

        <div className="mt-10">
          <div className="relative lg:hidden">
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

            <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 sm:-mx-10 sm:px-10 scrollbar-hide scroll-smooth">
              {currentMembers.map((m) => (
                <div key={m.name} className="group flex-shrink-0 w-[calc(50%-12px)] sm:w-[calc(33.333%-16px)]">
                  <MarketingTeamPortrait
                    name={m.name}
                    initials={m.initials}
                    imageSrc={m.imageSrc}
                    href={m.href}
                    sizes="(min-width: 640px) 33vw, 50vw"
                  />
                  <p className="mt-4 text-base font-semibold text-slate-900">{m.name}</p>
                  <p className="mt-1 text-sm leading-snug text-slate-500">{m.role}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
              <ChevronRight className="h-4 w-4 animate-pulse" />
              <span>Swipe to see more</span>
            </div>
          </div>

          <div className="hidden lg:grid lg:grid-cols-5 gap-6">
            {currentMembers.map((m) => (
              <div key={m.name} className="group">
                <MarketingTeamPortrait
                  name={m.name}
                  initials={m.initials}
                  imageSrc={m.imageSrc}
                  href={m.href}
                  sizes="20vw"
                />
                <p className="mt-4 text-base font-semibold text-slate-900">{m.name}</p>
                <p className="mt-1 text-sm leading-snug text-slate-500">{m.role}</p>
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentPage === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-600 transition-all duration-200 hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-white"
              aria-label="Previous team members"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentPage === totalPages - 1}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-600 transition-all duration-200 hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-white"
              aria-label="Next team members"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
