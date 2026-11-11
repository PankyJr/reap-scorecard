import Image from 'next/image'
import { ClipboardList } from 'lucide-react'
import { CardLabel } from '@/components/ui/Card'
import { StatTile } from '@/components/ui/StatTile'
import { DASHBOARD_WORKSPACE_SELECTOR } from '@/lib/demo/workspaceSelectorConfig'

/**
 * Two compact workspace tiles (Untitled UI number-tile shape). Shown only in
 * the demo experience; not in the permanent sidebar. Aberdare keeps its logo
 * and nothing else of its own: no blue, our tokens only.
 */
export function DashboardWorkspaceSelector() {
  const { heading, formal, client } = DASHBOARD_WORKSPACE_SELECTOR

  return (
    <section aria-labelledby="dashboard-workspace-selector-heading" data-testid="dashboard-workspace-selector">
      <CardLabel as="h2" id="dashboard-workspace-selector-heading">
        {heading}
      </CardLabel>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div data-testid="workspace-card-formal">
          <StatTile
            href={formal.href}
            wrap
            leading={<ClipboardList className="h-4 w-4 text-brand" aria-hidden />}
            label={formal.label}
            value={<span className="text-base font-semibold">{formal.title}</span>}
            aside={formal.capabilities.length + ' tools'}
          >
            <span className="mt-1 block truncate text-xs text-label" data-testid="workspace-open-formal" title={formal.description}>
              {formal.primaryAction}
            </span>
          </StatTile>
        </div>
        <div data-testid="workspace-card-client">
          <StatTile
            href={client.href}
            wrap
            leading={
              <span className="inline-flex h-5 items-center rounded-sm bg-logo-plate px-1">
                <Image src="/clients/aberdare/logo.jpg" alt="Aberdare Cables" width={124} height={14} className="h-3.5 w-auto object-contain" />
              </span>
            }
            label={<span className="sr-only">{client.label}</span>}
            value={<span className="text-base font-semibold">{client.title}</span>}
            aside={client.badge}
          >
            <span className="mt-1 block truncate text-xs text-label" data-testid="workspace-open-client" title={client.description}>
              {client.primaryAction}
            </span>
          </StatTile>
        </div>
      </div>
    </section>
  )
}
