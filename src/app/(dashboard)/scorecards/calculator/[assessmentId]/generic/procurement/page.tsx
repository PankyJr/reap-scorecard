import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { attachProcurementAssessment, detachProcurementAssessment } from '../actions'
import { loadGenericAssessment } from '../load'
import { Flash, Shell, formatRand, FormCard } from '../ui'
import { workflowForLoaded, workspaceFor } from '../workflow-context'
import { AreaIntro } from '../workspace'
import { AREA_COPY } from '@/lib/scorecard/generic/ux/areas'
import { Card, MoreOptions, FactList } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { EmptyState } from '@/components/ui/EmptyState'
import { HelpLink } from '@/components/help/HelpLink'
import { PageHelpData } from '@/components/help/PageHelpData'
import type { ProcurementAreaHelpData } from '@/content/page-help'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { PROCUREMENT_CATEGORIES, isProcurementBonusCategory } from '@/lib/procurement/config'
import { formatPoints } from '@/lib/procurement/format'
import { procurementScoreText, type StoredProcurementLinePoints } from '@/lib/procurement/scoreSummary'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Procurement' }

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
    .select('id, assessment_year, status, total_score, total_measured_procurement_spend, procurement_results(category_key, points_achieved)')
    .eq('company_id', company.id)
    .order('assessment_year', { ascending: false })

  const candidateList = candidates ?? []
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const newProcurementHref = `/procurement/assessments/new?companyId=${company.id}&returnTo=${encodeURIComponent(`${base}/procurement`)}`
  const createdId = typeof query.created === 'string' ? query.created : null
  const createdExists = createdId ? candidateList.some((c) => c.id === createdId) : false
  const selected = (createdExists ? createdId : null) ?? snapshot?.sourceAssessmentId ?? ''

  // For "How procurement points count here": every figure from the engine's rule set.
  const baseLines = PROCUREMENT_CATEGORIES.filter((c) => !isProcurementBonusCategory(c.key))
  const bonusLines = PROCUREMENT_CATEGORIES.filter((c) => isProcurementBonusCategory(c.key))
  const baseLinesWorth = baseLines.reduce((sum, c) => sum + c.availablePoints, 0)
  const bonusLinesWorth = bonusLines.reduce((sum, c) => sum + c.availablePoints, 0)
  const subMinimum = preview.ruleSet.prioritySubminimums.find((rule) => rule.elementKey === 'preferential_procurement')
  const workspace = workspaceFor(loaded, workflow, 'preferential_procurement')

  // Page help: what this page already knows, for the help panel's "next".
  // (Optional chaining: a test renders this page with a preview that has only the rule set.)
  const minimumOutcome = preview.prioritySubminimums?.find((s) => s.elementKey === 'preferential_procurement')
  const helpData: ProcurementAreaHelpData = {
    pageHref: `${base}/procurement`,
    attached: Boolean(snapshot),
    candidates: candidateList.length,
    createHref: newProcurementHref,
    sourceHref: snapshot ? `/procurement/assessments/${snapshot.sourceAssessmentId}` : null,
    belowMinimum: Boolean(minimumOutcome?.evaluated && minimumOutcome.passed === false),
    next: workspace?.next ? { label: workspace.next.label, href: workspace.next.href } : null,
    reviewHref: workspace?.reviewHref ?? `${base}/review`,
  }

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
      workspace={workspace}
    >
      <PageHelpData page="area-procurement" data={helpData} />
      <Flash searchParams={query} />
      {createdExists ? (
        <Notice tone="ok" title="Procurement scorecard saved">
          It is selected below. Press Attach to use it in this full scorecard.
        </Notice>
      ) : null}

      {snapshot ? (
        <Card
          data-help="procurement-attached"
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
          <p className="mt-4 text-body text-label">
            The full scorecard keeps a copy taken when you attached it. If you change the procurement scorecard later, attach
            it again to bring the changes in.
          </p>
          <form action={detachProcurementAssessment} className="mt-3">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <button type="submit" className="text-body font-semibold text-bad hover:underline">
              Detach it
            </button>
          </form>
        </Card>
      ) : null}

      <AreaIntro areaKey="preferential_procurement" preview={preview} company={company.name} />

      {candidateList.length === 0 ? (
        <Card id="inputs" data-help="procurement-attach">
          <EmptyState
            icon={<ShoppingCart aria-hidden />}
            title="This company has no procurement scorecard yet"
            action={
              <Link href={newProcurementHref} className={buttonStyles({ variant: 'primary' })}>
                Create a procurement scorecard
              </Link>
            }
          >
            <p>
              Create one: enter the total spend and each supplier with its B-BBEE level. When you save, you come straight
              back here to attach it.
            </p>
            <HelpLink />
          </EmptyState>
        </Card>
      ) : (
        <div data-help="procurement-attach">
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
            <span className="block text-body font-semibold text-ink">Procurement scorecard</span>
            <select
              name="procurementAssessmentId"
              required
              defaultValue={selected}
              className="block w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-body text-ink"
            >
              <option value="">Choose one…</option>
              {candidateList.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.assessment_year}
                  {`: ${procurementScoreText({
                    results: (candidate as { procurement_results?: StoredProcurementLinePoints[] | null }).procurement_results,
                    storedTotal: candidate.total_score,
                  })}`}
                  {candidate.total_measured_procurement_spend != null
                    ? `, total spend ${formatRand(Number(candidate.total_measured_procurement_spend))}`
                    : ''}
                </option>
              ))}
            </select>
            {/* TODO-VERIFY: that the procurement scorecard should cover the same financial year as the full scorecard (not checked by the app). */}
            <span className="block text-meta text-label">
              One of this company’s procurement scorecards, ideally for the same financial year as this one. Each choice
              shows its year, its points and its total spend (<Term k="tmps">TMPS</Term>). For example: 2025: 18.40 of 25
              points, bonus 1.00 of 2, total spend R 12 000 000.
            </span>
          </label>
          {snapshot ? (
            <p className="text-body text-warn">This replaces the attached one. Calculate the scorecard again afterwards.</p>
          ) : null}
          <p className="text-body text-label">
            Or{' '}
            <Link href={newProcurementHref} className="font-semibold text-teal hover:underline">
              create a new procurement scorecard
            </Link>
            .
          </p>
        </FormCard>
        </div>
      )}

      <MoreOptions label="How procurement points count here">
        <p className="text-body text-ink">
          A procurement scorecard has {baseLines.length} indicators worth {formatPoints(baseLinesWorth, 0)} points together, and{' '}
          {bonusLines.length === 1 ? 'one' : bonusLines.length} <Term k="bonusPoints">bonus</Term>{' '}
          {bonusLines.length === 1 ? 'indicator' : 'indicators'} worth {formatPoints(bonusLinesWorth, 0)} more for buying from
          designated group suppliers.
        </p>
        <p className="text-body text-ink">
          The scorecard counts at most {PROCUREMENT_BASE_CAP} of those {formatPoints(baseLinesWorth, 0)} points and keeps the
          bonus apart, up to {PROCUREMENT_BONUS_CAP}; the bonus never fills the {PROCUREMENT_BASE_CAP}. The procurement scorecard
          and this full scorecard count it the same way, so both show the same points, written as &ldquo;X of{' '}
          {PROCUREMENT_BASE_CAP} points, bonus Y of {PROCUREMENT_BONUS_CAP}&rdquo;.
        </p>
        <p className="text-body text-ink">
          When you attach one, this scorecard works out the points again from the copy of the spend figures it keeps, with
          the rules this full scorecard uses. If the procurement scorecard is changed later, attach it again to bring the
          change in.
        </p>
        {subMinimum ? (
          <p className="text-body text-label">
            The <Term k="subMinimum">priority sub-minimum</Term> for this area is {Math.round(subMinimum.fraction * 100)}% of{' '}
            {formatPoints(subMinimum.basisPoints, 0)} points: at least {formatPoints(subMinimum.fraction * subMinimum.basisPoints)}{' '}
            base points.
          </p>
        ) : null}
      </MoreOptions>
    </Shell>
  )
}
