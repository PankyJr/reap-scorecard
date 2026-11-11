'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, KeyRound, HelpCircle, Scale } from 'lucide-react'

const links = [
  { href: '/settings/profile', label: 'Profile', description: 'Your name and photo', Icon: User },
  { href: '/settings/account', label: 'Account', description: 'Email and password', Icon: KeyRound },
  { href: '/settings/help', label: 'Help', description: 'How to use the app, and B-BBEE words explained', Icon: HelpCircle },
  { href: '/settings/legal', label: 'Legal', description: 'Terms and privacy', Icon: Scale },
] as const

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings sections"
      className="overflow-hidden rounded-card border border-line bg-surface/95 shadow-sm lg:sticky lg:top-6 lg:w-64 lg:shrink-0"
    >
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <p className="text-sm font-medium text-label">
          Settings
        </p>
        <p className="mt-1 text-sm leading-relaxed text-label">
          Profile, account, help, and legal
        </p>
      </div>

      <ul className="p-2">
        {links.map(item => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.Icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-start gap-3 rounded-control px-3 py-2.5 transition-colors ${
                  active
                    ? 'bg-brand text-brand-ink hover:bg-brand-hover'
                    : 'text-ink hover:bg-sunken'
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-brand-ink/90' : 'text-faint'}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-body font-medium leading-tight">{item.label}</span>
                  <span
                    className={`mt-0.5 block text-meta leading-snug ${
                      active ? 'text-brand-ink/70' : 'text-label'
                    }`}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
