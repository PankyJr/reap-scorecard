import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

/**
 * Top of every signed-in page: where you are (breadcrumbs), what this page is
 * (title + one plain sentence), and the one main thing you can do here.
 */
export function PageHeader(args: {
  crumbs?: Crumb[]
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Small facts shown under the title, e.g. company and year. */
  meta?: ReactNode
}) {
  return (
    <header className="space-y-3">
      {args.crumbs && args.crumbs.length > 0 ? <Breadcrumbs crumbs={args.crumbs} /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2rem]">{args.title}</h1>
          {args.meta ? <div className="text-[15px] text-muted">{args.meta}</div> : null}
          {args.description ? <p className="max-w-[68ch] text-base text-muted">{args.description}</p> : null}
        </div>
        {args.actions ? <div className="flex shrink-0 flex-wrap gap-2">{args.actions}</div> : null}
      </div>
    </header>
  )
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="You are here">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="truncate underline-offset-4 hover:text-brand hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="truncate text-ink">
                  {crumb.label}
                </span>
              )}
              {!last ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
