import type { ProgressStep } from '@/components/ui/ProgressSteps'

/**
 * The two journeys use the same words for the same moments: both begin with
 * "Start" and end with "See result". Procurement is shorter because it is one
 * element of the full scorecard.
 */
export const FULL_SCORECARD_STEPS = ['Start', 'Upload workbook', 'Check imported data', 'Complete the elements', 'See result'] as const
export const PROCUREMENT_STEPS = ['Start', 'Total spend', 'Suppliers', 'See result'] as const

export type FlowKind = 'full' | 'procurement'

/**
 * `unfinished` lists earlier steps that are passed but not actually finished
 * (you can open the result before every element is complete); they stay "to do".
 */
export function stepsFor(
  kind: FlowKind,
  currentIndex: number,
  hrefs: Partial<Record<number, string>> = {},
  unfinished: number[] = [],
): ProgressStep[] {
  const labels = kind === 'full' ? FULL_SCORECARD_STEPS : PROCUREMENT_STEPS
  return labels.map((label, index) => ({
    label,
    href: hrefs[index],
    state:
      index === currentIndex ? 'current' : index < currentIndex && !unfinished.includes(index) ? 'done' : 'todo',
  }))
}

/** Only same-site relative paths may be used as a "come back here" target. */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return null
  return v
}
