'use client'

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactElement } from 'react'
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
  PanelLeftClose,
  PanelLeftOpen,
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
import { SIDEBAR_STORAGE_KEY as STORAGE_KEY } from './sidebar-boot'

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

/** The REAP mark: the teal logo (the black file used as a mask) in a white rounded square. */
function Mark({ size = 28 }: { size?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-[8px] bg-surface" style={{ width: size, height: size }}>
      <span
        className="inline-block bg-brand"
        style={{ width: size - 8, height: size - 8, WebkitMaskImage: 'url(/logo-black.png)', maskImage: 'url(/logo-black.png)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' } as CSSProperties}
      />
    </span>
  )
}

/*
 * Rail mode: 768-1023px always, and from 1024px when collapsed (the
 * sb-collapsed variant keys off data-sidebar="collapsed" on <html>).
 * Written out in full so Tailwind finds every class.
 */
const RAIL_HIDE = 'max-lg:md:sr-only lg:sb-collapsed:sr-only'
const RAIL_GONE = 'max-lg:md:hidden lg:sb-collapsed:hidden'
const RAIL_CENTER = 'max-lg:md:justify-center max-lg:md:px-0 lg:sb-collapsed:justify-center lg:sb-collapsed:px-0'
const RAIL_SQUARE = 'max-lg:md:w-10 lg:sb-collapsed:w-10'
const FOCUS = 'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-accent/50'


const NARROW = '(max-width: 1023px)'
const subscribeNarrow = (onChange: () => void) => {
  const mq = window.matchMedia(NARROW)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** Whether the desktop sidebar is collapsed, and whether tooltips should show (rail on screen). */
const RailContext = createContext<{ tips: boolean }>({ tips: false })

function NavLink({ item, active, rail, onNavigate }: { item: NavItem; active: boolean; rail: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  const { tips } = useContext(RailContext)
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-tour={item.tour}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-11 items-center gap-2.5 rounded-sm px-2.5 text-body font-medium transition-[background-color,color] duration-200 md:h-8',
        FOCUS,
        rail && cn(RAIL_CENTER, RAIL_SQUARE),
        active ? 'bg-sidebar-active text-on-sidebar hover:bg-sidebar-active-hover' : 'text-sidebar-ink hover:bg-sidebar-hover hover:text-on-sidebar',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-sidebar-accent' : 'text-sidebar-muted')} aria-hidden />
      <span className={cn('truncate', rail && RAIL_HIDE)}>{item.label}</span>
    </Link>
  )
  return rail && tips ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  )
}

function SectionLabel({ children, rail }: { children: string; rail: boolean }) {
  return <p className={cn('px-2.5 pb-1 pt-5 text-caps font-medium text-sidebar-label', rail && RAIL_HIDE)}>{children}</p>
}

