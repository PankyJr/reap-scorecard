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
          ? 'rounded-md bg-slate-900 px-2.5 py-1.5 text-[13px] font-medium text-white'
          : 'rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900'
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
    <nav className="flex flex-wrap items-center gap-1" aria-label="Admin">
      <NavLink href="/admin" active={overview}>
        Overview
      </NavLink>
      <NavLink href="/admin/companies/browse" active={companies}>
        Companies
      </NavLink>
      <NavLink href="/admin/procurement/browse" active={procurement}>
        Procurement
      </NavLink>
      <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:inline" aria-hidden />
      <Link
        href="/dashboard"
        className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-[#063b3f] transition hover:bg-[#063b3f]/10"
      >
        App
      </Link>
    </nav>
  )
}
