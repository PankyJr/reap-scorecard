'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Light, dark or system (the default), chosen in the user menu and remembered
 * in this browser.
 *
 * Only the signed-in app follows the choice. The public website, sign-in and
 * every printable report stay light: they are not yet built on the design
 * tokens, and a report must print the same whatever the screen looked like.
 */
const APP_PREFIXES = ['/dashboard', '/companies', '/procurement', '/scorecard', '/scorecards', '/settings', '/start']

export function themedPath(pathname: string): boolean {
  if (/\/report(\/|$)/.test(pathname)) return false
  return APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="reap-theme"
      forcedTheme={themedPath(pathname) ? undefined : 'light'}
    >
      {children}
    </NextThemesProvider>
  )
}
