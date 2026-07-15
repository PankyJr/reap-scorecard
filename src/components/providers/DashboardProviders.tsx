'use client'

import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
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
      <TourProvider userId={userId}>{children}</TourProvider>
    </ToastProvider>
  )
}
