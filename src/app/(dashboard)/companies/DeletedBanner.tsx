'use client'

import { useRouter } from 'next/navigation'

export function DeletedBanner({ auditFailed = false }: { auditFailed?: boolean }) {
  const router = useRouter()
  const dismiss = () => router.replace('/companies')

  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium">Company deleted successfully.</p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2 py-1 font-medium text-emerald-800 transition hover:bg-emerald-100"
        >
          Dismiss
        </button>
      </div>
      {auditFailed && (
        <p className="text-xs text-emerald-800">
          Activity log could not be saved. Run the SQL in{' '}
          <code className="rounded bg-emerald-100 px-1 py-0.5">supabase/audit_log.sql</code> in the
          Supabase SQL Editor, then try again.
        </p>
      )}
    </div>
  )
}
