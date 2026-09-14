import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { attachProcurementAssessment, detachProcurementAssessment } from '../actions'
import { loadGenericAssessment } from '../load'
import {
  AssessmentAside,
  Card,
  Flash,
  IndicatorTable,
  Shell,
  formatPoints,
  formatRand,
  FormCard,
} from '../ui'
import { storedCalculation, workflowForLoaded } from '../workflow-context'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProcurementPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, inputs } = loaded
  const snapshot = inputs.procurementSnapshot
  const element = preview.elements.find((candidate) => candidate.elementKey === 'preferential_procurement')
  const workflow = workflowForLoaded(loaded, 'procurement')

  const supabase = await createClient()
  const { data: candidates } = await supabase
    .from('procurement_assessments')
    .select('id, assessment_year, status, total_score, total_measured_procurement_spend')
    .eq('company_id', company.id)
    .order('assessment_year', { ascending: false })

  const candidateList = candidates ?? []
  const newProcurementHref = `/procurement/assessments/new?companyId=${company.id}`

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="procurement"
      title="Preferential Procurement — attach assessment"
      subtitle="Attach a completed Formal Procurement Assessment to this scorecard. Procurement stays separate from the workbook and is scored from the attached assessment."
      workflow={workflow}
      aside={
        <AssessmentAside
          preview={preview}
          workflow={workflow}
          stored={storedCalculation(loaded)}
        />
      }
    >
      <Flash searchParams={query} />

      {snapshot ? (
        <Card title="Attached Procurement Assessment">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="font-semibold text-slate-950">{snapshot.sourceAssessmentName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Captured</dt>
              <dd className="font-semibold text-slate-950">{new Date(snapshot.capturedAt).toLocaleString('en-ZA')}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Total measured procurement spend</dt>
              <dd className="font-semibold text-slate-950">{formatRand(snapshot.totalMeasuredProcurementSpend)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">51% Flow Through</dt>
              <dd className="font-semibold text-slate-950">{snapshot.flowThroughApplied ? 'Preserved' : 'Not applied'}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/procurement/assessments/${snapshot.sourceAssessmentId}`}
              className="text-sm font-semibold text-[#063b3f] hover:underline"
            >
              Open source assessment →
            </Link>
            <form action={detachProcurementAssessment}>
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <button type="submit" className="text-sm font-medium text-rose-700 hover:underline">
                Detach assessment
              </button>
            </form>
          </div>
          <p className="text-sm text-slate-700">
            Base points: {formatPoints(element?.basePointsAchieved)} / 25
          </p>
          <p className="text-sm text-slate-700">
            Bonus points: {formatPoints(element?.bonusPointsAchieved)} / 2
          </p>
          <p className="text-xs text-slate-500">
            Priority sub-minimum uses 40% of the 25 base points.
          </p>
        </Card>
      ) : null}

      {element ? (
        <Card title="Current score from attached assessment">
          <IndicatorTable element={element} />
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href={newProcurementHref}
          className="inline-flex rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#052e32]"
        >
          Start New Procurement Assessment
        </Link>
      </div>

      {!snapshot && candidateList.length === 0 ? (
        <Card title="No procurement assessments yet">
          <p className="text-sm text-slate-700">
            There are no Formal Procurement Assessments for this company yet. Create one first, then return here to
            attach it to the scorecard.
          </p>
          <Link
            href={newProcurementHref}
            className="mt-3 inline-flex text-sm font-semibold text-[#063b3f] underline"
          >
            Start New Procurement Assessment →
          </Link>
        </Card>
      ) : (
        <FormCard
          title={snapshot ? 'Replace attached assessment' : 'Attach existing assessment'}
          action={attachProcurementAssessment}
          submitLabel={snapshot ? 'Replace assessment' : 'Attach assessment'}
        >
          <div className="space-y-4">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            {snapshot ? <input type="hidden" name="confirmReplacement" value="yes" /> : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-800">Procurement assessment</span>
              <select
                name="procurementAssessmentId"
                required
                defaultValue={snapshot?.sourceAssessmentId ?? ''}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              >
                <option value="">Select an assessment…</option>
                {candidateList.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.assessment_year} · {candidate.status}
                    {candidate.total_score != null ? ` · ${Number(candidate.total_score).toFixed(2)} pts` : ''}
                    {candidate.total_measured_procurement_spend != null
                      ? ` · TMPS ${formatRand(Number(candidate.total_measured_procurement_spend))}`
                      : ''}
                  </option>
                ))}
              </select>
            </label>
            {snapshot ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Submitting replaces the Attached Procurement Assessment. You will need to calculate the scorecard
                again afterwards.
              </p>
            ) : null}
          </div>
        </FormCard>
      )}
    </Shell>
  )
}
