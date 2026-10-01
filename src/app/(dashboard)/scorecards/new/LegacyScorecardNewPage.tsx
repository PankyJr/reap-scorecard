import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import {
  ArrowLeft,
  Calculator,
  Building2,
  ChevronRight,
  FileBarChart2,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { createScorecard } from './actions'
import { NewScorecardForm } from './NewScorecardForm'

type PageProps = {
  searchParams: Promise<{ companyId?: string; error?: string }>
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-[24px] border border-line/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,1))] p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export default async function NewScorecardPage({
  searchParams,
}: PageProps) {
  const { companyId, error } = await searchParams

  if (!companyId) {
    return (
      <div className="min-h-[70vh] bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.05),transparent_28%),linear-gradient(to_bottom,#f8fafc,#f8fafc)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-[32px] border border-line/80 bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
            <div className="border-b border-line/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] px-6 py-5 sm:px-8">
              <p className="text-sm font-medium text-faint">
                Scorecard
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Select a company first
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Scorecards must be created from a specific company profile.
              </p>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="rounded-2xl border border-dashed border-line bg-sunken/70 px-6 py-10 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-faint shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>

                <p className="mt-4 text-sm font-semibold text-ink">
                  No company selected
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                  Go to the companies page, open a company profile, and start a
                  new scorecard from there.
                </p>

                <div className="mt-6">
                  <Link
                    href="/companies"
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-hover"
                  >
                    Browse companies
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, owner_id, name')
    .eq('id', companyId)
    .single()

  if (!company || company.owner_id !== user.id) {
    redirect('/companies')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(11,22,61,0.06),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(11,82,89,0.05),transparent_35%),linear-gradient(to_bottom,#f8fafc,#f8fafc)]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header / hero */}
        <section className="relative overflow-hidden rounded-[32px] border border-line/80 bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.05),transparent_28%)]" />

          <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <Link
                    href={`/companies/${company.id}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition hover:border-line-strong hover:bg-sunken hover:text-ink"
                    aria-label="Back to company"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-full border border-line bg-sunken px-3 py-1 text-sm font-medium text-muted">
                      New Scorecard
                    </span>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-[2.15rem]">
                      Create Legacy Scorecard
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-muted sm:text-[15px]">
                      Capture category scores and generate a legacy scorecard
                      for this company.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line/80 bg-sunken/80 px-4 py-3 shadow-sm sm:min-w-[220px]">
                <p className="text-sm font-medium text-muted">
                  Company
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-ink">
                  {company.name}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main form shell */}
        <section className="mt-8 overflow-hidden rounded-[32px] border border-line/80 bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
          <div className="border-b border-line/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
            <p className="text-sm font-medium text-faint">
              Scorecard Setup
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink sm:text-xl">
              Scorecard Input Form
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Complete the fields below to create a scorecard for{' '}
              <span className="font-medium text-ink">{company.name}</span>.
            </p>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="space-y-5">
              <InfoCard
                icon={Calculator}
                title="How scoring works"
                description="Enter the raw points for each scorecard category below. The calculation engine will apply the configured maximums, derive the total score, and assign the resulting level on submission."
              />

              <div className="rounded-[24px] border border-line/80 bg-sunken/60 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-muted shadow-sm">
                    <FileBarChart2 className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      Legacy scorecard workflow
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      This form is intended for legacy scorecard capture. Use it
                      to record category results, preserve historical scoring,
                      and keep company performance history up to date.
                    </p>
                  </div>
                </div>
              </div>

              <form
                id="new-scorecard-form"
                action={createScorecard}
                className="space-y-8"
              >
                <input type="hidden" name="company_id" value={company.id} />

                <div className="rounded-[28px] border border-line/80 bg-gradient-to-b from-slate-50/80 to-white p-3 sm:p-4 lg:p-5">
                  <div className="rounded-[24px] border border-line/80 bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-sm sm:p-5 lg:p-6">
                    <NewScorecardForm
                      formId="new-scorecard-form"
                      initialError={error}
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}