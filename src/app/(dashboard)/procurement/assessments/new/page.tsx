import Link from 'next/link'
import { ArrowLeft, Calculator, Building2, ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { NewProcurementAssessmentForm } from './NewProcurementAssessmentForm'
import { createProcurementAssessment } from './actions'

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
    <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,1))] p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export default async function NewProcurementAssessmentPage({
  searchParams,
}: PageProps) {
  const { companyId, error } = await searchParams

  if (!companyId) {
    return (
      <div className="min-h-[70vh] bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
            <div className="relative overflow-hidden border-b border-white/10 bg-[#063b3f] px-6 py-5 sm:px-8">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(255,255,255,0.06),transparent_55%)]"
                aria-hidden
              />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Procurement
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Select a company first
                </h1>
                <p className="mt-2 text-sm leading-6 text-sky-100/85">
                  Procurement assessments are always created from a specific
                  company profile.
                </p>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
                  <Building2 className="h-5 w-5" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-800">
                  No company selected
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Go to the companies page, open a company profile, and start a
                  new procurement assessment from there.
                </p>

                <div className="mt-6">
                  <Link
                    href="/companies"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#063b3f] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#052e32]"
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
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header / hero — same palette as live score preview (slate-950 strip) */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_24px_60px_rgba(0,0,0,0.25)]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(255,255,255,0.07),transparent_52%)]"
            aria-hidden
          />

          <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <Link
                    href={`/companies/${company.id}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 text-white transition hover:border-white/25 hover:bg-white/10"
                    aria-label="Back to company"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      New Assessment
                    </span>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.15rem]">
                      New Procurement Assessment
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-[15px]">
                      Capture supplier spend, apply recognition rules, and
                      generate a procurement score for this company.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 shadow-sm ring-1 ring-white/5 sm:min-w-[210px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Company
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-white">
                  {company.name}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main form shell */}
        <section
          className="mt-8 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]"
          data-tour="scorecard-workspace"
        >
          <div className="relative overflow-hidden border-b border-white/10 bg-slate-950 px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(255,255,255,0.06),transparent_52%)]"
              aria-hidden
            />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Assessment Setup
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                Procurement Input Form
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Complete the details below to build the assessment for{' '}
                <span className="font-medium text-white">{company.name}</span>.
              </p>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="space-y-5">
              <InfoCard
                icon={Calculator}
                title="How this works"
                description="Capture the company’s procurement supplier base, measured procurement spend, and supporting details. The system will apply the relevant B-BBEE recognition rules, group suppliers into the six procurement scorecard categories, and calculate the resulting points."
              />

              <form
                id="new-procurement-assessment-form"
                action={createProcurementAssessment}
                className="space-y-8"
              >
                <input type="hidden" name="company_id" value={company.id} />

                <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-3 sm:p-4 lg:p-5">
                  <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 p-4 sm:p-5 lg:p-6">
                    <NewProcurementAssessmentForm
                      formId="new-procurement-assessment-form"
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