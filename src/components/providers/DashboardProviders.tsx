'use client'

import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { CommandPaletteProvider } from '@/components/ui/CommandPalette'
import { TourProvider } from '@/components/tour/TourProvider'

export function DashboardProviders({
  children,
  userId,
}: {
  children: ReactNode
  userId?: string | null
}) {
  return (
    <ToastProvider>
      <TooltipProvider>
        <CommandPaletteProvider>
          <TourProvider userId={userId}>{children}</TourProvider>
        </CommandPaletteProvider>
      </TooltipProvider>
    </ToastProvider>
  )
}
