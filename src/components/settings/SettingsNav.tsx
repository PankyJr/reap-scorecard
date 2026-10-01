'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, KeyRound, HelpCircle, Scale } from 'lucide-react'

const links = [
  { href: '/settings/profile', label: 'Profile', description: 'Name, photo, and display', Icon: User },
  { href: '/settings/account', label: 'Account', description: 'Security and workspace', Icon: KeyRound },
  { href: '/settings/help', label: 'Help Center', description: 'Guides and support', Icon: HelpCircle },
  { href: '/settings/legal', label: 'Legal', description: 'Terms and privacy', Icon: Scale },
] as const

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings sections"
      className="overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-sm lg:sticky lg:top-6 lg:w-64 lg:shrink-0"
    >
      <div className="border-b border-line px-4 py-4 sm:px-5">
        <p className="text-sm font-medium text-muted">
          Settings
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
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
                className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  active
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-ink hover:bg-sunken'
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-white/90' : 'text-faint'}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium leading-tight">{item.label}</span>
                  <span
                    className={`mt-0.5 block text-sm leading-snug ${
                      active ? 'text-white/70' : 'text-muted'
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
