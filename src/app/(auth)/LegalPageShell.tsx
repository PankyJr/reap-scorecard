import Link from 'next/link'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { Chip } from '@/components/ui/Chip'
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
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-10">
          <Link href="/login" className="inline-flex min-h-11 items-center gap-2 transition-opacity duration-200 hover:opacity-75">
            <span
              aria-hidden
              className="h-6 w-6 bg-brand"
              style={{ WebkitMaskImage: 'url(/logo-black.png)', maskImage: 'url(/logo-black.png)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }}
            />
            <span className="text-section font-semibold text-ink">REAP</span>
          </Link>
          <Link href="/login" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            Sign in
          </Link>
        </div>
      </div>

      {/* Main layout */}
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
        {/* Left column — meta & navigation */}
        <aside className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-10">
            <Chip tone="neutral">Legal</Chip>

            <h1 className="mt-4 text-title font-semibold text-ink">
              {title}
            </h1>
            <p className="mt-1 text-body text-label">
              {subtitle}
            </p>
            <p className="mt-3 text-meta text-label">
              Updated {updatedDate}
            </p>

            {/* Section list */}
            <nav className="mt-8 hidden lg:block">
              <p className="mb-2 text-caps font-medium text-icon">
                On this page
              </p>
              <ul className="space-y-1">
                {sections.map((s) => {
                  const id = s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="block rounded-sm px-2.5 py-1.5 text-meta text-label transition-colors duration-200 hover:bg-sidebar-hover hover:text-ink"
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
                className="inline-flex min-h-11 items-center gap-1.5 text-meta font-medium text-teal hover:underline sm:min-h-0"
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
          <div>
            <div className="divide-y divide-line border-y border-line">
              {children}
            </div>
          </div>

          {/* Mobile footer */}
          <div className="mt-8 flex items-center justify-between lg:hidden">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center gap-1.5 text-meta font-medium text-teal hover:underline sm:min-h-0"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to sign in
            </Link>
            <div className="flex gap-4 text-meta text-label">
              <Link href="/privacy" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink">Privacy</Link>
              <Link href="/terms" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink">Terms</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 py-6">
      <h2 className="text-section font-semibold text-ink">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-body text-label">
        {children}
      </div>
    </section>
  )
}
