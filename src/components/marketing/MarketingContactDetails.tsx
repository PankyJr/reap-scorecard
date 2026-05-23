import Link from 'next/link'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import { MARKETING_CONTACT } from '@/components/marketing/marketingContactData'
import { marketingSectionContainerClass } from '@/components/marketing/marketingLayout'

type ContactDetailRow = {
  key: string
  label: string
  icon: typeof Mail
  value: string
  href?: string
}

const DETAIL_ROWS: ContactDetailRow[] = [
  {
    key: 'email',
    label: 'Email',
    icon: Mail,
    href: `mailto:${MARKETING_CONTACT.email}`,
    value: MARKETING_CONTACT.email,
  },
  {
    key: 'phone',
    label: 'Phone',
    icon: Phone,
    href: `tel:${MARKETING_CONTACT.phone}`,
    value: MARKETING_CONTACT.phoneDisplay,
  },
  {
    key: 'location',
    label: 'Location',
    icon: MapPin,
    value: `${MARKETING_CONTACT.addressLine1}, ${MARKETING_CONTACT.addressLine2}`,
  },
  {
    key: 'hours',
    label: 'Hours',
    icon: Clock,
    value: MARKETING_CONTACT.hours,
  },
]

export default function MarketingContactDetails() {
  return (
    <aside className="flex h-full flex-col border border-slate-200">
      <div className="border-b border-white/10 bg-[#05363A] px-6 py-8 text-white sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Direct contact
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          Prefer a quick call or email? We typically respond within one business day.
        </p>
      </div>

      <ul className="flex flex-1 flex-col divide-y divide-slate-200 bg-white">
        {DETAIL_ROWS.map(({ key, label, icon: Icon, href, value }) => (
          <li key={key} className="px-6 py-5 sm:px-8">
            <div className="flex gap-4">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[#05363A]/30 bg-[#05363A]/5 text-[#05363A]">
                <Icon className="h-4 w-4" strokeWidth={1.25} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </p>
                {href ? (
                  <Link
                    href={href}
                    className="mt-1 block text-sm font-semibold text-slate-900 transition hover:text-[#05363A]"
                  >
                    {value}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
        <p className="text-xs leading-relaxed text-slate-600">
          In-person meetings available in Pretoria by appointment.
        </p>
      </div>
    </aside>
  )
}

export function MarketingContactMapSection() {
  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className={cn(marketingSectionContainerClass, 'py-14 sm:py-16')}>
        <div className="max-w-2xl border-l-4 border-[#05363A] pl-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#05363A]">
            Location
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Find us in Pretoria
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Easily accessible for in-person consultations and working sessions.
          </p>
        </div>

        <div className="mt-8 overflow-hidden border border-slate-200 bg-white">
          <iframe
            src={`https://www.google.com/maps?q=${MARKETING_CONTACT.mapQuery}&output=embed`}
            width="100%"
            height="100%"
            className="h-[420px] w-full sm:h-[480px]"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="REAP Solutions — Pretoria, South Africa"
          />
        </div>
      </div>
    </section>
  )
}
