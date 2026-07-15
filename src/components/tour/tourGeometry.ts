import type { TourPlacement } from '@/components/tour/tourSteps'

export type Rect = {
  top: number
  left: number
  width: number
  height: number
}

export type TooltipPosition = {
  top: number
  left: number
  placement: TourPlacement
}

export const TOOLTIP_WIDTH = 400
export const TOOLTIP_GAP = 18
export const SPOTLIGHT_PAD = 10
export const VIEWPORT_PADDING = 20

export function padRect(rect: Rect, pad = SPOTLIGHT_PAD): Rect {
  return {
    top: Math.max(VIEWPORT_PADDING / 2, rect.top - pad),
    left: Math.max(VIEWPORT_PADDING / 2, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }
}

export function computeTooltipPosition(
  rect: Rect | null,
  preferred: TourPlacement,
  tooltipHeight: number,
  tooltipWidth = TOOLTIP_WIDTH,
): TooltipPosition {
  if (!rect || preferred === 'center') {
    return {
      top: Math.max(VIEWPORT_PADDING, window.innerHeight / 2 - tooltipHeight / 2),
      left: Math.max(VIEWPORT_PADDING, window.innerWidth / 2 - tooltipWidth / 2),
      placement: 'center',
    }
  }

  const placements: TourPlacement[] =
    preferred === 'auto'
      ? ['bottom', 'top', 'right', 'left']
      : [preferred, 'bottom', 'top', 'right', 'left']

  for (const placement of placements) {
    let top = 0
    let left = 0

    if (placement === 'bottom') {
      top = rect.top + rect.height + TOOLTIP_GAP
      left = rect.left + rect.width / 2 - tooltipWidth / 2
    } else if (placement === 'top') {
      top = rect.top - tooltipHeight - TOOLTIP_GAP
      left = rect.left + rect.width / 2 - tooltipWidth / 2
    } else if (placement === 'right') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.left + rect.width + TOOLTIP_GAP
    } else if (placement === 'left') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.left - tooltipWidth - TOOLTIP_GAP
    }

    const fitsVertically =
      top >= VIEWPORT_PADDING && top + tooltipHeight <= window.innerHeight - VIEWPORT_PADDING
    const fitsHorizontally =
      left >= VIEWPORT_PADDING && left + tooltipWidth <= window.innerWidth - VIEWPORT_PADDING

    if (fitsVertically && fitsHorizontally) {
      return { top, left, placement }
    }
  }

  return {
    top: Math.max(VIEWPORT_PADDING, window.innerHeight / 2 - tooltipHeight / 2),
    left: Math.max(VIEWPORT_PADDING, window.innerWidth / 2 - tooltipWidth / 2),
    placement: 'center',
  }
}

export function arrowOffset(
  rect: Rect | null,
  cardTop: number,
  cardLeft: number,
  placement: TourPlacement,
  cardWidth = TOOLTIP_WIDTH,
): number | null {
  if (!rect || placement === 'center') return null

  if (placement === 'top' || placement === 'bottom') {
    const targetCenter = rect.left + rect.width / 2
    const offset = targetCenter - cardLeft
    return Math.min(Math.max(offset, 24), cardWidth - 24)
  }

  return null
}
