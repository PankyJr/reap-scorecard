import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, Plus } from 'lucide-react'
import { resolveTenantReadContext } from '@/lib/admin/tenant-read-context'
import { buildProcurementComparison } from '@/lib/procurement/compareAssessments'
import { procurementPointsFromStoredResults } from '@/lib/procurement/scoreSummary'
import { formatCurrency } from '@/lib/procurement/format'
import { DeleteCompanyButton } from './DeleteCompanyButton'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { PageHeader } from '@/components/ui/PageHeader'
import { KeyValueList, MoreOptions } from '@/components/ui/Card'
import { Metric, MetricStrip } from '@/components/ui/Metric'
import { Segmented } from '@/components/ui/Segmented'
import { Num } from '@/components/ui/Num'
import { formatCeiling } from '@/components/ui/format'
import { liveScore, loadLivePreviews } from '@/lib/assessments/live-preview'
import { buildScorecardView } from '@/components/scorecard/scorecard-view'
import { procurementCell } from '@/components/status/status-copy'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Term } from '@/components/ui/Term'
import { AssessmentList } from '@/components/assessments/AssessmentList'
import {
  byRecent,
  FULL_SCORECARD_LIST_COLUMNS,
  fullScorecardToRow,
  PROCUREMENT_LIST_COLUMNS,
  procurementToRow,
  type StoredFullScorecard,
  type StoredProcurement,
} from '@/lib/assessments/rows'
import { fetchAllRows } from '@/lib/procurement/supplierStore'
import { formatDate } from '@/components/ui/format'

// Design rule 17. A fixed title: the company's name would need a second read.
export const metadata = { title: 'Company' }

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ created?: string; saved?: string; tab?: string }>
}

