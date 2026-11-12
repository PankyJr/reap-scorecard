'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'

/**
 * The Aberdare page header, inside the app panel like every other page: the
 * Aberdare logo in an 88x40 slot, "Aberdare procurement workspace" at 24
 * semibold, "Powered by REAP" in grey, and the way back on the right.
 */
export function AberdareWorkspaceHeader({
  subtitle,
  showBackToWorkspace,
  showReturnToDashboard,
  pageTitle,
}: {
  subtitle?: string
  showBackToWorkspace?: boolean
  /** Demo convenience: return to the main dashboard workspace selector. */
  showReturnToDashboard?: boolean
  /** Optional page title under the workspace identity (e.g. Live Procurement). */
  pageTitle?: string
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" data-testid="aberdare-workspace-header">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-10 w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-logo-plate px-2">
          <Image src="/clients/aberdare/logo.jpg" alt="Aberdare Cables" width={124} height={14} className="h-auto w-full object-contain" priority />
        </span>
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">Aberdare procurement workspace</h1>
          <p className="text-body text-label" data-testid="aberdare-powered-by">
            Powered by REAP{pageTitle ? <> · {pageTitle}</> : null}
          </p>
          {subtitle ? <p className="mt-1 max-w-[68ch] text-body text-label">{subtitle}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {showReturnToDashboard ? (
          <Link href="/dashboard" data-testid="aberdare-return-to-dashboard" aria-label="Back to dashboard" className={buttonStyles({ variant: 'secondary' })}>
            <ArrowLeft aria-hidden />
            Back to dashboard
          </Link>
        ) : null}
        {showBackToWorkspace ? (
          <Link href="/clients/aberdare/procurement-control-preview" data-testid="aberdare-back-to-workspace" aria-label="Back to Aberdare workspace" className={buttonStyles({ variant: 'secondary' })}>
            <ArrowLeft aria-hidden />
            Back to Aberdare workspace
          </Link>
        ) : null}
      </div>
    </header>
  )
}
