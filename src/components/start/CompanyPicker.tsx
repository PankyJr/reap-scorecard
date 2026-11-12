'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'

export type PickerCompany = { id: string; name: string; sub: string | null; href: string }

/**
 * Untitled UI list picker: a search field, then hairline rows with an
 * initial in a rounded square, the name and a grey line, and a radio on the
 * right. "Continue" goes where choosing the company used to go.
 */
export function CompanyPicker({ companies, addHref }: { companies: PickerCompany[]; addHref: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(companies.length === 1 ? companies[0]!.id : null)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? companies.filter((c) => c.name.toLowerCase().includes(q) || (c.sub ?? '').toLowerCase().includes(q)) : companies
  }, [companies, query])
  const chosen = companies.find((c) => c.id === picked) ?? null

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (chosen) router.push(chosen.href)
      }}
      className="space-y-4"
    >
      {companies.length > 5 ? (
        <label className="relative block">
          <span className="sr-only">Search companies</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies"
            className="h-11 w-full rounded-control border border-control-line bg-surface pl-9 pr-3 text-body text-ink placeholder:text-subtle transition-[border-color,box-shadow] duration-200 focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/20 sm:h-10"
          />
        </label>
      ) : null}

      <fieldset className="min-w-0" data-help="start-companies">
        <legend className="sr-only">Company</legend>
        <ul className="divide-y divide-divider border-y border-line">
          {shown.map((company) => {
            const selected = company.id === picked
            return (
              <li key={company.id}>
                <label
                  className={cn(
                    'group -mx-2 flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[12px] px-2 py-2 transition-colors duration-200 hover:bg-sunken has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-teal/25',
                    selected && 'bg-brand-soft hover:bg-brand-soft',
                  )}
                >
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border text-body font-semibold', selected ? 'border-teal/30 bg-surface text-teal' : 'border-line bg-sunken text-label')} aria-hidden>
                    {company.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-medium text-ink">{company.name}</span>
                    {company.sub ? <span className="block truncate text-meta text-label">{company.sub}</span> : null}
                  </span>
                  <input type="radio" name="company" value={company.id} checked={selected} onChange={() => setPicked(company.id)} className="peer sr-only" />
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                      selected ? 'border-teal bg-teal' : 'border-control-line bg-surface group-hover:border-line-strong',
                    )}
                    aria-hidden
                  >
                    {selected ? <span className="h-2 w-2 rounded-full bg-surface" /> : null}
                  </span>
                </label>
              </li>
            )
          })}
          {shown.length === 0 ? <li className="py-6 text-center text-meta text-label">No company matches “{query}”.</li> : null}
        </ul>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Link href={addHref} data-help="start-add-company" className={buttonStyles({ variant: 'plain', className: '-ml-2 self-start' })}>
          <Plus aria-hidden /> Add a company
        </Link>
        <button type="submit" disabled={!chosen} data-help="start-continue" className={buttonStyles({ variant: 'primary', className: 'w-full sm:w-auto' })}>
          Continue
        </button>
      </div>
    </form>
  )
}
