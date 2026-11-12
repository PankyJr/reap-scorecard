import Link from 'next/link'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { ChevronRight } from 'lucide-react'
import { HelpButton } from '@/components/help/HelpButton'

export type Crumb = { label: string; href?: string }

/**
 * The page header, inside the panel (Halal Lab): a 24/32 semibold title with
 * an optional 18px icon, a grey line under it, actions on the right, and
 * "Need help?" as a plain icon button at the end. No separate top bar.
 */
export function PageHeader(args: {
  crumbs?: Crumb[]
  title: ReactNode
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  description?: ReactNode
  actions?: ReactNode
  /** A grey line under the title (company, year, "Updated …"). */
  meta?: ReactNode
  /** Hide the help button (auth pages and other places without the tour). */
  noHelp?: boolean
}) {
  const Icon = args.icon
  return (
    <header className="space-y-3">
      {args.crumbs && args.crumbs.length > 0 ? <Breadcrumbs crumbs={args.crumbs} /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2.5 text-title font-semibold text-ink">
            {Icon ? <Icon className="h-[18px] w-[18px] shrink-0 text-icon" aria-hidden /> : null}
            <span className="min-w-0">{args.title}</span>
          </h1>
          {args.meta ? <div className="text-body text-label">{args.meta}</div> : null}
          {args.description ? <p className="max-w-[68ch] text-body text-label">{args.description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {args.actions}
          {args.noHelp ? null : <HelpButton />}
        </div>
      </div>
    </header>
  )
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="You are here">
      <ol className="flex flex-wrap items-center gap-1 text-meta text-label">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="-my-3 inline-flex min-h-11 items-center truncate rounded-sm transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 sm:my-0 sm:min-h-0">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="truncate text-ink">
                  {crumb.label}
                </span>
              )}
              {!last ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-icon" aria-hidden /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
