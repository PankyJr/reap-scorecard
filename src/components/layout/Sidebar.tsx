'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Activity,
  Plus,
  FileBarChart2,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Settings,
} from 'lucide-react'
import Image from 'next/image'

export type SidebarUser = {
  name: string
  email: string
  avatarUrl?: string
}

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: '/dashboard' },
  { href: '/companies', label: 'Companies', icon: Building2, match: '/companies' },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity, match: '/dashboard/activity' },
  { href: '/settings/profile', label: 'Settings', icon: Settings, match: '/settings' },
]

const createNav = [
  { href: '/companies/new', label: 'New Company', icon: Plus },
  { href: '/scorecards/new', label: 'New Scorecard', icon: FileBarChart2 },
]

export function Sidebar({ user, signOutAction }: { user: SidebarUser; signOutAction: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  function isActive(match: string) {
    if (match === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(match)
  }

  const w = collapsed ? 'w-[60px]' : 'w-[248px]'

  return (
    <aside className={`hidden bg-[#02181b] transition-[width] duration-200 md:flex md:sticky md:top-0 md:h-screen ${w}`}>
      <div className="flex h-full w-full flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] px-4">
          <Image src="/logo.png" alt="Reap Solutions" width={28} height={28} className="h-7 w-7 shrink-0" />
          {!collapsed && (
            <span className="text-[14px] font-semibold tracking-tight text-slate-100">Reap Solutions</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 pt-5 pb-2">
          {/* Main */}
          {!collapsed && <SectionLabel>Main</SectionLabel>}
          <div className="space-y-0.5">
            {mainNav.map((item) => {
              const active = isActive(item.match)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors ${
                    active
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-500" />
                  )}
                  <item.icon className={`h-[16px] w-[16px] shrink-0 ${active ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>

          {/* Create */}
          <div className="mt-5">
            <div className="mx-2.5 mb-4 border-t border-white/[0.06]" />
            {!collapsed && <SectionLabel>Create</SectionLabel>}
            <div className="space-y-0.5">
              {createNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg px-2.5 py-[7px] text-[13px] text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                >
                  <item.icon className="h-[16px] w-[16px] shrink-0 text-slate-500 group-hover:text-slate-300" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom: user + collapse */}
        <div className="shrink-0 border-t border-white/[0.06]">
          {/* User */}
          <div className={`flex items-center gap-2.5 px-3 py-3 ${collapsed ? 'justify-center' : ''}`}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-slate-200">{user.name}</p>
                <p className="truncate text-[11px] text-slate-500">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Collapse toggle */}
          <div className="flex items-center justify-end border-t border-white/[0.04] px-3 py-2">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500/70">
      {children}
    </p>
  )
}
