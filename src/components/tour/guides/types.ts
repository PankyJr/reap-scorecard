export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'center'

export type GuideStep = {
  id: string
  title: string
  body: string
  hint?: string
  phase?: string
  /** Matches `data-tour` on a DOM element. Omit for centered modal steps. */
  target?: string
  fallbackTargets?: string[]
  placement?: TourPlacement
  /** info = Next button; action = must click highlighted target */
  mode: 'info' | 'action'
  /** click = advance when target is clicked; navigate = advance after route change */
  advanceOn?: 'click' | 'navigate'
  /** Only show this step when pathname starts with this prefix */
  requiredPath?: string
}

export type Guide = {
  id: string
  title: string
  description: string
  steps: GuideStep[]
  /** Route prefixes used for contextual help menu matching */
  routePrefixes?: string[]
  estimatedMinutes?: number
}

/** @deprecated Use GuideStep — kept for gradual migration */
export type TourStep = GuideStep
