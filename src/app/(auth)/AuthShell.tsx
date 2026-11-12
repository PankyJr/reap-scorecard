import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Sign-in and other auth pages (Untitled UI password reset): one centred
 * 400px column on white, the REAP mark and name on top, the form, and quiet
 * Privacy / Terms links at the bottom. No background art.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-surface px-4 antialiased">
      <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
        <div className="mb-8 flex items-center justify-center gap-2">
          {/* The REAP mark in teal (the black logo used as a mask). */}
          <span
            aria-hidden
            className="h-8 w-8 bg-brand"
            style={{ WebkitMaskImage: 'url(/logo-black.png)', maskImage: 'url(/logo-black.png)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
          />
          <span className="text-section font-semibold text-ink">REAP</span>
        </div>
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-[400px] items-center justify-between pb-6 text-meta text-label">
        <span>&copy; {new Date().getFullYear()} Reap Solutions</span>
        <span className="flex gap-4">
          <Link href="/privacy" className="-my-3 inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink sm:my-0 sm:min-h-0 sm:min-w-0">
            Privacy
          </Link>
          <Link href="/terms" className="-my-3 inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink sm:my-0 sm:min-h-0 sm:min-w-0">
            Terms
          </Link>
        </span>
      </footer>
    </div>
  )
}
