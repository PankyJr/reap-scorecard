'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/buttonStyles'

/** Any unexpected failure inside the signed-in app: say so plainly and offer a way on (Untitled UI empty state). */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="py-10">
      <EmptyState
        icon={<AlertTriangle aria-hidden />}
        title="This page could not be shown"
        action={
          <button type="button" onClick={reset} className={buttonStyles({ variant: 'primary' })}>
            Try again
          </button>
        }
      >
        Something went wrong while loading it. Your saved work is not affected. If it keeps happening,{' '}
        <Link href="/dashboard" className="font-medium text-teal hover:underline">
          go back to Home
        </Link>{' '}
        and open it from there.
        {error.digest ? <span className="mt-1 block text-meta">Reference for support: {error.digest}</span> : null}
      </EmptyState>
    </div>
  )
}
