import Link from 'next/link'

/**
 * Rendered when `forbidden()` is called (HTTP 403).
 * Used for authenticated users who lack REAP internal-admin privileges
 * (e.g. EAP target administration).
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          HTTP 403
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Access denied</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          You are signed in, but this account is not authorised to administer EAP targets or other
          REAP internal-admin surfaces. Contact a REAP administrator if you need access.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to dashboard
          </Link>
          <Link
            href="/settings"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
