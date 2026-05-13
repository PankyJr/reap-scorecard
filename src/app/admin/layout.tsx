import Link from 'next/link'

import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireReapInternalAdmin()

  return (
    <div className="min-h-screen bg-slate-50/90">
      <header className="border-b border-slate-200/90 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Internal operator
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-[#0c1a2e]">REAP admin console</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/admin" className="rounded-lg px-2 py-1 text-[#0b5259] hover:bg-slate-100">
              Overview
            </Link>
            <Link href="/dashboard" className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-[#0c1a2e]">
              Back to app
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  )
}
