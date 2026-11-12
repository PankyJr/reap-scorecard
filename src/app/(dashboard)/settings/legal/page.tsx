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
      <ul className="divide-y divide-line">
        {legalLinks.map(({ href, label, description, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group -mx-2 flex min-h-[64px] items-center gap-3 rounded-[12px] px-2 py-3 transition-colors duration-200 hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-icon">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium text-ink">{label}</span>
                <span className="mt-0.5 block text-meta text-label">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-icon transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </SettingsPanel>
  )
}
