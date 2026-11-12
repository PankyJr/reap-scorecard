'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  ChevronsUpDown,
  ClipboardList,
  FileBarChart2,
  Home,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { useCommandPalette } from '@/components/ui/CommandPalette'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/DropdownMenu'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/components/ui/cn'
import { useBrowserValue } from '@/components/ui/useMounted'

export type SidebarUser = {
  name: string
  email: string
  avatarUrl?: string
}

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  match: (pathname: string) => boolean
  tour?: string
}

/** The same places, in the same order, as before. */
const WORKSPACE_NAV: NavItem[] = [
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
]

const ACCOUNT_NAV: NavItem[] = [
  { href: '/settings/profile', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') && !p.startsWith('/settings/eap-targets') },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Admin console', icon: Shield, match: (p) => p.startsWith('/admin') },
  { href: '/settings/eap-targets', label: 'Workforce targets', icon: Users, match: (p) => p.startsWith('/settings/eap-targets') },
]

/** The REAP mark in teal: the black logo used as a mask over the brand colour. */
function Mark({ size = 24 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 bg-brand"
      style={{ width: size, height: size, WebkitMaskImage: 'url(/logo-black.png)', maskImage: 'url(/logo-black.png)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' } as CSSProperties}
    />
  )
}

function NavLink({ item, active, rail, onNavigate }: { item: NavItem; active: boolean; rail: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-tour={item.tour}
      aria-current={active ? 'page' : undefined}
      aria-label={rail ? item.label : undefined}
      className={cn(
        'flex h-11 items-center gap-2.5 rounded-sm px-2.5 text-body font-medium transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 md:h-8',
        rail && 'lg:justify-start max-lg:md:w-10 max-lg:md:justify-center max-lg:md:px-0',
        active ? 'bg-sidebar-active text-on-sidebar shadow-pill' : 'text-sidebar-ink hover:bg-sidebar-hover',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-teal' : 'text-icon')} aria-hidden />
      <span className={cn('truncate', rail && 'max-lg:md:sr-only')}>{item.label}</span>
    </Link>
  )
  return rail ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  )
}

function SectionLabel({ children, rail }: { children: string; rail: boolean }) {
  return <p className={cn('px-2.5 pb-1 pt-5 text-caps font-medium text-subtle', rail && 'max-lg:md:sr-only')}>{children}</p>
}

function NavBody({
  pathname,
  showInternalAdminLink,
  user,
  signOutAction,
  onNavigate,
  rail,
}: {
  pathname: string
  showInternalAdminLink: boolean
  user: SidebarUser
  signOutAction: () => void
  onNavigate?: () => void
  rail: boolean
}) {
  const palette = useCommandPalette()
  const mac = useBrowserValue(() => /Mac|iPhone|iPad/.test(navigator.userAgent), true)
  const initial = (String(user.name ?? '').trim() || '?').charAt(0).toUpperCase()
  return (
    <div className="flex h-full flex-col px-3 pb-3">
      {/* Logo */}
      <Link href="/dashboard" onClick={onNavigate} className={cn('flex h-14 items-center gap-2 rounded-sm px-2.5 transition-opacity duration-200 hover:opacity-75 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25', rail && 'max-lg:md:justify-center max-lg:md:px-0')}>
        <Mark />
        <span className={cn('text-body font-semibold tracking-[-0.01em] text-ink', rail && 'max-lg:md:sr-only')}>REAP</span>
      </Link>

      {/* Search (⌘K) */}
      {palette ? (
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            palette.open()
          }}
          aria-label="Search or jump to a page"
          className={cn(
            'mt-1 flex h-11 w-full items-center gap-2 rounded-sm bg-line px-2.5 text-body text-subtle transition-colors duration-200 hover:bg-line-strong/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 md:h-8',
            rail && 'max-lg:md:w-10 max-lg:md:justify-center max-lg:md:px-0',
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-icon" aria-hidden />
          <span className={cn('flex-1 text-left', rail && 'max-lg:md:sr-only')}>Search</span>
          <kbd className={cn('text-caps text-subtle', rail && 'max-lg:md:hidden')}>{mac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
      ) : null}

      {/* Start new */}
      <Link
        href="/start"
        onClick={onNavigate}
        data-tour="new-scorecard"
        aria-label={rail ? 'Start new' : undefined}
        className={cn(
          'mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-control border border-control-line bg-surface text-body font-medium text-ink transition-[background-color,border-color,transform] duration-200 hover:border-line-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 md:h-9',
          rail && 'max-lg:md:w-10',
        )}
      >
        <Plus className="h-4 w-4" aria-hidden />
        <span className={cn(rail && 'max-lg:md:sr-only')}>Start new</span>
      </Link>

      <nav aria-label="Main" data-tour="sidebar-nav" className="mt-2 flex-1 overflow-y-auto">
        <SectionLabel rail={rail}>Workspace</SectionLabel>
        <ul className="space-y-0.5">
          {WORKSPACE_NAV.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={item.match(pathname)} rail={rail} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <SectionLabel rail={rail}>Account</SectionLabel>
        <ul className="space-y-0.5">
          {ACCOUNT_NAV.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={item.match(pathname)} rail={rail} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        {showInternalAdminLink ? (
          <>
            <SectionLabel rail={rail}>REAP staff</SectionLabel>
            <ul className="space-y-0.5">
              {ADMIN_NAV.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={item.match(pathname)} rail={rail} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </nav>

      {/* The person: avatar, name, email, a menu with Settings and Sign out. */}
      <Menu>
        <MenuTrigger
          aria-label={`Account menu for ${user.name}`}
          className={cn(
            'flex h-12 w-full items-center gap-2.5 rounded-sm px-2 text-left transition-colors duration-200 hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 data-[state=open]:bg-sidebar-hover',
            rail && 'max-lg:md:justify-center max-lg:md:px-0',
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-caps font-semibold text-brand-ink">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-7 w-7 object-cover" referrerPolicy="no-referrer" />
            ) : (
              initial
            )}
          </span>
          <span className={cn('min-w-0 flex-1', rail && 'max-lg:md:sr-only')}>
            <span className="block truncate text-meta font-medium text-ink">{user.name}</span>
            <span className="block truncate text-caps text-subtle">{user.email}</span>
          </span>
          <ChevronsUpDown className={cn('h-4 w-4 shrink-0 text-icon', rail && 'max-lg:md:hidden')} aria-hidden />
        </MenuTrigger>
        <MenuContent align="start">
          <MenuItem asChild>
            <Link href="/settings/profile" onClick={onNavigate}>
              <Settings aria-hidden />
              Settings
            </Link>
          </MenuItem>
          <MenuSeparator />
          <form action={signOutAction}>
            <MenuItem asChild>
              <button type="submit">
                <LogOut aria-hidden />
                Sign out
              </button>
            </MenuItem>
          </form>
        </MenuContent>
      </Menu>
    </div>
  )
}

/**
 * The sidebar (Halal Lab + Ace Design): on the grey canvas, 248px, no border.
 * 768-1023px: an icons-only rail. Below 768px: hidden; MobileNav opens it as
 * an off-canvas drawer.
 */
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
    <aside className="no-print hidden shrink-0 md:sticky md:top-0 md:flex md:h-screen md:w-16 md:flex-col lg:w-[248px]">
      <NavBody pathname={pathname} showInternalAdminLink={showInternalAdminLink} user={user} signOutAction={signOutAction} rail />
    </aside>
  )
}

/** Below 768px: a slim bar on the canvas with the mark and a menu button; the menu is the sidebar as a drawer. */
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
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" className="-ml-1 flex h-11 items-center gap-2 rounded-sm px-1 transition-opacity duration-200 hover:opacity-75 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25">
          <Mark />
          <span className="text-body font-semibold text-ink">REAP</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          data-tour="mobile-guide"
          aria-label="Open the menu"
          className="flex h-11 w-11 items-center justify-center rounded-control text-nav-ink transition-colors duration-200 hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
        >
          <MenuIcon className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="reap-fade-in absolute inset-0 bg-scrim" onClick={() => setOpen(false)} />
          <div id="mobile-menu" className="reap-pop-in relative flex h-full w-[min(18rem,86vw)] flex-col bg-sidebar">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-1.5 z-10 flex h-11 w-11 items-center justify-center rounded-control text-nav-ink hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <NavBody
              pathname={pathname}
              showInternalAdminLink={showInternalAdminLink}
              user={user}
              signOutAction={signOutAction}
              onNavigate={() => setOpen(false)}
              rail={false}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
