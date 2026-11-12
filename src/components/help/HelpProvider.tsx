'use client'

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { readActiveTour, writeActiveTour } from './help-storage'
import { helpStore } from './help-store'
import { PageHelpPanel } from './PageHelpPanel'
import { TourRunner } from './TourRunner'

type HelpApi = {
  openPanel: (problem?: string | null) => void
  closePanel: () => void
  /** A multi-page tour id, or "page:<key>" for one page's tour (path = where it runs). */
  startTour: (id: string, path?: string) => void
}

const HelpContext = createContext<HelpApi | null>(null)

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/**
 * Page help for the signed-in app: the "?" panel (per page, from
 * content/page-help.ts), the tours, and the "?" keyboard shortcut.
 */
export function HelpProvider({ children }: { children: ReactNode }) {
  const api = useMemo<HelpApi>(
    () => ({
      openPanel: (problem) => helpStore.openPanel(problem ?? null),
      closePanel: () => helpStore.closePanel(),
      startTour: (id, path) => {
        helpStore.closePanel()
        writeActiveTour({ id, index: 0, path })
      },
    }),
    [],
  )

  // "?" opens help for this page (not while typing, and not during a tour).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (readActiveTour()) return
      e.preventDefault()
      helpStore.togglePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <HelpContext.Provider value={api}>
      {children}
      <PageHelpPanel />
      <TourRunner />
    </HelpContext.Provider>
  )
}

export function useHelpOptional() {
  return useContext(HelpContext)
}

export function useHelp() {
  const ctx = useContext(HelpContext)
  if (!ctx) throw new Error('useHelp must be used inside HelpProvider')
  return ctx
}
