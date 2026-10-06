import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import {
  combinedReportScore,
  elementLabel,
  elementPoints,
  formatReportPoints,
  hasCalculatedResult,
} from './report-view-model'
import { describeAssessmentScope } from '@/lib/scorecard/calculator/assessment/scope'
import type { ScorecardElementKey } from '@/lib/scorecard/calculator/types'
import { PrintReportButton } from '@/components/scorecards/PrintReportButton'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { LevelLadder } from '@/components/ui/LevelLadder'

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

  const ORDER = [
    'ownership',
    'management_control',
    'skills_development',
    'preferential_procurement',
    'enterprise_development',
    'supplier_development',
    'socio_economic_development',
  ]
  const orderedElements = [...(elements ?? [])].sort(
    (a, b) => ORDER.indexOf(String(a.element_key)) - ORDER.indexOf(String(b.element_key)),
  )
  const STATUS_WORDS: Record<string, string> = {
    calculated: 'Calculated',
    complete: 'Complete',
    needs_review: 'Needs input',
    not_started: 'Not started',
    ready_to_calculate: 'Ready',
    file_uploaded: 'File uploaded',
    error: 'Error',
  }
  const overall = assessment.overall_result_snapshot as {
    prioritySubminimums?: Array<{ key: string; label: string; passed: boolean | null; explanation: string }>
    readiness?: { reasons?: string[] }
  } | null
  const selected = (assessment.selected_elements ?? []) as ScorecardElementKey[]
  const scope = describeAssessmentScope({
    scopeMode: assessment.scope_mode,
    selectedElements: selected,
  })

  const combined = combinedReportScore({
    overallResultSnapshot: assessment.overall_result_snapshot,
    elements,
  })

  // A generic (Codes) assessment carries its own rule set and overall result.
  // The modular-calculator wording ("selected-element score") does not apply.
  const isGeneric = typeof assessment.rule_set_key === 'string' && assessment.rule_set_key.length > 0
  const finalLevel = typeof assessment.final_level === 'string' ? assessment.final_level : null
  const preliminaryLevel =
    typeof assessment.preliminary_level === 'string' ? assessment.preliminary_level : null
  const recognition =
    assessment.recognition_percentage == null ? null : Number(assessment.recognition_percentage)
  const scopeLabel = isGeneric ? 'Full generic scorecard' : scope.label
  const honestyMessage = isGeneric
    ? finalLevel
      ? null
      : 'Preliminary result. A final B-BBEE level is only shown once every area is complete and the scorecard has been calculated.'
    : scope.honestyMessage

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
      <div className="min-h-screen bg-surface px-6 py-10 text-ink">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href={backHref} className="text-sm font-medium text-muted hover:text-ink">
            ← Back to assessment
          </Link>
          <div>
            <p className="text-sm font-semibold  text-muted">Printable report</p>
            <h1 className="mt-1 text-2xl font-semibold">{assessment.name}</h1>
            <p className="mt-1 text-sm text-muted">{company.name}</p>
          </div>
          <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
            <p className="font-medium">This assessment has not been calculated yet.</p>
            <p className="mt-1">
              A report is produced from a calculated result. Complete the outstanding elements and run the
              calculation, then come back here.
            </p>
          </div>
          <Link
            href={backHref}
            className="inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Go to the assessment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface px-6 py-10 text-ink print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl space-y-8 print:max-w-none">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div>
            <Link href={backHref} className="text-sm font-medium text-muted hover:text-ink">
              ← Back to assessment
            </Link>
            <p className="mt-2 text-base text-muted">Report, ready to download or print</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/scorecards/calculator/${encodeURIComponent(assessmentId)}/pdf`} className={buttonStyles({ variant: 'primary' })}>
              Download PDF
            </a>
            <PrintReportButton />
          </div>
        </div>

        <header className="border-b border-line pb-6">
          <p className="text-sm font-semibold  text-brand">
            REAP Scorecard · B-BBEE scorecard report
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">{assessment.name}</h1>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Company</dt>
              <dd className="font-medium">{company.name}</dd>
            </div>
            <div>
              <dt className="text-muted">Measurement year</dt>
              <dd className="font-medium">{assessment.measurement_year}</dd>
            </div>
            <div>
              <dt className="text-muted">Assessment scope</dt>
              <dd className="font-medium">{scopeLabel}</dd>
            </div>
            <div>
              <dt className="text-muted">Rules</dt>
              <dd className="font-medium">{assessment.rule_version}</dd>
            </div>
            <div>
              <dt className="text-muted">Workforce targets</dt>
              <dd className="font-medium">
                {eapSnap
                  ? `${eapSnap.name ?? 'Snapshot'} · v${eapSnap.version ?? '?'} · ${eapSnap.year ?? ''}`
                  : assessment.eap_target_set_id
                    ? 'Attached, used at the next calculation'
                    : 'None attached'}
              </dd>
            </div>
          </dl>
          {honestyMessage && (
            <p className="mt-4 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
              {honestyMessage}
            </p>
          )}
        </header>

        <section className="space-y-4 print-avoid-break-inside">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
            <div>
              <h2 className="text-base text-muted">{isGeneric ? 'B-BBEE level' : 'Points for the selected areas'}</h2>
              <p className="font-serif text-4xl font-semibold">
                {isGeneric ? (finalLevel ?? 'Not final yet') : `${combined.toFixed(2)} points`}
              </p>
              {isGeneric ? (
                <p className="mt-1 text-base">
                  {combined.toFixed(2)} points in total
                  {finalLevel && recognition != null ? `. Customers can count ${recognition}% of what they spend with this company.` : '.'}
                </p>
              ) : (
                <p className="mt-1 text-base text-muted">A B-BBEE level is not given for selected areas only.</p>
              )}
              {isGeneric && !finalLevel && preliminaryLevel ? (
                <p className="mt-1 text-sm text-muted">The points alone would reach {preliminaryLevel}; it is not final until nothing is missing.</p>
              ) : null}
            </div>
            {isGeneric ? <LevelLadder level={finalLevel} /> : null}
          </div>

          <table className="w-full text-left text-[15px]">
            <thead className="border-b-2 border-line-strong text-sm text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">Area</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Points</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Bonus</th>
                <th scope="col" className="py-2 font-semibold">State</th>
              </tr>
            </thead>
            <tbody>
              {orderedElements.map((el) => {
                const points = elementPoints(el.result_snapshot)
                return (
                  <tr key={el.id} className="border-b border-line">
                    <td className="py-2 pr-3">{elementLabel(String(el.element_key))}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatReportPoints(points.achieved, points.available)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-muted">
                      {points.bonusAvailable != null && points.bonusAvailable > 0 ? formatReportPoints(points.bonusAchieved, points.bonusAvailable) : '—'}
                    </td>
                    <td className="py-2 text-muted">{STATUS_WORDS[String(el.status)] ?? String(el.status).replace(/_/g, ' ')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {(overall?.prioritySubminimums ?? []).length > 0 ? (
            <div>
              <h3 className="text-base font-semibold">Priority sub-minimums</h3>
              <p className="text-sm text-muted">Each must reach 40% of its points, or the level drops by one.</p>
              <ul className="mt-2 space-y-1 text-[15px]">
                {overall!.prioritySubminimums!.map((p) => (
                  <li key={p.key}>
                    <strong>{p.label}</strong>: {p.passed === true ? 'met' : p.passed === false ? 'missed' : 'not tested yet'}. {p.explanation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Each area in detail</h2>
          {orderedElements.map((el) => {
            const label = elementLabel(String(el.element_key))
            const points = elementPoints(el.result_snapshot)
            const result = el.result_snapshot as {
              explanation?: string
              warnings?: string[]
              ruleVersion?: string
            } | null
            const preview = el.import_snapshot as { platformTotalRecognised?: number | null } | null
            return (
              <article key={el.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{label}</h3>
                  <p className="text-sm text-muted">{STATUS_WORDS[String(el.status)] ?? String(el.status).replace(/_/g, ' ')}</p>
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Upload</dt>
                    <dd>{el.upload_filename ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Sheet</dt>
                    <dd>{el.sheet_name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Recognised total</dt>
                    <dd>
                      {preview?.platformTotalRecognised != null
                        ? `R${preview.platformTotalRecognised.toLocaleString('en-ZA')}`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Points</dt>
                    <dd>
                      {formatReportPoints(points.achieved, points.available)}
                      {points.bonusAvailable != null && points.bonusAvailable > 0 ? (
                        <span className="text-muted">
                          {' '}
                          · bonus {formatReportPoints(points.bonusAchieved, points.bonusAvailable)}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Calculation rule</dt>
                    <dd>{result?.ruleVersion ?? el.calculation_rule_version ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Calculated at</dt>
                    <dd>{el.calculated_at ? new Date(el.calculated_at).toLocaleString('en-ZA') : '—'}</dd>
                  </div>
                </dl>
                {result?.explanation && <p className="mt-3 text-sm text-ink">{result.explanation}</p>}
                {(result?.warnings ?? []).length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-warn">
                    {[...new Set(result!.warnings!)].map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Still to complete</h2>
          {missing.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Every area has been calculated.</p>
          ) : (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {missing.map((key) => (
                <li key={key}>{elementLabel(String(key))}</li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-sm text-muted print:mt-8">
          Download the PDF, or press Print. This report comes from the REAP Scorecard calculator; it is a draft, not a verified B-BBEE certificate.
        </p>
      </div>
    </div>
  )
}
