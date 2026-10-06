import type { ReactNode } from 'react'

/** A white section on the page. Use one per topic; never nest panels. */
export function Panel(args: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  id?: string
  className?: string
  /** Tighter padding for lists and tables that run edge to edge. */
  flush?: boolean
}) {
  return (
    <section
      id={args.id}
      className={`min-w-0 rounded-card border border-line bg-surface ${args.className ?? ''}`}
    >
      {args.title || args.actions ? (
        <div className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ${args.flush ? 'px-5 pt-5' : 'px-5 pt-5 sm:px-6'}`}>
          <div className="min-w-0 space-y-1">
            {args.title ? <h2 className="text-lg font-semibold text-ink">{args.title}</h2> : null}
            {args.description ? <p className="max-w-[70ch] text-[15px] text-muted">{args.description}</p> : null}
          </div>
          {args.actions ? <div className="flex shrink-0 flex-wrap gap-2">{args.actions}</div> : null}
        </div>
      ) : null}
      {args.children ? (
        <div className={args.flush ? 'mt-4 min-w-0' : `min-w-0 px-5 pb-5 sm:px-6 ${args.title || args.actions ? 'pt-4' : 'pt-5'}`}>
          {args.children}
        </div>
      ) : null}
      {args.footer ? <div className="border-t border-line px-5 py-4 sm:px-6">{args.footer}</div> : null}
    </section>
  )
}

/** Label / value pairs, two columns from tablet width up. */
export function FactList({ items }: { items: Array<{ label: ReactNode; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={index} className="min-w-0">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className="break-words text-base font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Hides advanced or rarely needed content behind one clear link. */
export function MoreOptions(args: { label?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-control border border-line bg-sunken" open={args.defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-semibold text-brand marker:hidden">
        <span>{args.label ?? 'More options'}</span>
        <span aria-hidden className="text-faint transition group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-4 border-t border-line px-4 py-4">{args.children}</div>
    </details>
  )
}
