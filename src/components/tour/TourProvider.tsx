'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { GuidedTour } from '@/components/tour/GuidedTour'
import { useGuidedTour } from '@/hooks/useGuidedTour'

type TourContextValue = ReturnType<typeof useGuidedTour>

const TourContext = createContext<TourContextValue | null>(null)

export function TourProvider({
  children,
  userId,
}: {
  children: ReactNode
  userId?: string | null
}) {
  const tour = useGuidedTour(userId)

  return (
    <TourContext.Provider value={tour}>
      {children}
      <GuidedTour
        isOpen={tour.isOpen}
        step={tour.currentStep}
        guideTitle={tour.guideTitle}
        stepIndex={tour.stepIndex}
        totalSteps={tour.totalSteps}
        isFirstStep={tour.isFirstStep}
        isLastStep={tour.isLastStep}
        isActionStep={tour.isActionStep}
        onNext={tour.goNext}
        onBack={tour.goBack}
        onSkip={tour.skipTour}
      />
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within TourProvider')
  }
  return context
}
