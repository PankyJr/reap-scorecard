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
    <nav
      aria-label="Settings sections"
      className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_46px_rgba(15,23,42,0.08)] lg:sticky lg:top-6 lg:w-72 lg:shrink-0"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Settings Navigation
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Move between profile, account controls, help resources, and legal pages.
      </p>
      <ul className="mt-4 space-y-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
        {links.map(item => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.Icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#02181b] via-[#063b3f] to-[#0b5259] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 px-3 py-2.5">
        <p className="text-[11px] font-medium text-slate-700">Workspace hygiene</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          Keep profile details current so reports and collaboration remain clean and trusted.
        </p>
      </div>
    </nav>
  )
}
