import { ChevronDown } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import { MARKETING_CONTACT_FAQ } from '@/components/marketing/marketingContactFaqData'
import { marketingBrandTextClass } from '@/components/marketing/marketingLayout'
import { buildFaqPageJsonLd } from '@/lib/seo/faq-json-ld'

/** FAQ block — embed inside MarketingContactSection so width matches the form grid above */
export default function MarketingContactFaqSection() {
  const faqJsonLd = buildFaqPageJsonLd(MARKETING_CONTACT_FAQ)

  return (
    <div id="faq" className="scroll-mt-28 mt-16 lg:mt-20" aria-labelledby="contact-faq-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-2xl border-l-4 border-[#05363A] pl-6">
        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.2em]', marketingBrandTextClass)}>
          FAQ
        </p>
        <h2 id="contact-faq-heading" className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[32px]">
          Common questions about B-BBEE advisory &amp; REAP Scorecard
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Quick answers before you reach out. For anything specific to your business, use the form above—we&apos;ll
          tailor our response.
        </p>
      </div>

      <div className="mt-10 w-full divide-y divide-slate-200 border border-slate-200 bg-white">
        {MARKETING_CONTACT_FAQ.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-slate-900 transition hover:bg-slate-50 sm:px-6 sm:py-5 sm:text-base [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-slate-400 transition duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="border-t border-slate-100 px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
              <p className="text-[15px] leading-relaxed text-slate-600">{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
