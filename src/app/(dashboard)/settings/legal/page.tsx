import Link from 'next/link'
import { ChevronRight, FileText, Shield } from 'lucide-react'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

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
              className="group flex items-center gap-3 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 px-4 py-3.5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#063b3f] shadow-sm">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </SettingsPanel>
  )
}
