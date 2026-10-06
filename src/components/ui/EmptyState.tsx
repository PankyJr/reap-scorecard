import type { ReactNode } from 'react'

/** Nothing here yet: say what goes here and offer the one action that fills it. */
export function EmptyState(args: { title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-sunken px-6 py-8 text-center">
      {args.icon ? <div className="mx-auto mb-3 flex justify-center text-faint">{args.icon}</div> : null}
      <p className="text-base font-semibold text-ink">{args.title}</p>
      {args.children ? <div className="mx-auto mt-1 max-w-[52ch] text-[15px] text-muted">{args.children}</div> : null}
      {args.action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{args.action}</div> : null}
    </div>
  )
}
