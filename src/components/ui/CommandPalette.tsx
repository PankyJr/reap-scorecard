'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Dialog as D } from 'radix-ui'
import {
  Activity,
  Building2,
  ClipboardList,
  FileBarChart2,
  HelpCircle,
  Home,
  Plus,
  Search,
  Settings,
  Upload,
  User,
} from 'lucide-react'
import { useBrowserValue } from './useMounted'

/**
 * Cmd+K (Ctrl+K on Windows): jump to any page or start any task. Only routes
 * that already exist. Esc closes, arrows move, Enter goes.
 */
type Item = { label: string; href?: string; icon: typeof Home; keywords?: string[]; run?: () => void }

const GO: Item[] = [
  { label: 'Home', href: '/dashboard', icon: Home, keywords: ['dashboard'] },
  { label: 'Companies', href: '/companies', icon: Building2 },
  { label: 'Full scorecards', href: '/scorecards', icon: FileBarChart2, keywords: ['assessments'] },
  { label: 'Procurement', href: '/procurement', icon: ClipboardList },
  { label: 'All activity', href: '/dashboard/activity', icon: Activity, keywords: ['reports', 'history'] },
  { label: 'Profile', href: '/settings/profile', icon: User },
  { label: 'Settings', href: '/settings/account', icon: Settings, keywords: ['account'] },
  { label: 'Help', href: '/settings/help', icon: HelpCircle, keywords: ['support'] },
]

const START: Item[] = [
  { label: 'Start new', href: '/start', icon: Plus, keywords: ['new', 'scorecard', 'assessment'] },
  { label: 'Add a company', href: '/companies/new', icon: Building2, keywords: ['new company'] },
  { label: 'Upload a workbook', href: '/start?type=full', icon: Upload, keywords: ['import', 'excel'] },
  { label: 'New procurement scorecard', href: '/procurement/assessments/new', icon: ClipboardList },
]

const PaletteContext = createContext<{ open: () => void } | null>(null)

export function useCommandPalette() {
  return useContext(PaletteContext)
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const go = useCallback(
    (item: Item) => {
      setOpen(false)
      if (item.run) item.run()
      else if (item.href) router.push(item.href)
    },
    [router],
  )

  const value = useMemo(() => ({ open: () => setOpen(true) }), [])

  return (
    <PaletteContext.Provider value={value}>
      {children}
      <D.Root open={open} onOpenChange={setOpen}>
        <D.Portal>
          <D.Overlay className="reap-fade-in fixed inset-0 z-50 bg-scrim" />
          <D.Content className="reap-pop-in fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-card border border-line bg-raised shadow-pop focus:outline-none">
            <D.Title className="sr-only">Go to a page or start a task</D.Title>
            <D.Description className="sr-only">Type to filter. Arrow keys to move, Enter to go, Escape to close.</D.Description>
            <Command label="Go to a page or start a task" loop>
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="h-4 w-4 shrink-0 text-label" aria-hidden />
                <Command.Input
                  autoFocus
                  placeholder="Go to a page or start a task…"
                  className="h-14 w-full bg-transparent text-base text-ink placeholder:text-subtle focus:outline-none"
                />
                <kbd className="hidden shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-xs text-label sm:inline">Esc</kbd>
              </div>
              <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-label">Nothing matches. Try “companies” or “upload”.</Command.Empty>
                {[
                  { heading: 'Go to', items: GO },
                  { heading: 'Start', items: START },
                ].map((group) => (
                  <Command.Group
                    key={group.heading}
                    heading={group.heading}
                    className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-label [&_[cmdk-group-heading]]:text-label"
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <Command.Item
                          key={item.label}
                          value={item.label}
                          keywords={item.keywords}
                          onSelect={() => go(item)}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2.5 text-sm font-medium text-ink data-[selected=true]:bg-sunken"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-label" aria-hidden />
                          {item.label}
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </D.Content>
        </D.Portal>
      </D.Root>
    </PaletteContext.Provider>
  )
}

/** The header's search field look-alike: opens the palette. */
export function CommandPaletteButton() {
  const palette = useCommandPalette()
  const mac = useBrowserValue(() => /Mac|iPhone|iPad/.test(navigator.userAgent), true)
  if (!palette) return null
  return (
    <button
      type="button"
      onClick={palette.open}
      className="flex h-10 w-64 items-center gap-2.5 rounded-control border border-line bg-surface px-3 text-sm text-subtle shadow-card transition-colors duration-150 hover:border-line-strong hover:text-label focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 text-left">Search or jump to…</span>
      <kbd className="rounded-sm border border-line px-1.5 text-xs text-label">{mac ? '⌘K' : 'Ctrl K'}</kbd>
    </button>
  )
}
