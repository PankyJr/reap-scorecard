import type { ReactNode } from 'react'
import { SectionTitle } from './Card'
import { cn } from './cn'

/**
 * A section inside the panel (Halal Lab): separated from the one above by a
 * 1px hairline instead of a box. Title 16 semibold, optional grey line under
 * it, actions on the right, 16px to the body.
 */
export function Section(args: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  id?: string
  className?: string
  /** No hairline above (the first section under the page header). */
  first?: boolean
  'data-help'?: string
}) {
  return (
    <section id={args.id} data-help={args['data-help']} className={cn('min-w-0', !args.first && 'border-t border-line pt-6 sm:pt-8', args.className)}>
      {args.title || args.actions ? (
        <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {args.title ? <SectionTitle>{args.title}</SectionTitle> : null}
            {args.description ? <p className="mt-0.5 text-meta text-label">{args.description}</p> : null}
          </div>
          {args.actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{args.actions}</div> : null}
        </div>
      ) : null}
      {args.children}
    </section>
  )
}
