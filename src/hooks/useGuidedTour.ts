'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  DEFAULT_GUIDE_ID,
  firstAvailableStepIndex,
  getGuide,
  resolveStepIndex,
  type GuideStep,
} from '@/components/tour/guides'
import {
  readGuideCompleted,
  TOUR_ACTIVE_KEY,
  TOUR_GUIDE_KEY,
  TOUR_STEP_KEY,
  writeGuideCompleted,
} from '@/components/tour/tourStorage'

function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeSessionFlag(key: string, value: boolean) {
  try {
    if (value) sessionStorage.setItem(key, '1')
    else sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function readSessionStep(): number {
  try {
    const raw = sessionStorage.getItem(TOUR_STEP_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

function writeSessionStep(step: number) {
  try {
    sessionStorage.setItem(TOUR_STEP_KEY, String(step))
  } catch {
    // ignore
  }
}

function readSessionGuideId(): string {
  try {
    return sessionStorage.getItem(TOUR_GUIDE_KEY) ?? DEFAULT_GUIDE_ID
  } catch {
    return DEFAULT_GUIDE_ID
  }
}

function writeSessionGuideId(guideId: string) {
  try {
    sessionStorage.setItem(TOUR_GUIDE_KEY, guideId)
  } catch {
    // ignore
  }
}

function readInitialTourState(pathname: string): {
  isOpen: boolean
  stepIndex: number
  guideId: string
} {
  const active = readSessionFlag(TOUR_ACTIVE_KEY)
  const guideId = readSessionGuideId()
  const steps = getGuide(guideId)?.steps ?? []
  return {
    isOpen: active,
    guideId,
    stepIndex: active ? resolveStepIndex(steps, readSessionStep(), 1, pathname) : 0,
  }
}

export function useGuidedTour(userId?: string | null) {
  const pathname = usePathname()
  const initial = readInitialTourState(pathname)
  const [isOpen, setIsOpen] = useState(initial.isOpen)
  const [guideId, setGuideId] = useState(initial.guideId)
  const [stepIndex, setStepIndex] = useState(initial.stepIndex)
  const prevPathnameRef = useRef(pathname)

  const guide = getGuide(guideId)
  const steps = useMemo(() => guide?.steps ?? [], [guide])
  const currentStep: GuideStep = steps[stepIndex] ?? steps[steps.length - 1]
  const isFirstStep = stepIndex <= 0
  const isLastStep = stepIndex >= steps.length - 1
  const isActionStep = currentStep?.mode === 'action'

  const persistStep = useCallback((index: number) => {
    setStepIndex(index)
    writeSessionStep(index)
  }, [])

  const openGuide = useCallback(
    (nextGuideId: string, startAt?: number) => {
      const nextGuide = getGuide(nextGuideId)
      if (!nextGuide) return

      const index =
        startAt != null
          ? resolveStepIndex(nextGuide.steps, startAt, 1, pathname)
          : readSessionFlag(TOUR_ACTIVE_KEY) && readSessionGuideId() === nextGuideId
            ? resolveStepIndex(nextGuide.steps, readSessionStep(), 1, pathname)
            : firstAvailableStepIndex(nextGuide.steps, pathname)

      writeSessionFlag(TOUR_ACTIVE_KEY, true)
      writeSessionGuideId(nextGuideId)
      setGuideId(nextGuideId)
      persistStep(index)
      setIsOpen(true)
    },
    [pathname, persistStep],
  )

  /** @deprecated Use openGuide */
  const openTour = useCallback(
    (startAt?: number) => {
      openGuide(guideId || DEFAULT_GUIDE_ID, startAt)
    },
    [guideId, openGuide],
  )

  const closeTour = useCallback(
    (markCompleted: boolean) => {
      setIsOpen(false)
      writeSessionFlag(TOUR_ACTIVE_KEY, false)
      writeSessionStep(0)
      if (markCompleted) writeGuideCompleted(userId, guideId, true)
    },
    [guideId, userId],
  )

  const goNext = useCallback(() => {
    if (isLastStep) {
      closeTour(true)
      return
    }
    const nextIndex = resolveStepIndex(steps, stepIndex + 1, 1, pathname)
    persistStep(nextIndex)
  }, [closeTour, isLastStep, pathname, persistStep, stepIndex, steps])

  const goBack = useCallback(() => {
    if (isFirstStep) return
    const prevIndex = resolveStepIndex(steps, stepIndex - 1, -1, pathname)
    persistStep(prevIndex)
  }, [isFirstStep, pathname, persistStep, stepIndex, steps])

  const skipTour = useCallback(() => {
    closeTour(true)
  }, [closeTour])

  const restartGuide = useCallback(
    (nextGuideId?: string) => {
      const id = nextGuideId ?? guideId
      writeGuideCompleted(userId, id, false)
      openGuide(id, 0)
    },
    [guideId, openGuide, userId],
  )

  /** @deprecated Use restartGuide */
  const restartTour = useCallback(() => {
    restartGuide(guideId)
  }, [guideId, restartGuide])

  // Re-resolve step when route changes during an active tour.
  useEffect(() => {
    if (!isOpen || !readSessionFlag(TOUR_ACTIVE_KEY)) return

    const pathChanged = prevPathnameRef.current !== pathname
    prevPathnameRef.current = pathname

    const applyStep = (index: number) => {
      window.requestAnimationFrame(() => persistStep(index))
    }

    if (!pathChanged) {
      const resolved = resolveStepIndex(steps, stepIndex, 1, pathname)
      if (resolved !== stepIndex) applyStep(resolved)
      return
    }

    const step = steps[stepIndex]
    if (step?.mode === 'action' && step.advanceOn === 'navigate') {
      const nextIndex = resolveStepIndex(steps, stepIndex + 1, 1, pathname)
      if (nextIndex !== stepIndex) {
        applyStep(nextIndex)
        return
      }
    }

    const resolved = resolveStepIndex(steps, stepIndex, 1, pathname)
    if (resolved !== stepIndex) applyStep(resolved)
  }, [isOpen, pathname, persistStep, stepIndex, steps])

  const controls = useMemo(
    () => ({
      openGuide,
      openTour,
      restartGuide,
      restartTour,
      goNext,
      goBack,
      skipTour,
      closeTour,
    }),
    [closeTour, goBack, goNext, openGuide, openTour, restartGuide, restartTour, skipTour],
  )

  return {
    isOpen,
    guideId,
    guideTitle: guide?.title ?? 'Guide',
    stepIndex,
    currentStep,
    totalSteps: steps.length,
    isFirstStep,
    isLastStep,
    isActionStep,
    userId,
    isGuideCompleted: (id: string) => readGuideCompleted(userId, id),
    ...controls,
  }
}
