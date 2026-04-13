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
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_14px_32px_rgba(15,23,42,0.06)] lg:w-64 lg:shrink-0"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Settings</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">Control profile identity, account preferences, and support resources.</p>
      <ul className="mt-4 space-y-1 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-1.5">
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
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5">
        <p className="text-[11px] font-medium text-slate-700">Workspace hygiene</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
          Keep profile details current so reports and collaboration remain clean and trusted.
        </p>
      </div>
    </nav>
  )
}
