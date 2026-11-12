'use client'

import { Tooltip } from '@/components/ui/Tooltip'

/**
 * Compact demo-environment indicator for local client demos: the neutral capsule.
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
        className="inline-flex h-[22px] items-center rounded-full bg-neutral-soft px-2 text-caps font-medium text-neutral transition-colors duration-200 hover:bg-segment focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
        data-testid="dashboard-demo-environment-chip"
        tabIndex={0}
        aria-label={`${title}. ${detail}`}
      >
        {title}
      </span>
    </Tooltip>
  )
}
