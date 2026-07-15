'use client'

import { useEffect, useRef } from 'react'
import { SETUP_GUIDE_ID } from '@/components/tour/guides'
import { useTour } from '@/components/tour/TourProvider'
import { readSetupGuideCompleted } from '@/components/tour/tourStorage'

/**
 * Starts the first-time setup guide automatically for new dashboard visitors.
 * Uses per-user per-guide localStorage so each new account gets the guide once.
 */
export function DashboardTourBootstrap({
  userId,
  isNewUser,
}: {
  userId?: string | null
  isNewUser: boolean
}) {
  const { openGuide, isOpen } = useTour()
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current || isOpen) return
    if (readSetupGuideCompleted(userId)) return

    startedRef.current = true
    const delay = isNewUser ? 450 : 900
    const timer = window.setTimeout(() => openGuide(SETUP_GUIDE_ID, 0), delay)
    return () => window.clearTimeout(timer)
  }, [isNewUser, isOpen, openGuide, userId])

  return null
}