function NavBody({
  pathname,
  showInternalAdminLink,
  user,
  signOutAction,
  onNavigate,
  rail,
  collapsed = false,
  onToggle,
}: {
  pathname: string
  showInternalAdminLink: boolean
  user: SidebarUser
  signOutAction: () => void
  onNavigate?: () => void
  rail: boolean
  collapsed?: boolean
  onToggle?: () => void
}) {
  const palette = useCommandPalette()
  const mac = useBrowserValue(() => /Mac|iPhone|iPad/.test(navigator.userAgent), true)
  const initial = (String(user.name ?? '').trim() || '?').charAt(0).toUpperCase()
  const { tips } = useContext(RailContext)
  const tip = (label: string, node: ReactElement) =>
    rail && tips ? (
      <Tooltip content={label} side="right">
        {node}
      </Tooltip>
    ) : (
      node
    )
  return (
    <div className="flex h-full flex-col px-3 pb-3">
      {/* Logo, and the collapse toggle (from 1024px; ⌘\ too). In the rail they stack. */}
      <div className={cn('flex h-14 items-center justify-between gap-2', rail && 'lg:sb-collapsed:h-auto lg:sb-collapsed:flex-col lg:sb-collapsed:justify-center lg:sb-collapsed:gap-1 lg:sb-collapsed:py-3')}>
        <Link href="/dashboard" onClick={onNavigate} aria-label="REAP home" className={cn('flex h-11 min-w-0 items-center gap-2 rounded-sm px-1.5 transition-opacity duration-200 hover:opacity-80', FOCUS, rail && RAIL_CENTER)}>
          <Mark />
          <span className={cn('text-[15px] font-semibold tracking-[-0.01em] text-on-sidebar', rail && RAIL_HIDE)}>REAP</span>
        </Link>
        {onToggle
          ? tip(
              collapsed ? 'Expand sidebar (⌘\\)' : 'Collapse sidebar (⌘\\)',
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-keyshortcuts="Meta+Backslash Control+Backslash"
                className={cn('hidden h-8 w-8 shrink-0 items-center justify-center rounded-sm text-sidebar-muted transition-colors duration-200 hover:bg-sidebar-hover hover:text-on-sidebar lg:flex', FOCUS)}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden /> : <PanelLeftClose className="h-4 w-4" aria-hidden />}
              </button>,
            )
          : null}
      </div>

      {/* Search (⌘K) */}
      {palette ? tip(
        'Search (⌘K)',
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            palette.open()
          }}
          aria-label="Search or jump to a page"
          className={cn(
            'mt-1 flex h-11 w-full items-center gap-2 rounded-sm bg-sidebar-search px-2.5 text-body text-sidebar-search-ink transition-colors duration-200 hover:bg-sidebar-active md:h-8',
            FOCUS,
            rail && cn(RAIL_CENTER, RAIL_SQUARE),
          )}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn('flex-1 text-left', rail && RAIL_HIDE)}>Search</span>
          <kbd className={cn('text-caps', rail && RAIL_GONE)}>{mac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>,
      ) : null}

      {/* Start new */}
      {tip(
        'Start new',
        <Link
          href="/start"
          onClick={onNavigate}
          data-tour="new-scorecard"
          className={cn(
            'mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-control bg-surface text-body font-semibold text-brand transition-[background-color,transform] duration-200 hover:bg-brand-soft active:scale-[0.98] md:h-9',
            FOCUS,
            rail && RAIL_SQUARE,
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className={cn(rail && RAIL_HIDE)}>Start new</span>
        </Link>,
      )}

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
            'flex h-12 w-full items-center gap-2.5 rounded-sm px-2 text-left transition-colors duration-200 hover:bg-sidebar-hover data-[state=open]:bg-sidebar-hover',
            FOCUS,
            rail && RAIL_CENTER,
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-caps font-semibold text-brand">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-7 w-7 object-cover" referrerPolicy="no-referrer" />
            ) : (
              initial
            )}
          </span>
          <span className={cn('min-w-0 flex-1', rail && RAIL_HIDE)}>
            <span className="block truncate text-meta font-medium text-on-sidebar">{user.name}</span>
            <span className="block truncate text-caps text-sidebar-muted">{user.email}</span>
          </span>
          <ChevronsUpDown className={cn('h-4 w-4 shrink-0 text-sidebar-muted', rail && RAIL_GONE)} aria-hidden />
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
 * The sidebar: white type on the REAP teal frame, 248px. From 1024px it
 * collapses to a 64px icon rail (the toggle by the logo, or ⌘\ / Ctrl+\),
 * remembered in this browser. 768-1023px: always the rail. Below 768px:
 * hidden; MobileNav opens it as a drawer.
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
  // AppShell's inline script has already put the remembered state on <html> before paint.
  const remembered = useBrowserValue(() => document.documentElement.dataset.sidebar === 'collapsed', false)
  const [chosen, setChosen] = useState<boolean | null>(null)
  const collapsed = chosen ?? remembered
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false)

  const toggle = useCallback(() => {
    const next = document.documentElement.dataset.sidebar !== 'collapsed'
    if (next) document.documentElement.dataset.sidebar = 'collapsed'
    else delete document.documentElement.dataset.sidebar
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'open')
    } catch {
      // Private mode or blocked storage: the choice lasts until reload.
    }
    setChosen(next)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toggle])

  return (
    <RailContext.Provider value={{ tips: collapsed || narrow }}>
      <aside
        className="no-print hidden shrink-0 bg-sidebar transition-[width] duration-200 ease-[cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none md:sticky md:top-0 md:flex md:h-screen md:w-16 md:flex-col lg:w-[248px] lg:sb-collapsed:w-16"
        aria-label="Sidebar"
      >
        <NavBody pathname={pathname} showInternalAdminLink={showInternalAdminLink} user={user} signOutAction={signOutAction} rail collapsed={collapsed} onToggle={toggle} />
      </aside>
    </RailContext.Provider>
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
        <Link href="/dashboard" className={cn('-ml-1 flex h-11 items-center gap-2 rounded-sm px-1 transition-opacity duration-200 hover:opacity-80', FOCUS)}>
          <Mark />
          <span className="text-[15px] font-semibold text-on-sidebar">REAP</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          data-tour="mobile-guide"
          aria-label="Open the menu"
          className={cn('flex h-11 w-11 items-center justify-center rounded-control text-on-sidebar transition-colors duration-200 hover:bg-sidebar-hover', FOCUS)}
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
              className={cn('absolute right-2 top-1.5 z-10 flex h-11 w-11 items-center justify-center rounded-control text-on-sidebar hover:bg-sidebar-hover', FOCUS)}
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
