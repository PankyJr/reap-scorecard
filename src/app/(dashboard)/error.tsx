'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Notice } from '@/components/ui/Notice'
import { buttonStyles } from '@/components/ui/buttonStyles'

/** Any unexpected failure inside the signed-in app: say so plainly and offer a way on. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-10">
      <h1 className="font-serif text-3xl font-semibold text-ink">This page could not be shown</h1>
      <Notice tone="bad" title="Something went wrong while loading it">
        Your saved work is not affected. Try again; if it keeps happening, go back to Home and open it from there.
        {error.digest ? <span className="mt-1 block text-sm text-muted">Reference for support: {error.digest}</span> : null}
      </Notice>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonStyles({ variant: 'primary' })}>
          Try again
        </button>
        <Link href="/dashboard" className={buttonStyles({ variant: 'secondary' })}>
          Go to Home
        </Link>
      </div>
    </div>
  )
}
