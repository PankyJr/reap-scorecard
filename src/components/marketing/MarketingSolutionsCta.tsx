import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import { marketingSectionContainerClass } from '@/components/marketing/marketingLayout'
import { MarketingButton } from '@/components/marketing/ui/button'

export default function MarketingSolutionsCta() {
  return (
    <section className="w-full bg-white pb-16 sm:pb-20 lg:pb-24">
      <div className={cn(marketingSectionContainerClass, 'pt-8 md:pt-12')}>
        <div className="border border-slate-200 bg-slate-900 p-6 text-white sm:p-10">
          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <h3 className="text-2xl font-bold sm:text-3xl">Ready to transform your B-BBEE strategy?</h3>
              <p className="mt-2 text-base leading-relaxed text-white/80 sm:text-lg">
                Let&apos;s discuss how our solutions can help you achieve your transformation goals
                and drive sustainable growth.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col lg:items-stretch">
              <MarketingButton
                asChild
                variant="outline"
                className="h-11 rounded-none border-white/60 bg-white/10 text-white hover:border-white hover:bg-white/20"
              >
                <Link href="/contact">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </MarketingButton>
              <MarketingButton
                asChild
                variant="outline"
                className="h-11 rounded-none border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10"
              >
                <Link href="/contact?intent=consultation">Book a consultation</Link>
              </MarketingButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
