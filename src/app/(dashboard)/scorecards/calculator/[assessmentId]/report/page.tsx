import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { elementLabel, hasCalculatedResult } from './report-view-model'
import { describeAssessmentScope } from '@/lib/scorecard/calculator/assessment/scope'
import type { ScorecardElementKey } from '@/lib/scorecard/calculator/types'
import { PrintReportButton } from '@/components/scorecards/PrintReportButton'

type PageProps = { params: Promise<{ assessmentId: string }> }

export default async function CalculatorReportPage({ params }: PageProps) {
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

  const combined = (elements ?? []).reduce((sum, el) => {
    const pts = (el.result_snapshot as { pointsAchieved?: number | null } | null)?.pointsAchieved
    return sum + (typeof pts === 'number' ? pts : 0)
  }, 0)

  const missing = selected.filter((key) => {
    const el = (elements ?? []).find((e) => e.element_key === key)
    return !el || !['calculated', 'complete'].includes(el.status)
  })

  const eapSnap = assessment.eap_target_snapshot as { name?: string; version?: number; year?: number } | null

  const backHref = `/scorecards/calculator/${assessmentId}/generic`

  const calculated = hasCalculatedResult({
    overallResultSnapshot: assessment.overall_result_snapshot,
    elements,
  })

  if (!calculated) {
    return (
      <div className="min-h-screen bg-white px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href={backHref} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to assessment
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Printable report</p>
            <h1 className="mt-1 text-2xl font-semibold">{assessment.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{company.name}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">This assessment has not been calculated yet.</p>
            <p className="mt-1">
              A report is produced from a calculated result. Complete the outstanding elements and run the
              calculation, then come back here.
            </p>
          </div>
          <Link
            href={backHref}
            className="inline-flex rounded-xl bg-[#063b3f] px-4 py-2 text-sm font-medium text-white"
          >
            Go to the assessment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10 text-slate-900 print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-8 print:max-w-none">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div>
            <Link href={backHref} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              ← Back to assessment
            </Link>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Printable report
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Assessment</h1>
          </div>
          <PrintReportButton />
        </div>

        <header className="border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#063b3f]">
            REAP · Full Scorecard Calculator
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{assessment.name}</h1>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Company</dt>
              <dd className="font-medium">{company.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Measurement year</dt>
              <dd className="font-medium">{assessment.measurement_year}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Assessment scope</dt>
              <dd className="font-medium">{scope.label}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium capitalize">{assessment.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Calculator rule version</dt>
              <dd className="font-medium">{assessment.rule_version}</dd>
            </div>
            <div>
              <dt className="text-slate-500">EAP target version</dt>
              <dd className="font-medium">
                {eapSnap
                  ? `${eapSnap.name ?? 'Snapshot'} · v${eapSnap.version ?? '?'} · ${eapSnap.year ?? ''}`
                  : assessment.eap_target_set_id
                    ? 'Linked set (no snapshot yet)'
                    : 'Not applied'}
              </dd>
            </div>
          </dl>
          {scope.honestyMessage && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {scope.honestyMessage}
            </p>
          )}
        </header>

        <section>
          <h2 className="text-lg font-semibold">Combined selected-element score</h2>
          <p className="mt-2 text-3xl font-semibold">{combined.toFixed(2)} points</p>
          <p className="mt-1 text-sm text-slate-600">
            Overall B-BBEE level is not shown for partial or incomplete scope.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Element results</h2>
          {(elements ?? []).map((el) => {
            const label = elementLabel(String(el.element_key))
            const result = el.result_snapshot as {
              pointsAchieved?: number | null
              pointsAvailable?: number | null
              explanation?: string
              warnings?: string[]
              ruleVersion?: string
            } | null
            const preview = el.import_snapshot as { platformTotalRecognised?: number | null } | null
            return (
              <article key={el.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{label}</h3>
                  <p className="text-sm capitalize text-slate-600">{String(el.status).replace(/_/g, ' ')}</p>
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Upload</dt>
                    <dd>{el.upload_filename ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Sheet</dt>
                    <dd>{el.sheet_name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Recognised total</dt>
                    <dd>
                      {preview?.platformTotalRecognised != null
                        ? `R${preview.platformTotalRecognised.toLocaleString('en-ZA')}`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Points</dt>
                    <dd>
                      {result?.pointsAchieved ?? '—'} / {result?.pointsAvailable ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Calculation rule</dt>
                    <dd>{result?.ruleVersion ?? el.calculation_rule_version ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Calculated at</dt>
                    <dd>{el.calculated_at ? new Date(el.calculated_at).toLocaleString('en-ZA') : '—'}</dd>
                  </div>
                </dl>
                {result?.explanation && <p className="mt-3 text-sm text-slate-700">{result.explanation}</p>}
                {(result?.warnings ?? []).length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                    {result!.warnings!.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Missing / incomplete elements</h2>
          {missing.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">All selected elements have a calculated status.</p>
          ) : (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {missing.map((key) => (
                <li key={key}>{elementLabel(String(key))}</li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-slate-500 print:mt-8">
          Use browser Print / Save as PDF. Server Chromium PDF is not claimed for this calculator release.
        </p>
      </div>
    </div>
  )
}
