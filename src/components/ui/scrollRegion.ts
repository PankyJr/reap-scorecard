/**
 * A table wrapper that scrolls sideways must be reachable by keyboard
 * (axe: scrollable-region-focusable), or someone without a mouse cannot see
 * the columns off to the right. Spread these props on the wrapper and add
 * SCROLL_REGION_FOCUS to its classes.
 *
 * The focus ring is the app's usual one (as on buttons), drawn inside the
 * wrapper so a card with overflow-hidden around it cannot clip it.
 */
export const SCROLL_REGION_FOCUS =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-brand/30'

export function scrollRegionProps(label: string) {
  return {
    tabIndex: 0,
    role: 'region' as const,
    'aria-label': `${label}, scrolls sideways`,
  }
}
