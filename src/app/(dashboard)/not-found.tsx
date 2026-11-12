import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/buttonStyles'

export default function DashboardNotFound() {
  return (
    <div className="py-10">
      <EmptyState
        icon={<SearchX aria-hidden />}
        title="Not found"
        action={
          <Link href="/dashboard" className={buttonStyles({ variant: 'primary' })}>
            Go to Home
          </Link>
        }
      >
        This page does not exist, or it belongs to another account. It may also have been deleted. Your{' '}
        <Link href="/companies" className="font-medium text-teal hover:underline">
          companies
        </Link>{' '}
        are all listed on one page.
      </EmptyState>
    </div>
  )
}
