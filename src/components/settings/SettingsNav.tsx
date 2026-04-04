'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, KeyRound, HelpCircle, Scale } from 'lucide-react'

const links = [
  { href: '/settings/profile', label: 'Profile', Icon: User },
  { href: '/settings/account', label: 'Account', Icon: KeyRound },
  { href: '/settings/help', label: 'Help Center', Icon: HelpCircle },
  { href: '/settings/legal', label: 'Legal', Icon: Scale },
] as const

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Settings sections" className="lg:w-56 lg:shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Settings</p>
      <ul className="mt-3 space-y-1 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1.5">
        {links.map(item => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.Icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                  active
                    ? 'bg-[#063b3f] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
