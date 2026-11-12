'use client'

import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { CommandPaletteProvider } from '@/components/ui/CommandPalette'
import { HelpProvider } from '@/components/help/HelpProvider'

export function DashboardProviders({
  children,
}: {
  children: ReactNode
  /** Kept for the callers; help state is per browser, so it is not needed now. */
  userId?: string | null
}) {
  return (
    <ToastProvider>
      <TooltipProvider>
        <CommandPaletteProvider>
          <HelpProvider>{children}</HelpProvider>
        </CommandPaletteProvider>
      </TooltipProvider>
    </ToastProvider>
  )
}
