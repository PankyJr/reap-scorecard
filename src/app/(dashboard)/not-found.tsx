import Link from 'next/link'
import { buttonStyles } from '@/components/ui/buttonStyles'

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-10">
      <h1 className="font-serif text-3xl font-semibold text-ink">Not found</h1>
      <p className="text-base text-muted">
        This page does not exist, or it belongs to another account. It may also have been deleted.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className={buttonStyles({ variant: 'primary' })}>
          Go to Home
        </Link>
        <Link href="/companies" className={buttonStyles({ variant: 'secondary' })}>
          Your companies
        </Link>
      </div>
    </div>
  )
}
