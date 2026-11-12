import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/buttonStyles'

/** Any address that does not exist outside the signed-in app (Untitled UI empty state on white). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <EmptyState
        icon={<SearchX aria-hidden />}
        title="Page not found"
        action={
          <Link href="/" className={buttonStyles({ variant: 'primary' })}>
            Go to the home page
          </Link>
        }
      >
        This address does not exist. Check the link, or sign in to open your work.
      </EmptyState>
    </div>
  )
}
