import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import { updateScorecardFormAction } from '../actions'
import { NewScorecardForm } from '../../new/NewScorecardForm'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function EditScorecardPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scorecard } = await supabase
    .from('scorecards')
    .select(`
      id,
      company_id,
      total_score,
      score_level,
      company:companies(id, name, owner_id)
    `)
    .eq('id', id)
    .single()

  type CompanyEmbed = { id: string; name: string | null; owner_id: string | null }
  const company = firstEmbeddedRow(
    scorecard?.company as
      | CompanyEmbed
      | CompanyEmbed[]
      | null
      | undefined,
  )
  if (!scorecard || !company || company.owner_id !== user.id) {
    notFound()
  }

  const { data: inputs } = await supabase
    .from('scorecard_inputs')
    .select('category_key,input_value')
    .eq('scorecard_id', scorecard.id)

  const byKey = new Map<string, number>(
    (inputs ?? []).map((r) => [r.category_key, Number(r.input_value)]),
  )

  const initialValues = {
    ownership: byKey.get('ownership') ?? 0,
    management_control: byKey.get('management_control') ?? 0,
    skills_development: byKey.get('skills_development') ?? 0,
    enterprise_development: byKey.get('enterprise_development') ?? 0,
    socio_economic_development: byKey.get('socio_economic_development') ?? 0,
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.05),transparent_30%),linear-gradient(to_bottom,#f8fafc,#f8fafc)]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header / hero */}
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.05),transparent_28%)]" />

          <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <Link
                    href={`/companies/${company.id}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    aria-label="Back to company"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Edit Scorecard
                    </span>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">
                      Update legacy inputs
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px]">
                      Modify the inputs below for{' '}
                      <span className="font-medium text-slate-800">{company.name ?? 'this company'}</span>. Saving will recalculate totals and results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main form shell */}
        <section className="mt-8 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Scorecard Setup
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              Edit scorecard inputs
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Current totals will refresh when you save.
            </p>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="space-y-5">
              <form
                id="edit-scorecard-form"
                action={updateScorecardFormAction}
                className="space-y-8"
              >
                <input type="hidden" name="scorecard_id" value={scorecard.id} />

                <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/40 p-3 sm:p-4 lg:p-5">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                    <NewScorecardForm
                      formId="edit-scorecard-form"
                      initialError={error}
                      initialValues={initialValues}
                      cancelHref={`/scorecards/${scorecard.id}`}
                      cancelLabel="Cancel"
                      saveLabel="Save changes"
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

