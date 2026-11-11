'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { Tooltip } from '@/components/ui/Tooltip'
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
              className={`flex h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-sidebar md:h-10 ${
                active ? 'bg-sidebar-active text-on-sidebar hover:bg-sidebar-active-hover' : 'text-sidebar-ink hover:bg-sidebar-hover hover:text-on-sidebar'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
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
        <Link href="/start" onClick={onNavigate} data-tour="new-scorecard" className={buttonStyles({ variant: 'onTeal', className: 'w-full' })}>
          <Plus aria-hidden />
          Start new
        </Link>
      </div>
      <nav aria-label="Main" data-tour="sidebar-nav" className="flex-1 overflow-y-auto px-3 py-4">
        <NavList items={MAIN_NAV} pathname={pathname} onNavigate={onNavigate} />
        {showInternalAdminLink ? (
          <div className="mt-6">
            <p className="px-3 pb-2 text-caps font-semibold uppercase tracking-label text-sidebar-muted">REAP staff</p>
            <NavList items={ADMIN_NAV} pathname={pathname} onNavigate={onNavigate} />
          </div>
        ) : null}
      </nav>
      {/* The person, under a hairline. Name only: the email is in the account menu. */}
      <div className="flex items-center gap-3 border-t border-sidebar-line px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-active text-sm font-semibold text-on-sidebar">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-8 w-8 object-cover" referrerPolicy="no-referrer" />
          ) : (
            (String(user.name ?? '').trim() || '?').charAt(0).toUpperCase()
          )}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-on-sidebar" title={`${user.name} (${user.email})`}>
          {user.name}
        </p>
        <form action={signOutAction}>
          <Tooltip content="Sign out" side="top">
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-11 w-11 items-center justify-center rounded-control text-sidebar-ink transition-colors duration-150 hover:bg-sidebar-hover hover:text-on-sidebar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-sidebar md:h-9 md:w-9"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </Tooltip>
        </form>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <Link href="/dashboard" className="-mx-2 flex h-11 items-center gap-2.5 rounded-control px-2 transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-sidebar">
      <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
      <span className="text-sm font-semibold text-on-sidebar">REAP Scorecard</span>
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
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-line px-4">
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
          className="flex h-11 items-center gap-2 rounded-control px-3 text-sm font-medium text-on-sidebar transition-colors duration-150 hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden />
          Menu
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-scrim" onClick={() => setOpen(false)} />
          <div id="mobile-menu" className="relative ml-auto flex h-full w-[min(20rem,86vw)] flex-col bg-sidebar">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-line px-4">
              <span className="text-[15px] font-semibold text-on-sidebar">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 rounded-control px-2 py-1.5 text-on-sidebar hover:bg-sidebar-hover"
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
