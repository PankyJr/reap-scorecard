import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, ClipboardList } from 'lucide-react'
import { CARD_FRAME, CardLabel } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { DASHBOARD_WORKSPACE_SELECTOR } from '@/lib/demo/workspaceSelectorConfig'

/**
 * Workspaces (demo only; not in the permanent sidebar). One card, two 72px
 * rows with a hairline between: a 40px icon or logo tile, the title and one
 * line of description, a chevron, a tint on hover. Aberdare keeps its logo
 * and nothing else of its own.
 */
export function DashboardWorkspaceSelector() {
  const { heading, formal, client } = DASHBOARD_WORKSPACE_SELECTOR
  const rows = [
    {
      key: 'formal',
      testId: 'workspace-card-formal',
      linkTestId: 'workspace-open-formal',
      href: formal.href,
      title: formal.title,
      // One line, short enough never to be cut off (formal.description is the long form).
      line: 'Structured procurement assessments and formal reports',
      tile: (
        <span className="flex h-10 w-[88px] shrink-0 items-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-brand-soft text-brand">
            <ClipboardList className="h-[18px] w-[18px]" aria-hidden />
          </span>
        </span>
      ),
    },
    {
      key: 'client',
      testId: 'workspace-card-client',
      linkTestId: 'workspace-open-client',
      href: client.href,
      title: client.title,
      line: 'Monthly spend uploads and supplier scenarios',
      tile: (
        // The Aberdare logo is a wide wordmark: a 40px square would make it unreadable,
        // so both rows get the same 88x40 slot and the titles still line up.
        <span className="flex h-10 w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-control border border-card bg-logo-plate px-2">
          <Image src="/clients/aberdare/logo.jpg" alt="Aberdare Cables" width={124} height={14} loading="eager" className="h-auto w-full object-contain" />
        </span>
      ),
    },
  ]

  return (
    <section aria-labelledby="dashboard-workspace-selector-heading" data-testid="dashboard-workspace-selector" className={cn('overflow-hidden', CARD_FRAME)}>
      <div className="flex min-h-9 items-center px-6 pt-6">
        <CardLabel as="h2" id="dashboard-workspace-selector-heading">
          {heading}
        </CardLabel>
      </div>
      <ul className="mt-4 border-t border-line">
        {rows.map((row) => (
          <li key={row.key} data-testid={row.testId} className="border-b border-line last:border-b-0">
            <Link
              href={row.href}
              data-testid={row.linkTestId}
              className="group flex h-[72px] items-center gap-4 px-6 transition-colors duration-150 hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
            >
              {row.tile}
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium text-ink">{row.title}</span>
                <span className="block truncate text-meta text-label">{row.line}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
