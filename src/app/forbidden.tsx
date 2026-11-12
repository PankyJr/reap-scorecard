import Link from 'next/link'
import { ShieldX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/buttonStyles'

/**
 * Rendered when `forbidden()` is called (HTTP 403).
 * Used for authenticated users who lack REAP internal-admin privileges
 * (e.g. EAP target administration). Untitled UI empty state on white.
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <EmptyState
        icon={<ShieldX aria-hidden />}
        title="Access denied"
        action={
          <Link href="/dashboard" className={buttonStyles({ variant: 'primary' })}>
            Back to dashboard
          </Link>
        }
      >
        You are signed in, but this account is not authorised to administer EAP targets or other REAP internal-admin surfaces.
        Contact a REAP administrator if you need access, or open your{' '}
        <Link href="/settings" className="font-medium text-teal hover:underline">
          settings
        </Link>
        .
      </EmptyState>
    </div>
  )
}
