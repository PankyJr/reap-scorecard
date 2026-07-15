import { companiesGuide } from './companies'
import { exportPdfGuide } from './exportPdf'
import { firstTimeSetupGuide } from './firstTimeSetup'
import { fullPlatformGuide } from './fullPlatform'
import { procurementGuide } from './procurement'
import type { Guide, GuideStep } from './types'
import { workbookUploadGuide } from './workbookUpload'

export { companiesGuide } from './companies'
export { exportPdfGuide } from './exportPdf'
export { firstTimeSetupGuide } from './firstTimeSetup'
export { fullPlatformGuide } from './fullPlatform'
export { procurementGuide } from './procurement'
export { workbookUploadGuide } from './workbookUpload'

export type { Guide, GuideStep, TourPlacement, TourStep } from './types'

export const GUIDE_REGISTRY: Record<string, Guide> = {
  [firstTimeSetupGuide.id]: firstTimeSetupGuide,
  [fullPlatformGuide.id]: fullPlatformGuide,
  [companiesGuide.id]: companiesGuide,
  [procurementGuide.id]: procurementGuide,
  [workbookUploadGuide.id]: workbookUploadGuide,
  [exportPdfGuide.id]: exportPdfGuide,
}

export const ALL_GUIDES: Guide[] = Object.values(GUIDE_REGISTRY)

export const DEFAULT_GUIDE_ID = fullPlatformGuide.id
export const SETUP_GUIDE_ID = firstTimeSetupGuide.id

export function getGuide(guideId: string): Guide | undefined {
  return GUIDE_REGISTRY[guideId]
}

export function getGuideSteps(guideId: string): GuideStep[] {
  return GUIDE_REGISTRY[guideId]?.steps ?? []
}

/** Guides whose routePrefixes match the current pathname (longest prefix wins). */
export function getContextualGuides(pathname: string): Guide[] {
  const matches: { guide: Guide; prefixLen: number }[] = []

  for (const guide of ALL_GUIDES) {
    if (guide.id === 'full-platform' || guide.id === 'first-time-setup') continue
    for (const prefix of guide.routePrefixes ?? []) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        matches.push({ guide, prefixLen: prefix.length })
      }
    }
  }

  matches.sort((a, b) => b.prefixLen - a.prefixLen)

  const seen = new Set<string>()
  const result: Guide[] = []
  for (const { guide } of matches) {
    if (seen.has(guide.id)) continue
    seen.add(guide.id)
    result.push(guide)
  }
  return result
}

export function findTourTarget(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const nodes = document.querySelectorAll<HTMLElement>(
    `[data-tour="${selector}"], [data-tour~="${selector}"]`,
  )
  for (const node of nodes) {
    const style = window.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    const rect = node.getBoundingClientRect()
    if (rect.width <= 0 && rect.height <= 0) continue
    return node
  }
  return null
}

export function findStepTarget(step: GuideStep): HTMLElement | null {
  if (step.target) {
    const primary = findTourTarget(step.target)
    if (primary) return primary
  }
  for (const fallback of step.fallbackTargets ?? []) {
    const match = findTourTarget(fallback)
    if (match) return match
  }
  return null
}

export function stepHasTarget(step: GuideStep): boolean {
  if (!step.target && !(step.fallbackTargets?.length ?? 0)) return true
  return findStepTarget(step) != null
}

export function stepMatchesPath(step: GuideStep, pathname: string): boolean {
  if (!step.requiredPath) return true
  return pathname === step.requiredPath || pathname.startsWith(`${step.requiredPath}/`)
}

export function resolveStepIndex(
  steps: GuideStep[],
  startIndex: number,
  direction: 1 | -1,
  pathname: string,
): number {
  const total = steps.length
  let index = startIndex

  while (index >= 0 && index < total) {
    const step = steps[index]
    if (!stepMatchesPath(step, pathname)) {
      index += direction
      continue
    }
    if (!step.target && !(step.fallbackTargets?.length ?? 0)) return index
    if (stepHasTarget(step)) return index
    index += direction
  }

  return direction === 1 ? total - 1 : 0
}

export function firstAvailableStepIndex(steps: GuideStep[], pathname: string): number {
  return resolveStepIndex(steps, 0, 1, pathname)
}
