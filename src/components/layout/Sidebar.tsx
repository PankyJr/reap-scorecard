'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Building2,
  ClipboardList,
  FileBarChart2,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'

export type SidebarUser = {
  name: string
  email: string
  avatarUrl?: string
}

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  /** Path prefixes that mean "you are in this section". */
  match: (pathname: string) => boolean
  tour?: string
}

/**
 * Five places, always in the same order. Scorecard pages live under
 * /scorecards/calculator and procurement pages under /procurement, so the
 * section is lit wherever you are inside it.
 */
const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home, match: (p) => p === '/dashboard' || p.startsWith('/dashboard/'), tour: 'nav-dashboard' },
  { href: '/companies', label: 'Companies', icon: Building2, match: (p) => p.startsWith('/companies'), tour: 'nav-companies' },
  {
    href: '/scorecards',
    label: 'Full scorecards',
    icon: FileBarChart2,
    match: (p) => p === '/scorecards' || p.startsWith('/scorecards/'),
    tour: 'nav-scorecards',
  },
  { href: '/procurement', label: 'Procurement', icon: ClipboardList, match: (p) => p.startsWith('/procurement'), tour: 'nav-procurement' },
  { href: '/settings/profile', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') && !p.startsWith('/settings/eap-targets') },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Admin console', icon: Shield, match: (p) => p.startsWith('/admin') },
  { href: '/settings/eap-targets', label: 'Workforce targets', icon: Users, match: (p) => p.startsWith('/settings/eap-targets') },
]

function NavList({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.match(pathname)
        const Icon = item.icon
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              data-tour={item.tour}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-[15px] transition-colors ${
                active ? 'bg-surface/12 font-semibold text-white' : 'text-sidebar-ink hover:bg-surface/8 hover:text-white'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-sidebar-muted'}`} aria-hidden />
              <span>{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function NavBody({
  pathname,
  showInternalAdminLink,
  user,
  signOutAction,
  onNavigate,
}: {
  pathname: string
  showInternalAdminLink: boolean
  user: SidebarUser
  signOutAction: () => void
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-4">
        <Link
          href="/start"
          onClick={onNavigate}
          data-tour="new-scorecard"
          className="flex w-full items-center justify-center gap-2 rounded-control bg-surface px-3 py-2.5 text-[15px] font-semibold text-brand hover:bg-brand-soft"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Start new
        </Link>
      </div>
      <nav aria-label="Main" data-tour="sidebar-nav" className="flex-1 overflow-y-auto px-3 py-4">
        <NavList items={MAIN_NAV} pathname={pathname} onNavigate={onNavigate} />
        {showInternalAdminLink ? (
          <div className="mt-6">
            <p className="px-3 pb-2 text-sm text-sidebar-muted">REAP staff</p>
            <NavList items={ADMIN_NAV} pathname={pathname} onNavigate={onNavigate} />
          </div>
        ) : null}
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface/15 text-sm font-semibold text-white">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-8 w-8 object-cover" referrerPolicy="no-referrer" />
          ) : (
            (String(user.name ?? '').trim() || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-[15px] text-sidebar-muted">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-control px-2 py-1.5 text-sm text-sidebar-ink hover:bg-surface/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
      <span className="text-[15px] font-semibold text-white">REAP Scorecard</span>
    </Link>
  )
}

export function Sidebar({
  user,
  signOutAction,
  showInternalAdminLink = false,
}: {
  user: SidebarUser
  signOutAction: () => void
  showInternalAdminLink?: boolean
}) {
  const pathname = usePathname() ?? ''
  return (
    <aside className="no-print hidden w-[248px] shrink-0 bg-sidebar md:sticky md:top-0 md:flex md:h-screen md:flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4">
        <Brand />
      </div>
      <NavBody pathname={pathname} showInternalAdminLink={showInternalAdminLink} user={user} signOutAction={signOutAction} />
    </aside>
  )
}

/** Phone and small-tablet navigation: a top bar with a menu that opens the same list. */
export function MobileNav({
  user,
  signOutAction,
  showInternalAdminLink = false,
}: {
  user: SidebarUser
  signOutAction: () => void
  showInternalAdminLink?: boolean
}) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="no-print md:hidden">
      <div className="flex h-14 items-center justify-between bg-sidebar px-4">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          data-tour="mobile-guide"
          className="flex items-center gap-2 rounded-control px-3 py-2 text-[15px] font-semibold text-white hover:bg-surface/10"
        >
          <Menu className="h-5 w-5" aria-hidden />
          Menu
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div id="mobile-menu" className="relative ml-auto flex h-full w-[min(20rem,86vw)] flex-col bg-sidebar">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <span className="text-[15px] font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 rounded-control px-2 py-1.5 text-white hover:bg-surface/10"
              >
                <X className="h-5 w-5" aria-hidden />
                Close
              </button>
            </div>
            <NavBody
              pathname={pathname}
              showInternalAdminLink={showInternalAdminLink}
              user={user}
              signOutAction={signOutAction}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
