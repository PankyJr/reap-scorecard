import Link from 'next/link'

/**
 * Rendered when `forbidden()` is called (HTTP 403).
 * Used for authenticated users who lack REAP internal-admin privileges
 * (e.g. EAP target administration).
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sunken px-6 py-16">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <p className="text-meta font-medium text-muted">
          HTTP 403
        </p>
        <h1 className="mt-2 text-metric font-semibold tracking-tight text-ink">Access denied</h1>
        <p className="mt-3 text-meta leading-relaxed text-muted">
          You are signed in, but this account is not authorised to administer EAP targets or other
          REAP internal-admin surfaces. Contact a REAP administrator if you need access.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-control bg-brand px-4 py-2.5 text-body font-semibold text-white"
          >
            Back to dashboard
          </Link>
          <Link
            href="/settings"
            className="rounded-control border border-line bg-surface px-4 py-2.5 text-body font-semibold text-ink"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
