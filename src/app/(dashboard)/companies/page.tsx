import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Plus, Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { DeletedBanner } from './DeletedBanner'

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; audit_failed?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deleted, audit_failed } = await searchParams

  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const hasCompanies = !!companies && companies.length > 0
  const showDeletedBanner = deleted === '1'
  const auditFailed = audit_failed === '1'

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        {showDeletedBanner && <DeletedBanner auditFailed={auditFailed} />}

        {/* Header with separation line */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Companies
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage client records, profiles, and procurement assessments.
            </p>
          </div>

          <Link
            href="/companies/new"
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New Company
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Company Directory
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                All organisations currently onboarded into the REAP scorecard platform.
              </p>
            </div>
          </div>

          {hasCompanies ? (
            <div>
              {companies.map((company, index) => {
                const name: string = company.name ?? 'Unknown company'
                const initial = name.trim().charAt(0).toUpperCase() || '?'
                const industry: string = company.industry ?? '—'
                const contact: string = company.contact_person ?? '—'

                return (
                  <div key={company.id}>
                    {index > 0 && <div className="mx-6 border-t border-slate-100" />}

                    <div className="flex items-center justify-between px-6 py-4 text-sm transition-colors hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold uppercase text-slate-50">
                          {initial}
                        </div>

                        <div>
                          <p className="font-medium text-slate-900">{name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {industry} · Contact {contact}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden text-right text-xs text-slate-500 sm:block">
                          <p className="uppercase tracking-wide">Added</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {company.created_at
                              ? new Date(company.created_at).toLocaleDateString()
                              : '—'}
                          </p>
                        </div>

                        <Link
                          href={`/companies/${company.id}`}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-xs hover:border-emerald-300 hover:text-emerald-900"
                        >
                          View profile
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                <Building2 className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-800">No companies yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Companies are required before creating scorecards. Add your first organisation to get started.
              </p>
              <Link
                href="/companies/new"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add company
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}