export default async function CompanyDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = (await searchParams) ?? {}
  const { user, db, isReapInternalAdmin: isReapAdminViewer } = await resolveTenantReadContext()

  const { data: company } = await db
    .from('companies')
    .select('id, owner_id, name, industry, contact_person, email, phone, created_at, notes')
    .eq('id', id)
    .single()

  const isOwner = Boolean(company?.owner_id && company.owner_id === user.id)
  if (!company || (!isReapAdminViewer && !isOwner)) {
    notFound()
  }

  const [{ data: procurementAssessments }, { data: scorecardAssessmentRows }] = await Promise.all([
    db
      .from('procurement_assessments')
      .select(`${PROCUREMENT_LIST_COLUMNS}, total_measured_procurement_spend`)
      .eq('company_id', id)
      .order('created_at', { ascending: true }),
    db.from('scorecard_assessments').select(FULL_SCORECARD_LIST_COLUMNS).eq('company_id', id).order('created_at', { ascending: false }),
  ])

  const procurementChron = (procurementAssessments ?? []) as Array<StoredProcurement & { total_measured_procurement_spend: number | null }>
  const rows = [
    ...((scorecardAssessmentRows ?? []) as unknown as StoredFullScorecard[]).map((r) =>
      fullScorecardToRow({ ...r, company_id: r.company_id ?? id }, company.name),
    ),
    ...procurementChron.map((r) => procurementToRow({ ...r, company_id: r.company_id ?? id }, company.name)),
  ].sort(byRecent)
  const hasFull = rows.some((r) => r.kind === 'full')
  const hasProcurement = rows.some((r) => r.kind === 'procurement')

  // How procurement moved since the previous procurement scorecard.
  let procurementTrend: string | null = null
  if (procurementChron.length >= 2) {
    const prior = procurementChron[procurementChron.length - 2]!
    const latest = procurementChron[procurementChron.length - 1]!
    const { data: spendRows } = await fetchAllRows((from, to) =>
      db
        .from('procurement_suppliers')
        .select('id, assessment_id, bbbee_spend')
        .in('assessment_id', [prior.id, latest.id])
        .order('id', { ascending: true })
        .range(from, to),
    )
    const sumBbbee = (aid: string) =>
      spendRows?.filter((r) => r.assessment_id === aid).reduce((s, r) => s + Number(r.bbbee_spend ?? 0), 0) ?? 0
    const snap = buildProcurementComparison(
      {
        totalScore: Number(latest.total_score ?? 0),
        totalMeasuredSpend: Number(latest.total_measured_procurement_spend ?? 0),
        totalBbbeeSpend: sumBbbee(latest.id),
        categories: [],
        points: procurementPointsFromStoredResults(latest.procurement_results),
      },
      {
        id: prior.id,
        assessmentYear: prior.assessment_year ?? null,
        createdAt: prior.created_at ?? '',
        totalScore: Number(prior.total_score ?? 0),
        totalMeasuredSpend: Number(prior.total_measured_procurement_spend ?? 0),
        totalBbbeeSpend: sumBbbee(prior.id),
        categories: [],
        points: procurementPointsFromStoredResults(prior.procurement_results),
      },
    )
    const money = (delta: number) => (delta > 0.5 ? `up ${formatCurrency(delta)}` : delta < -0.5 ? `down ${formatCurrency(-delta)}` : 'unchanged')
    procurementTrend = `${snap.pointsSentence} Total spend ${money(snap.tmpsDelta)}. Recognised spend ${money(snap.bbbeeSpendDelta)}.`
  }


  // The live score, read exactly as Home reads it (approved exception): the
  // most recently changed full scorecard, through the same shared function.
  const fullRows = ((scorecardAssessmentRows ?? []) as unknown as StoredFullScorecard[]).slice().sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
  const latestFull = fullRows[0] ?? null
  const previews = await loadLivePreviews(db, latestFull ? [latestFull.id] : [])
  const preview = latestFull ? previews.get(latestFull.id) ?? null : null
  const score = latestFull ? liveScore(preview, latestFull.overall_result_snapshot) : null
  const view = preview ? buildScorecardView(preview) : null
  const latestProc = procurementChron.at(-1) ?? null
  const proc = latestProc ? procurementCell({ results: latestProc.procurement_results, storedTotal: latestProc.total_score }) : null
  const lastUpdated = [company.created_at, latestFull?.updated_at, latestProc?.created_at].filter((d): d is string => Boolean(d)).sort().at(-1) ?? null
  const tab = query.tab === 'details' ? 'details' : 'scorecards'

  return (
    <div className="space-y-6" data-tour="company-workspace">
      <PageHeader
        crumbs={[{ label: 'Companies', href: '/companies' }, { label: company.name }]}
        title={company.name}
        icon={Building2}
        meta={company.industry || undefined}
        actions={
          isOwner ? (
            <>
              <Link href={`/companies/${company.id}/edit`} className={buttonStyles({ variant: 'secondary' })}>
                Edit details
              </Link>
              <Link href={`/start?companyId=${company.id}`} data-tour="company-procurement-new" className={buttonStyles({ variant: 'primary' })}>
                <Plus aria-hidden /> Start a scorecard
              </Link>
            </>
          ) : null
        }
      />

      {query.created === '1' ? <Notice tone="ok">Company added. Start its first scorecard below.</Notice> : null}
      {query.saved === '1' ? <Notice tone="ok">Company details saved.</Notice> : null}
      {!isOwner ? (
        <Notice tone="info" title="REAP staff view">
          You are viewing another user’s company. Only the owner can change it.
        </Notice>
      ) : null}

      <section aria-label="At a glance" className="border-t border-line pt-6">
        <MetricStrip>
          <Metric
            label="Score"
            href={latestFull ? `/scorecards/calculator/${latestFull.id}/generic` : undefined}
            value={score ? <Num value={score.total} /> : '—'}
            sub={score ? `of ${formatCeiling(score.available)} points` : 'No full scorecard yet'}
          />
          <Metric label="Level" value={view ? view.level : '—'} sub={view ? (view.isFinal ? 'Final' : 'Not final') : 'Not started'} />
          <Metric
            label="Procurement"
            href={latestProc ? `/procurement/assessments/${latestProc.id}` : undefined}
            value={proc ? <Num value={proc.achieved} /> : '—'}
            sub={proc ? (proc.cap != null ? `of ${formatCeiling(proc.cap)} points` : 'points') : 'No procurement scorecard yet'}
          />
          <Metric label="Last updated" value={<span className="whitespace-nowrap">{formatDate(lastUpdated)}</span>} sub={`${rows.length} ${rows.length === 1 ? 'scorecard' : 'scorecards'}`} />
        </MetricStrip>
      </section>

      <section className="space-y-4 border-t border-line pt-6">
        <Segmented
          label="Company sections"
          value={tab}
          options={[
            { value: 'scorecards', label: 'Scorecards', count: rows.length, href: `/companies/${company.id}` },
            { value: 'details', label: 'Details', href: `/companies/${company.id}?tab=details` },
          ]}
        />

        {tab === 'scorecards' ? (
          <div className="space-y-4">
            {hasFull && hasProcurement ? (
              <p className="text-meta text-label">To count procurement towards the level, attach the procurement scorecard on the full scorecard’s Procurement element.</p>
            ) : null}
            {rows.length === 0 ? (
              <EmptyState
                title="No scorecards yet"
                action={
                  isOwner ? (
                    <Link href={`/start?companyId=${company.id}`} className={buttonStyles({ variant: 'primary' })}>
                      <Plus aria-hidden /> Start a scorecard
                    </Link>
                  ) : null
                }
              >
                A <Term k="fullScorecard">full scorecard</Term> gives the B-BBEE level. A{' '}
                <Term k="procurementScorecard">procurement scorecard</Term> scores supplier spend only.
              </EmptyState>
            ) : (
              <AssessmentList rows={rows} showCompany={false} rememberAs={`company-${company.id}`} />
            )}
            {procurementTrend ? (
              <p className="text-meta text-label">
                <span className="font-medium text-ink">Procurement since the previous scorecard:</span> {procurementTrend}
              </p>
            ) : null}
          </div>
        ) : (
          <KeyValueList
            items={[
              { label: 'Industry', value: company.industry || 'Not added' },
              { label: 'Contact person', value: company.contact_person || 'Not added' },
              { label: 'Email', value: company.email || 'Not added' },
              { label: 'Phone', value: company.phone || 'Not added' },
              { label: 'Added', value: formatDate(company.created_at) },
              { label: 'Notes', value: <span className="whitespace-pre-wrap">{company.notes || 'None'}</span> },
            ]}
          />
        )}
      </section>

      {isOwner ? (
        <MoreOptions label="Older and specialist tools">
          <div>
            <Link href={`/scorecards/full/new?companyId=${company.id}`} className="text-body font-medium text-teal hover:underline">
              Older workbook calculator
            </Link>
            <p className="text-meta text-label">The earlier way of scoring a workbook. Use the full scorecard instead unless you need it.</p>
          </div>
          <div className="border-t border-line pt-4">
            <p className="pb-2 text-meta text-label">Deleting removes the company and all of its scorecards for good.</p>
            <DeleteCompanyButton companyId={company.id} companyName={company.name} />
          </div>
        </MoreOptions>
      ) : null}
    </div>
  )
}
