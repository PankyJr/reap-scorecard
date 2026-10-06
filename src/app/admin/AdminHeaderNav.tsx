'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function NavLink({
  href,
  children,
  active,
}: {
  href: string
  children: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-md bg-brand px-3 py-1.5 text-[15px] font-semibold text-white shadow-sm'
          : 'rounded-md px-3 py-1.5 text-[15px] font-medium text-muted transition hover:bg-surface hover:text-ink'
      }
    >
      {children}
    </Link>
  )
}

export function AdminHeaderNav() {
  const pathname = usePathname()
  const overview = pathname === '/admin'
  const companies = pathname.startsWith('/admin/companies')
  const procurement = pathname.startsWith('/admin/procurement')

  return (
    <nav
      className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-line/90 bg-sunken/80 p-1 shadow-sm"
      aria-label="Admin"
    >
      <div className="flex flex-wrap items-center gap-0.5">
        <NavLink href="/admin" active={overview}>
          Overview
        </NavLink>
        <NavLink href="/admin/companies/browse" active={companies}>
          Companies
        </NavLink>
        <NavLink href="/admin/procurement/browse" active={procurement}>
          Procurement
        </NavLink>
      </div>
      <span
        className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block"
        aria-hidden
      />
      <div className="flex items-center">
        <Link
          href="/dashboard"
          className="rounded-md px-3 py-1.5 text-[15px] font-semibold text-brand transition hover:bg-surface"
        >
          App
        </Link>
      </div>
    </nav>
  )
}
