/**
 * Page help data for Ownership, Management control and Skills development
 * (content/page-help-parts/areas-a.ts). Built only from what the page already
 * loaded: the engine's preview and the workspace view. No query, no maths.
 */
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { AREA_COPY, failedMinimum, type AreaKey } from '@/lib/scorecard/generic/ux/areas'
import type { AreaHelpData, AreaHelpGap } from '@/content/page-help'
import type { WorkspaceView } from './workspace'

/** A gap that is fixed in this area's own figures. */
export const figureGap = (name: string, hereHref: string): AreaHelpGap => ({ name, href: hereHref, label: 'Go to the figures' })

export function areaHelpData(args: {
  areaKey: AreaKey
  preview: GenericScorecardCalculation
  workspace: WorkspaceView
  hereHref: string
  gaps: AreaHelpGap[]
}): AreaHelpData {
  const row = args.workspace.rows.find((candidate) => candidate.key === args.areaKey)
  const seen = new Set<string>()
  const gaps = args.gaps.filter((gap) => (seen.has(gap.name) ? false : (seen.add(gap.name), true)))
  return {
    area: AREA_COPY[args.areaKey].label,
    status: row?.status ?? 'todo',
    gaps,
    belowMinimum: Boolean(failedMinimum(args.preview, args.areaKey)),
    next: args.workspace.next ? { label: args.workspace.next.label, href: args.workspace.next.href } : null,
    reviewHref: args.workspace.reviewHref,
    hereHref: args.hereHref,
  }
}
