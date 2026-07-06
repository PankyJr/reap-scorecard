import Image from 'next/image'
import Link from 'next/link'

import { AdminHeaderNav } from '@/app/admin/AdminHeaderNav'
import { AdminStatusChip } from '@/app/admin/_ui'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'
import type { Metadata } from 'next'
import { PRIVATE_APP_ROBOTS } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  robots: PRIVATE_APP_ROBOTS,
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireReapInternalAdmin()

  return (
    <div className="min-h-screen bg-[#f3f7f8] text-slate-950">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(6,59,63,0.10),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(16,185,129,0.10),transparent_26%),linear-gradient(180deg,#f8fbfc_0%,#eef5f6_42%,#f6f8f9_100%)]"
        aria-hidden
      />

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/86 shadow-[0_10px_30px_-24px_rgba(2,24,27,0.55)] backdrop-blur-xl">
        <div className="mx-auto max-w-[1480px] px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href="/dashboard"
                className="group shrink-0 rounded-2xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#063b3f]/30"
                aria-label="Back to Reap Solutions app"
              >
                <span className="relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#02181b] shadow-[0_18px_40px_-20px_rgba(2,24,27,0.85)] ring-1 ring-emerald-300/25 transition group-hover:scale-[1.02]">
                  <span
                    className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(52,211,153,0.25),transparent_36%)]"
                    aria-hidden
                  />
                  <Image
                    src="/logo.png"
                    alt=""
                    width={32}
                    height={32}
                    className="relative h-8 w-8"
                    aria-hidden
                  />
                </span>
              </Link>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    REAP Admin Console
                  </h1>
                  <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <AdminStatusChip label="Production" tone="muted" />
                    <AdminStatusChip label="Read-only" tone="neutral" />
                    <AdminStatusChip label="Live" tone="success" />
                  </div>
                </div>
                <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-600">
                  Command centre for companies, procurement runs, scorecards, workbooks, and client activity across all tenants.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <AdminHeaderNav />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-5 py-7 sm:px-6 sm:py-9 lg:px-8">
        {children}
      </main>
    </div>
  )
}