import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getScorecardElementAdapter } from '@/lib/scorecard/calculator/elements/registry'
import { describeAssessmentScope } from '@/lib/scorecard/calculator/assessment/scope'
import type { ScorecardElementKey } from '@/lib/scorecard/calculator/types'

type PageProps = { params: Promise<{ assessmentId: string }> }

const statusStyles: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-700',
  file_uploaded: 'bg-sky-50 text-sky-800',
  needs_review: 'bg-amber-50 text-amber-900',
  ready_to_calculate: 'bg-teal-50 text-teal-900',
  calculated: 'bg-emerald-50 text-emerald-900',
  complete: 'bg-emerald-100 text-emerald-950',
  error: 'bg-red-50 text-red-800',
}

export default async function CalculatorAssessmentPage({ params }: PageProps) {
  const { assessmentId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: assessment } = await supabase
    .from('scorecard_assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle()

  if (!assessment) notFound()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', assessment.company_id)
    .maybeSingle()

  if (!company || company.owner_id !== user.id) notFound()

  const { data: elements } = await supabase
    .from('scorecard_assessment_elements')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('element_key')

  const selected = (assessment.selected_elements ?? []) as ScorecardElementKey[]
  const scope = describeAssessmentScope({
    scopeMode: assessment.scope_mode,
    selectedElements: selected,
  })

  const combinedPoints = (elements ?? []).reduce((sum, el) => {
    const pts = (el.result_snapshot as { pointsAchieved?: number | null } | null)?.pointsAchieved
    return sum + (typeof pts === 'number' ? pts : 0)
  }, 0)

  return (
    <div className="min-h-[70vh] bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/companies/${company.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← {company.name}
          </Link>
          <div className="flex gap-2">
            <Link
              href={`/scorecards/calculator/${assessmentId}/generic`}
              className="rounded-xl bg-[#063b3f] px-4 py-2 text-sm font-semibold text-white"
            >
              Generic scorecard workspace
            </Link>
            <Link
              href={`/scorecards/calculator/${assessmentId}/report`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Printable report
            </Link>
          </div>
        </div>

        <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Scorecard Assessment · Full Scorecard Calculator
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{assessment.name}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">{company.name}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Year {assessment.measurement_year}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{assessment.status}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{scope.label}</span>
          </div>
          {scope.honestyMessage && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {scope.honestyMessage}
            </p>
          )}
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected elements</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{selected.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Combined selected points</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{combinedPoints.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-500">Not a complete B-BBEE level</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rule version</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{assessment.rule_version}</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Element workspace</h2>
          <div className="grid gap-3">
            {(elements ?? []).map((el) => {
              const adapter = getScorecardElementAdapter(el.element_key as ScorecardElementKey)
              const pts = (el.result_snapshot as { pointsAchieved?: number | null } | null)?.pointsAchieved
              const total = (el.import_snapshot as { platformTotalRecognised?: number | null } | null)
                ?.platformTotalRecognised
              return (
                <Link
                  key={el.id}
                  href={`/scorecards/calculator/${assessmentId}/elements/${el.element_key}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-[#063b3f]/35"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{adapter.elementName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {el.upload_filename ? `File: ${el.upload_filename}` : 'No file uploaded'}
                      {typeof total === 'number' ? ` · Recognised R${total.toLocaleString('en-ZA')}` : ''}
                      {typeof pts === 'number' ? ` · ${pts} pts` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      statusStyles[el.status] ?? 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {String(el.status).replace(/_/g, ' ')}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
