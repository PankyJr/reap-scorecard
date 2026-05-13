import Image from 'next/image'
import Link from 'next/link'

import { AdminHeaderNav } from '@/app/admin/AdminHeaderNav'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireReapInternalAdmin()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/dashboard"
              className="shrink-0 rounded-xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#063b3f]/30"
              aria-label="Back to Reap Solutions app"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#02181b] ring-1 ring-blue-300/50">
                <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" aria-hidden />
              </span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                Admin console
              </h1>
              <p className="truncate text-xs text-slate-500 sm:text-[13px]">Read-only across all tenants</p>
            </div>
          </div>
          <AdminHeaderNav />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
    </div>
  )
}
