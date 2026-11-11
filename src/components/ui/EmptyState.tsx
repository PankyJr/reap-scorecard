import type { ReactNode } from 'react'

/**
 * Design rule 13: nothing here yet. Say what goes here and offer the ONE
 * action that fills it.
 */
export function EmptyState(args: { title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-sunken px-6 py-10 text-center">
      {args.icon ? (
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-label shadow-card">
          {args.icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-ink">{args.title}</p>
      {args.children ? <div className="mx-auto mt-1 max-w-[52ch] text-sm text-label">{args.children}</div> : null}
      {args.action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{args.action}</div> : null}
    </div>
  )
}
