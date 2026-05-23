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
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm lg:sticky lg:top-6 lg:w-64 lg:shrink-0"
    >
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Settings
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
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
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-white/90' : 'text-slate-400'}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-tight">{item.label}</span>
                  <span
                    className={`mt-0.5 block text-[11px] leading-snug ${
                      active ? 'text-white/70' : 'text-slate-500'
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
