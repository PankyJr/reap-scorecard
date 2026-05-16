'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Route,
  Handshake,
  Network,
  GraduationCap,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

type ProductCard = {
  title: string
  description: string
  icon: LucideIcon
  href?: string
}

const defaultProducts: ProductCard[] = [
  {
    title: 'B-BBEE Strategy & Roadmap',
    description:
      'Build a practical transformation roadmap aligned to your business goals and compliance requirements.',
    icon: Route,
    href: '/solutions',
  },
  {
    title: 'Ownership Advisory & Structuring',
    description:
      'Get specialist guidance on ownership structures, partner profiles, and funding models that make commercial sense.',
    icon: Handshake,
    href: '/solutions',
  },
  {
    title: 'Enterprise & Supplier Development',
    description:
      'Design ESD initiatives that strengthen supplier pipelines and improve scorecard outcomes sustainably.',
    icon: Network,
    href: '/solutions',
  },
  {
    title: 'Training & Coaching Programs',
    description:
      'Practical workshops and coaching to help teams understand the Codes and implement transformation correctly.',
    icon: GraduationCap,
    href: '/training',
  },
  {
    title: 'REAP Scorecard',
    description:
      'Measure, track, and evidence procurement and scorecard performance in one place — from assessments to reports.',
    icon: BarChart3,
    href: '/scorecard',
  },
]

interface MarketingProductsSectionProps {
  kicker?: string
  description?: string
  items?: ProductCard[]
}

export default function MarketingProductsSection({
  kicker = 'WHAT WE DO',
  description = '',
  items = defaultProducts,
}: MarketingProductsSectionProps) {
  const defaultDescription =
    'Unlock growth opportunities, streamline operations, and achieve measurable results with tailored business consulting solutions designed to transform challenges into lasting success for your organization.'

  const body = description || defaultDescription

  return (
    <section className="w-full bg-white">
      <div className="mx-auto w-full px-6 py-14 sm:py-16 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-3">
            <p className="text-xs font-medium tracking-[0.18em] text-[#05363A] uppercase">{kicker}</p>
          </div>

          <div className="hidden lg:block w-px h-full bg-[#05363A]" />

          <div className="lg:col-span-8">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-slate-900">{body}</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {items.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="bg-white border-2 border-[#05363A] p-6 shadow-sm hover:bg-[#05363A] hover:border-[#05363A] hover:shadow-md transition-all duration-300 flex flex-col h-full group"
              >
                <div className="mb-6">
                  <Icon className="h-10 w-10 text-[#05363A] group-hover:text-white stroke-[1.5] transition-colors duration-300" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 group-hover:text-white mb-3 transition-colors duration-300">
                  {card.title}
                </h3>

                <p className="text-sm leading-relaxed text-slate-600 group-hover:text-white/90 mb-6 flex-grow transition-colors duration-300">
                  {card.description}
                </p>

                {card.href && (
                  <Link
                    href={card.href}
                    className="inline-flex items-center justify-center w-10 h-10 bg-[#05363A] group-hover:bg-white text-white group-hover:text-[#05363A] transition-all duration-300 mt-auto"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
