import { ALL_GUIDES, getContextualGuides, type Guide } from '@/components/tour/guides'

export type HelpMenuItem = {
  guideId: string
  title: string
  description: string
  estimatedMinutes?: number
  section: 'always' | 'context'
}

const ALWAYS_GUIDES = ['first-time-setup', 'full-platform'] as const

export function buildHelpMenu(pathname: string): HelpMenuItem[] {
  const items: HelpMenuItem[] = []

  for (const id of ALWAYS_GUIDES) {
    const guide = ALL_GUIDES.find((g) => g.id === id)
    if (!guide) continue
    items.push({
      guideId: guide.id,
      title: guide.title,
      description: guide.description,
      estimatedMinutes: guide.estimatedMinutes,
      section: 'always',
    })
  }

  const contextual = getContextualGuides(pathname)
  for (const guide of contextual) {
    if (ALWAYS_GUIDES.includes(guide.id as (typeof ALWAYS_GUIDES)[number])) continue
    items.push({
      guideId: guide.id,
      title: guide.title,
      description: guide.description,
      estimatedMinutes: guide.estimatedMinutes,
      section: 'context',
    })
  }

  return items
}

export function getGuideById(guideId: string): Guide | undefined {
  return ALL_GUIDES.find((g) => g.id === guideId)
}
