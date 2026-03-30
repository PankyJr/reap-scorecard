import Link from 'next/link'
import Image from 'next/image'
import { ReactNode } from 'react'

export function LegalPageShell({
  title,
  subtitle,
  updatedDate,
  sections,
  children,
}: {
  title: string
  subtitle: string
  updatedDate: string
  sections: string[]
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top bar */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-10">
          <Link href="/login" className="inline-flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-slate-900">
              <Image src="/logo.png" alt="Reap Solutions" width={28} height={28} className="h-7 w-7 object-contain" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-slate-900">Reap Solutions</span>
          </Link>
          <Link href="/login" className="text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-900">
            Sign in
          </Link>
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
        {/* Left column — meta & navigation */}
        <aside className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-10">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 shadow-sm">
              Legal
            </span>

            <h1 className="mt-4 text-[24px] font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-slate-500">
              {subtitle}
            </p>
            <p className="mt-3 text-[11px] text-slate-400">
              Updated {updatedDate}
            </p>

            {/* Section list */}
            <nav className="mt-8 hidden lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-3">
                On this page
              </p>
              <ul className="space-y-1">
                {sections.map((s) => {
                  const id = s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="block rounded-md px-2.5 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        {s}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Back action */}
            <div className="mt-8 hidden lg:block">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-400 transition-colors hover:text-slate-900"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Back to sign in
              </Link>
            </div>
          </div>
        </aside>

        {/* Right column — content */}
        <main>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="divide-y divide-slate-100">
              {children}
            </div>
          </div>

          {/* Mobile footer */}
          <div className="mt-8 flex items-center justify-between lg:hidden">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-400 transition-colors hover:text-slate-900"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to sign in
            </Link>
            <div className="flex gap-4 text-[11px] text-slate-400">
              <Link href="/privacy" className="transition-colors hover:text-slate-600">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-slate-600">Terms</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="px-6 py-7 sm:px-8 sm:py-8 md:px-10 md:py-9 scroll-mt-6">
      <h2 className="text-[15px] font-semibold text-slate-900">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[14px] leading-[1.85] text-slate-600">
        {children}
      </div>
    </section>
  )
}
