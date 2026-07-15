'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { findStepTarget, type GuideStep } from '@/components/tour/guides'
import { TourSpotlight } from '@/components/tour/TourSpotlight'
import { TourStepCard } from '@/components/tour/TourStepCard'
import {
  computeTooltipPosition,
  padRect,
  TOOLTIP_WIDTH,
  type Rect,
  type TooltipPosition,
} from '@/components/tour/tourGeometry'

function measureTarget(step: GuideStep): Rect | null {
  const element = findStepTarget(step)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 && rect.height <= 0) return null

  return padRect({
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  })
}

export function GuidedTour({
  isOpen,
  step,
  guideTitle,
  stepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  isActionStep,
  onNext,
  onBack,
  onSkip,
}: {
  isOpen: boolean
  step: GuideStep
  guideTitle: string
  stepIndex: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  isActionStep: boolean
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [mounted] = useState(() => typeof document !== 'undefined')
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: 'center',
  })
  const [tooltipHeight, setTooltipHeight] = useState(260)
  const activeTargetRef = useRef<HTMLElement | null>(null)

  const isCentered = !step.target && !(step.fallbackTargets?.length ?? 0)
  const isWelcome = step.id === 'welcome' || step.id === 'finish'

  const updateGeometry = useCallback(() => {
    if (!isOpen) return

    const element = isCentered ? null : findStepTarget(step)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }

    window.requestAnimationFrame(() => {
      const rect = isCentered ? null : measureTarget(step)
      setTargetRect(rect)
      setTooltipPosition(
        computeTooltipPosition(rect, step.placement ?? 'auto', tooltipHeight, TOOLTIP_WIDTH),
      )
    })
  }, [isCentered, isOpen, step, tooltipHeight])

  const handleMeasure = useCallback(
    (height: number) => {
      if (height === tooltipHeight) return
      setTooltipHeight(height)
      setTooltipPosition(
        computeTooltipPosition(
          isCentered ? null : targetRect,
          step.placement ?? 'auto',
          height,
          TOOLTIP_WIDTH,
        ),
      )
    },
    [isCentered, step.placement, targetRect, tooltipHeight],
  )

  // Elevate active target for action steps
  useEffect(() => {
    if (!isOpen || !isActionStep) {
      if (activeTargetRef.current) {
        activeTargetRef.current.removeAttribute('data-tour-target-active')
        activeTargetRef.current = null
      }
      return
    }

    const element = findStepTarget(step)
    if (element) {
      element.setAttribute('data-tour-target-active', '')
      activeTargetRef.current = element
    }

    return () => {
      if (activeTargetRef.current) {
        activeTargetRef.current.removeAttribute('data-tour-target-active')
        activeTargetRef.current = null
      }
    }
  }, [isActionStep, isOpen, step])

  // Action step: advance on target click
  useEffect(() => {
    if (!isOpen || !isActionStep || step.advanceOn !== 'click') return

    const element = findStepTarget(step)
    if (!element) return

    const handleClick = () => {
      window.setTimeout(() => onNext(), 120)
    }

    element.addEventListener('click', handleClick, true)
    return () => element.removeEventListener('click', handleClick, true)
  }, [isActionStep, isOpen, onNext, step])

  useLayoutEffect(() => {
    if (!isOpen) return
    updateGeometry()
  }, [isOpen, step.id, updateGeometry])

  useEffect(() => {
    if (!isOpen) return

    const handleChange = () => updateGeometry()
    window.addEventListener('resize', handleChange)
    window.addEventListener('scroll', handleChange, true)

    return () => {
      window.removeEventListener('resize', handleChange)
      window.removeEventListener('scroll', handleChange, true)
    }
  }, [isOpen, updateGeometry])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSkip()
      if (!isActionStep) {
        if (event.key === 'Enter' && !event.shiftKey) onNext()
        if (event.key === 'ArrowRight') onNext()
        if (event.key === 'ArrowLeft' && !isFirstStep) onBack()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isActionStep, isFirstStep, isOpen, onBack, onNext, onSkip])

  if (!mounted || !isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <TourSpotlight
        rect={isCentered ? null : targetRect}
        isActionMode={isActionStep && !isCentered}
        onDismiss={isActionStep ? () => {} : onSkip}
      />

      <TourStepCard
        key={step.id}
        title={step.title}
        body={step.body}
        hint={step.hint}
        phase={step.phase}
        guideTitle={guideTitle}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isWelcome={isWelcome}
        isActionStep={isActionStep}
        placement={tooltipPosition.placement}
        targetRect={targetRect}
        position={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        onNext={onNext}
        onBack={onBack}
        onSkip={onSkip}
        onMeasure={handleMeasure}
      />
    </div>,
    document.body,
  )
}
