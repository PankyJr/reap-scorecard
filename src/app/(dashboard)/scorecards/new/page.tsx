import Link from 'next/link'
import { ArrowLeft, Building2, ChevronRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { FullScorecardCalculatorNewForm } from './FullScorecardCalculatorNewForm'
import { ModularScorecardCalculatorNewForm } from './ModularScorecardCalculatorNewForm'

type PageProps = {
  searchParams: Promise<{ companyId?: string; error?: string; legacy?: string; mode?: string }>
}

export default async function NewScorecardCalculationPage({ searchParams }: PageProps) {
  const params = await searchParams

  if (params.legacy === '1') {
    const { default: LegacyPage } = await import('./LegacyScorecardNewPage')
    return <LegacyPage searchParams={Promise.resolve(params)} />
  }

  const { companyId, error } = params
  const modular = params.mode === 'modular'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  if (!companyId) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .eq('owner_id', user.id)
      .order('name')

    return (
      <div className="min-h-[70vh] bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
            <div className="border-b border-white/10 bg-[#063b3f] px-6 py-5 sm:px-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                {modular ? 'Modular calculator' : 'REAP Generic Scorecard'}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Select a company
              </h1>
              <p className="mt-2 text-sm leading-6 text-sky-100/85">
                New Scorecard Calculation always starts from a company profile.
              </p>
            </div>
            <div className="space-y-3 px-6 py-6 sm:px-8">
              {(companies ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <Building2 className="mx-auto h-5 w-5 text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-slate-800">No companies yet</p>
                  <Link href="/companies/new" className="mt-4 inline-flex text-sm font-semibold text-[#063b3f]">
                    Create a company
                  </Link>
                </div>
              ) : (
                (companies ?? []).map((c) => (
                  <Link
                    key={c.id}
                    href={
                      modular
                        ? `/scorecards/new?companyId=${c.id}&mode=modular`
                        : `/scorecards/new?companyId=${c.id}`
                    }
                    className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#063b3f]/40 hover:bg-[#063b3f]/5"
                  >
                    {c.name}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))
              )}
              <p className="pt-4 text-xs text-slate-500">
                Need the old manual points entry?{' '}
                <Link href="/scorecards/new?legacy=1" className="font-medium text-slate-700 underline">
                  Legacy Manual Scorecards
                </Link>
              </p>
              {!modular ? (
                <p className="text-xs text-slate-500">
                  Prefer element-by-element uploads?{' '}
                  <Link href="/scorecards/new?mode=modular" className="font-medium text-slate-700 underline">
                    Work with selected elements instead
                  </Link>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Prefer the full Generic workbook?{' '}
                  <Link href="/scorecards/new" className="font-medium text-slate-700 underline">
                    New Assessment
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', companyId)
    .maybeSingle()

  if (!company || company.owner_id !== user.id) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-700">Company not found.</p>
        <Link href="/scorecards/new" className="mt-3 inline-block text-sm font-semibold text-[#063b3f]">
          Back
        </Link>
      </div>
    )
  }

  const year = new Date().getFullYear()

  return (
    <div className="min-h-[70vh] bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/companies/${company.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Company profile
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            {modular ? (
              <Link href={`/scorecards/new?companyId=${company.id}`} className="underline">
                Full Generic workbook
              </Link>
            ) : (
              <Link href={`/scorecards/new?companyId=${company.id}&mode=modular`} className="underline">
                Work with selected elements instead
              </Link>
            )}
            <Link href="/scorecards/new?legacy=1" className="underline">
              Manual Scorecards
            </Link>
          </div>
        </div>

        <header className="rounded-[28px] border border-slate-200/80 bg-[#063b3f] px-6 py-6 text-white shadow-lg sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            New Scorecard Calculation
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {modular ? 'Modular Scorecard Calculator' : 'New Assessment'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100/85">
            {modular
              ? 'Upload Excel per supported modular element, validate, calculate, and save a Scorecard Assessment.'
              : 'Create a Generic Scorecard Assessment, upload the REAP Generic Scorecard workbook, review the detected data and calculate the scorecard.'}
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {modular ? (
          <ModularScorecardCalculatorNewForm
            companyId={company.id}
            companyName={company.name}
            defaultYear={year}
          />
        ) : (
          <FullScorecardCalculatorNewForm
            companyId={company.id}
            companyName={company.name}
            defaultYear={year}
          />
        )}
      </div>
    </div>
  )
}
