'use client'

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
    <span
      className="group relative inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
      data-testid="dashboard-demo-environment-chip"
      tabIndex={0}
      aria-label={`${title}. ${detail}`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-[#063b3f]"
        aria-hidden
      />
      {title}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {detail}
      </span>
    </span>
  )
}
