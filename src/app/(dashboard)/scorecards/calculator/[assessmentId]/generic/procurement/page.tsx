import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { attachProcurementAssessment, detachProcurementAssessment } from '../actions'
import { loadGenericAssessment } from '../load'
import { Card, Flash, IndicatorTable, ResultSummary, Shell, formatPoints, formatRand, FormCard} from '../ui'

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

  const supabase = await createClient()
  const { data: candidates } = await supabase
    .from('procurement_assessments')
    .select('id, assessment_year, status, total_score, total_measured_procurement_spend')
    .eq('company_id', company.id)
    .order('assessment_year', { ascending: false })

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current="procurement"
      title="Preferential Procurement — attach frozen snapshot"
      subtitle="Do not rebuild the supplier importer here. Select an existing Formal Procurement Assessment, freeze its measured spend ratios, and score them against the selected rule set. Replacing the snapshot requires an explicit confirmation."
      aside={<ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />}
    >
      <Flash searchParams={query} />

      {snapshot ? (
        <Card title="Attached procurement snapshot">
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
              href={`/procurement/${snapshot.sourceAssessmentId}`}
              className="text-sm font-semibold text-[#063b3f] hover:underline"
            >
              Open source assessment →
            </Link>
            <form action={detachProcurementAssessment}>
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <button type="submit" className="text-sm font-medium text-rose-700 hover:underline">
                Detach snapshot
              </button>
            </form>
          </div>
          <p className="text-xs text-slate-500">
            Base / bonus separation: {formatPoints(element?.basePointsAchieved)} / 27 base ·{' '}
            {formatPoints(element?.bonusPointsAchieved)} / 2 bonus. Priority sub-minimum uses 40% of 25 base points.
          </p>
        </Card>
      ) : null}

      {element ? (
        <Card title="Current score from snapshot">
          <IndicatorTable element={element} />
        </Card>
      ) : null}

      <FormCard title={snapshot ? 'Replace attached assessment' : 'Attach a completed assessment'} action={attachProcurementAssessment} submitLabel={snapshot ? 'Replace snapshot' : 'Attach snapshot'}>
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
              {(candidates ?? []).map((candidate) => (
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
              Submitting replaces the frozen snapshot. The overall scorecard will require an explicit recalculation.
            </p>
          ) : null}
          </div>
        </FormCard>
    </Shell>
  )
}
