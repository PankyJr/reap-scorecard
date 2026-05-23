import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import {
  MarketingSubpageHero,
  marketingSubpageHeroOutlineBtnClass,
  marketingSubpageHeroPrimaryBtnClass,
} from '@/components/marketing/MarketingSubpageHero'
import { MarketingButton } from '@/components/marketing/ui/button'
import {
  getMarketingService,
  getMarketingServicePath,
  MARKETING_SERVICES,
} from '@/components/marketing/marketingServicesData'
import { marketingSectionContainerClass } from '@/components/marketing/marketingLayout'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return MARKETING_SERVICES.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = getMarketingService(slug)
  if (!service) return { title: 'Service not found' }

  return {
    title: `${service.title} | REAP Solutions`,
    description: service.metaDescription,
  }
}

export default async function MarketingServiceDetailPage({ params }: PageProps) {
  const { slug } = await params
  const service = getMarketingService(slug)
  if (!service) notFound()

  const otherServices = MARKETING_SERVICES.filter((s) => s.slug !== slug)

  return (
    <>
      <MarketingSubpageHero
        eyebrow="Solutions"
        title={service.title}
        description={service.description}
        actions={
          <>
            <MarketingButton asChild className={marketingSubpageHeroPrimaryBtnClass}>
              <Link href={`/contact?service=${encodeURIComponent(service.slug)}`}>
                Book a consult <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </MarketingButton>
            <MarketingButton asChild variant="outline" className={marketingSubpageHeroOutlineBtnClass}>
              <Link href="/solutions">All solutions</Link>
            </MarketingButton>
          </>
        }
      />

      <section className="bg-white">
        <div className={marketingSectionContainerClass}>
          <div className="py-14 sm:py-16 lg:py-20">
            <Link
              href="/solutions"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Back to solutions
            </Link>

            <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  How we help
                </h2>
                <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
                  {service.detail}
                </p>
              </div>

              <div className="lg:col-span-5">
                <div className="border border-slate-200 p-6 sm:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    What we deliver
                  </p>
                  <ul className="mt-5 space-y-4 border-t border-slate-200 pt-5">
                    {service.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                        <span className="mt-2 h-px w-3 shrink-0 bg-slate-900" aria-hidden />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/contact?service=${encodeURIComponent(service.slug)}`}
                    className="mt-8 inline-flex h-11 w-full items-center justify-center border border-slate-900 bg-transparent text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    Discuss this service
                    <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
                  </Link>
                </div>
              </div>
            </div>

            {otherServices.length > 0 ? (
              <div className="mt-16 border-t border-slate-200 pt-12">
                <h2 className="text-lg font-semibold text-slate-900">Other services</h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {otherServices.map((other) => (
                    <li key={other.slug}>
                      <Link
                        href={getMarketingServicePath(other.slug)}
                        className="group flex items-center justify-between border border-slate-200 px-5 py-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <span>{other.title}</span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}
