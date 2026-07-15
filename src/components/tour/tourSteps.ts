/** Re-exports for backward compatibility — use `@/components/tour/guides` for new code. */
export {
  DEFAULT_GUIDE_ID,
  findStepTarget,
  findTourTarget,
  firstAvailableStepIndex,
  fullPlatformGuide,
  getGuide,
  getGuideSteps,
  resolveStepIndex,
  SETUP_GUIDE_ID,
  stepHasTarget,
  stepMatchesPath,
  type Guide,
  type GuideStep,
  type TourPlacement,
  type TourStep,
} from '@/components/tour/guides'

export {
  TOUR_ACTIVE_KEY,
  TOUR_COMPLETED_KEY,
  TOUR_GUIDE_KEY,
  TOUR_STEP_KEY,
} from '@/components/tour/tourStorage'

// Legacy: single tourSteps array from full-platform guide
import { fullPlatformGuide } from '@/components/tour/guides/fullPlatform'
export const tourSteps = fullPlatformGuide.steps
