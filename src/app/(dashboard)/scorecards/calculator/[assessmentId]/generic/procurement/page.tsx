import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { attachProcurementAssessment, detachProcurementAssessment } from '../actions'
import { loadGenericAssessment } from '../load'
import { Flash, Shell, formatRand, FormCard } from '../ui'
import { workflowForLoaded, workspaceFor } from '../workflow-context'
import { AreaIntro } from '../workspace'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { Panel, MoreOptions, FactList } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'

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
  const workflow = workflowForLoaded(loaded, 'procurement')

  const supabase = await createClient()
  const { data: candidates } = await supabase
    .from('procurement_assessments')
    .select('id, assessment_year, status, total_score, total_measured_procurement_spend')
    .eq('company_id', company.id)
    .order('assessment_year', { ascending: false })

  const candidateList = candidates ?? []
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const newProcurementHref = `/procurement/assessments/new?companyId=${company.id}&returnTo=${encodeURIComponent(`${base}/procurement`)}`
  const createdId = typeof query.created === 'string' ? query.created : null
  const createdExists = createdId ? candidateList.some((c) => c.id === createdId) : false
  const selected = (createdExists ? createdId : null) ?? snapshot?.sourceAssessmentId ?? ''

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="procurement"
      title="Preferential procurement"
      subtitle={`${AREA_COPY.preferential_procurement.measures} Scored from a procurement scorecard you attach.`}
      workflow={workflow}
      workspace={workspaceFor(loaded, workflow, 'preferential_procurement')}
    >
      <Flash searchParams={query} />
      {createdExists ? (
        <Notice tone="ok" title="Procurement scorecard saved">
          It is selected below. Press Attach to use it in this full scorecard.
        </Notice>
      ) : null}

      {snapshot ? (
        <Panel
          title="Attached procurement scorecard"
          actions={
            <Link href={`/procurement/assessments/${snapshot.sourceAssessmentId}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              Open it
            </Link>
          }
        >
          <FactList
            items={[
              { label: 'Procurement scorecard', value: snapshot.sourceAssessmentName },
              { label: 'Copied into this scorecard', value: new Date(snapshot.capturedAt).toLocaleString('en-ZA') },
              { label: <Term k="tmps">Total spend (TMPS)</Term>, value: formatRand(snapshot.totalMeasuredProcurementSpend) },
              { label: <Term k="flowThrough">51% flow-through</Term>, value: snapshot.flowThroughApplied ? 'Used' : 'Not used' },
            ]}
          />
          <p className="mt-4 text-[15px] text-muted">
            The full scorecard keeps a copy taken when you attached it. If you change the procurement scorecard later, attach
            it again to bring the changes in.
          </p>
          <form action={detachProcurementAssessment} className="mt-3">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <button type="submit" className="text-[15px] font-semibold text-bad hover:underline">
              Detach it
            </button>
          </form>
        </Panel>
      ) : null}

      <AreaIntro areaKey="preferential_procurement" preview={preview} />

      {candidateList.length === 0 ? (
        <Panel
          id="inputs"
          title="This company has no procurement scorecard yet"
          description="Create one: enter the total spend and the suppliers. When you save, you come straight back here to attach it."
        >
          <Link href={newProcurementHref} className={buttonStyles({ variant: 'primary' })}>
            Create a procurement scorecard
          </Link>
        </Panel>
      ) : (
        <FormCard
          id="inputs"
          title={snapshot ? 'Attach a different procurement scorecard' : 'Attach a procurement scorecard'}
          description="Choose one of this company’s procurement scorecards."
          action={attachProcurementAssessment}
          submitLabel={snapshot ? 'Replace and attach' : 'Attach'}
        >
          <input type="hidden" name="assessmentId" value={assessmentId} />
          {snapshot ? <input type="hidden" name="confirmReplacement" value="yes" /> : null}
          <label className="block space-y-1.5">
            <span className="block text-[15px] font-semibold text-ink">Procurement scorecard</span>
            <select
              name="procurementAssessmentId"
              required
              defaultValue={selected}
              className="block w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink"
            >
              <option value="">Choose one…</option>
              {candidateList.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.assessment_year}
                  {candidate.total_score != null ? `: ${Number(candidate.total_score).toFixed(2)} of 29 points` : ''}
                  {candidate.total_measured_procurement_spend != null
                    ? `, total spend ${formatRand(Number(candidate.total_measured_procurement_spend))}`
                    : ''}
                </option>
              ))}
            </select>
          </label>
          {snapshot ? (
            <p className="text-[15px] text-warn">This replaces the attached one. Calculate the scorecard again afterwards.</p>
          ) : null}
          <p className="text-[15px] text-muted">
            Or{' '}
            <Link href={newProcurementHref} className="font-semibold text-brand hover:underline">
              create a new procurement scorecard
            </Link>
            .
          </p>
        </FormCard>
      )}

      <MoreOptions label="Why 29 points there, and at most 27 here?">
        <p className="text-[15px] text-ink">
          A procurement scorecard adds up five categories worth 27 points, plus 2 <Term k="bonusPoints">bonus points</Term>{' '}
          for buying from designated group suppliers: 29 in total.
        </p>
        <p className="text-[15px] text-ink">
          When it is attached here, the full scorecard works out the same percentages again under the Generic Codes and
          counts at most 25 of the category points, plus up to the same 2 bonus points: 27 at most. The bonus points are kept
          separate; they never fill the 25. So a company scoring 26 of 27 on its procurement scorecard gets 25 here.
        </p>
        <p className="text-[15px] text-muted">
          The 40% sub-minimum for this element is measured against the 25 points.
        </p>
      </MoreOptions>
    </Shell>
  )
}
