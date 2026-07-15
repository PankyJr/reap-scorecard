'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ABERDARE_CLIENT } from '@/lib/clients/aberdare'
import { ABERDARE_THEME } from './theme'

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
    <header
      className="border-b bg-white/95"
      style={{
        borderColor: ABERDARE_THEME.border,
        backgroundImage:
          'linear-gradient(180deg, #FFFFFF 0%, #F7FBFD 100%)',
      }}
      data-testid="aberdare-workspace-header"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <Image
            src="/clients/aberdare/logo.jpg"
            alt="Aberdare Cables"
            width={200}
            height={56}
            className="h-11 w-auto max-w-[180px] shrink-0 object-contain object-left sm:h-12 sm:max-w-[200px]"
            priority
          />
          <div className="min-w-0 border-l pl-3 sm:pl-4" style={{ borderColor: ABERDARE_THEME.border }}>
            <p
              className="text-sm font-semibold tracking-wide"
              style={{ color: ABERDARE_THEME.cyanDark }}
            >
              Client workspace
            </p>
            <h1
              className="mt-0.5 text-xl font-semibold tracking-tight sm:text-[1.65rem]"
              style={{ color: ABERDARE_THEME.charcoal }}
            >
              Aberdare Procurement Workspace
            </h1>
            {pageTitle ? (
              <p
                className="mt-0.5 text-base font-medium"
                style={{ color: ABERDARE_THEME.text }}
              >
                {pageTitle}
              </p>
            ) : null}
            {subtitle ? (
              <p
                className="mt-1 max-w-xl text-base leading-snug"
                style={{ color: ABERDARE_THEME.muted }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <p
            className="text-sm font-medium"
            style={{ color: ABERDARE_THEME.muted }}
            data-testid="aberdare-powered-by"
          >
            {ABERDARE_CLIENT.poweredBy}
          </p>
          {showReturnToDashboard ? (
            <Link
              href="/dashboard"
              data-testid="aberdare-return-to-dashboard"
              aria-label="Back to dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-base font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
              style={{
                borderColor: ABERDARE_THEME.border,
                color: ABERDARE_THEME.text,
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to dashboard
            </Link>
          ) : null}
          {showBackToWorkspace ? (
            <Link
              href="/clients/aberdare/procurement-control-preview"
              data-testid="aberdare-back-to-workspace"
              aria-label="Back to Aberdare workspace"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-base font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
              style={{
                borderColor: ABERDARE_THEME.border,
                color: ABERDARE_THEME.text,
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to Aberdare workspace
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}
