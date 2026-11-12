import { CARD_FRAME, CARD_INTERACTIVE } from '@/components/ui/Card'
import Link from 'next/link'
import { ChevronRight, FileText, Shield } from 'lucide-react'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Legal' }

const legalLinks = [
  {
    href: '/terms',
    label: 'Terms of Service',
    description: 'Rules for using the REAP Scorecard platform.',
    Icon: FileText,
  },
  {
    href: '/privacy',
    label: 'Privacy Policy',
    description: 'How we collect, use, and protect your data.',
    Icon: Shield,
  },
] as const

export default function LegalSettingsPage() {
  return (
    <SettingsPanel
      title="Legal"
      description="Policies governing use of the REAP Scorecard platform."
    >
      <ul className="space-y-3">
        {legalLinks.map(({ href, label, description, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={`group flex min-h-14 items-center gap-3 px-6 py-3.5 ${CARD_FRAME} ${CARD_INTERACTIVE}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-teal shadow-sm">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink">{label}</span>
                <span className="mt-0.5 block text-meta leading-relaxed text-muted">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-muted"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </SettingsPanel>
  )
}
