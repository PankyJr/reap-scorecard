'use client'

import { Tooltip } from '@/components/ui/Tooltip'

/**
 * Compact demo-environment indicator for local client demos.
 * Replaces the large amber auth-bypass banner during workspace demos.
 */
export function DashboardDemoEnvironmentChip({
  title = 'Demo environment',
  detail = 'Authentication bypass is enabled for local demonstration.',
}: {
  title?: string
  detail?: string
}) {
  return (
    <Tooltip content={detail} side="bottom">
      <span
        className="inline-flex min-h-11 items-center gap-2 sm:min-h-8 rounded-full border border-line bg-surface px-3 text-caps font-medium text-ink shadow-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30"
        data-testid="dashboard-demo-environment-chip"
        tabIndex={0}
        aria-label={`${title}. ${detail}`}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
        {title}
      </span>
    </Tooltip>
  )
}
