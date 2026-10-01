import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClipboardList, FileBarChart2, Plus } from 'lucide-react'
import { resolveTenantReadContext } from '@/lib/admin/tenant-read-context'
import { buildProcurementComparison, formatSignedPoints } from '@/lib/procurement/compareAssessments'
import { formatCurrency } from '@/lib/procurement/format'
import { DeleteCompanyButton } from './DeleteCompanyButton'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { PageHeader } from '@/components/ui/PageHeader'
import { FactList, MoreOptions, Panel } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Term } from '@/components/ui/Term'
import { AssessmentList } from '@/components/assessments/AssessmentList'
import {
  byRecent,
  FULL_SCORECARD_LIST_COLUMNS,
  fullScorecardToRow,
  procurementToRow,
  type StoredFullScorecard,
  type StoredProcurement,
} from '@/lib/assessments/rows'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ created?: string; saved?: string }>
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
      .select('id, company_id, assessment_year, total_score, created_at, total_measured_procurement_spend')
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
    const { data: spendRows } = await db
      .from('procurement_suppliers')
      .select('assessment_id, bbbee_spend')
      .in('assessment_id', [prior.id, latest.id])
    const sumBbbee = (aid: string) =>
      spendRows?.filter((r) => r.assessment_id === aid).reduce((s, r) => s + Number(r.bbbee_spend ?? 0), 0) ?? 0
    const snap = buildProcurementComparison(
      {
        totalScore: Number(latest.total_score ?? 0),
        totalMeasuredSpend: Number(latest.total_measured_procurement_spend ?? 0),
        totalBbbeeSpend: sumBbbee(latest.id),
        categories: [],
      },
      {
        id: prior.id,
        assessmentYear: prior.assessment_year ?? null,
        createdAt: prior.created_at ?? '',
        totalScore: Number(prior.total_score ?? 0),
        totalMeasuredSpend: Number(prior.total_measured_procurement_spend ?? 0),
        totalBbbeeSpend: sumBbbee(prior.id),
        categories: [],
      },
    )
    const money = (delta: number) => (delta > 0.5 ? `up ${formatCurrency(delta)}` : delta < -0.5 ? `down ${formatCurrency(-delta)}` : 'unchanged')
    procurementTrend = `Points ${formatSignedPoints(snap.scoreDelta)}. Total spend ${money(snap.tmpsDelta)}. Recognised spend ${money(snap.bbbeeSpendDelta)}.`
  }

  const startFull = `/scorecards/new?companyId=${company.id}`
  const startProcurement = `/procurement/assessments/new?companyId=${company.id}`

  return (
    <div className="space-y-6" data-tour="company-workspace">
      <PageHeader
        crumbs={[{ label: 'Companies', href: '/companies' }, { label: company.name }]}
        title={company.name}
        meta={company.industry || undefined}
        actions={
          isOwner ? (
            <>
              <Link href={`/start?companyId=${company.id}`} data-tour="company-procurement-new" className={buttonStyles({ variant: 'primary' })}>
                <Plus className="h-4 w-4" aria-hidden /> Start a scorecard
              </Link>
              <Link href={`/companies/${company.id}/edit`} className={buttonStyles({ variant: 'secondary' })}>
                Edit details
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

      <Panel
        title="Scorecards"
        description={
          hasFull && hasProcurement ? (
            <>
              To count procurement towards the level, attach the procurement scorecard on the full scorecard’s Procurement
              element.
            </>
          ) : undefined
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No scorecards yet"
            action={
              isOwner ? (
                <>
                  <Link href={startFull} className={buttonStyles({ variant: 'primary' })}>
                    <FileBarChart2 className="h-4 w-4" aria-hidden /> Full scorecard
                  </Link>
                  <Link href={startProcurement} className={buttonStyles({ variant: 'secondary' })}>
                    <ClipboardList className="h-4 w-4" aria-hidden /> Procurement only
                  </Link>
                </>
              ) : null
            }
          >
            A <Term k="fullScorecard">full scorecard</Term> gives the B-BBEE level. A{' '}
            <Term k="procurementScorecard">procurement scorecard</Term> scores supplier spend only.
          </EmptyState>
        ) : (
          <AssessmentList rows={rows} showCompany={false} />
        )}
        {procurementTrend ? (
          <p className="mt-4 text-[15px] text-muted">
            <span className="font-semibold text-ink">Procurement since the previous scorecard:</span> {procurementTrend}
          </p>
        ) : null}
      </Panel>

      <Panel title="Company details">
        <FactList
          items={[
            { label: 'Industry', value: company.industry || 'Not added' },
            { label: 'Contact person', value: company.contact_person || 'Not added' },
            { label: 'Email', value: company.email || 'Not added' },
            { label: 'Phone', value: company.phone || 'Not added' },
            { label: 'Added', value: new Date(company.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: 'Notes', value: <span className="whitespace-pre-wrap">{company.notes || 'None'}</span> },
          ]}
        />
      </Panel>

      {isOwner ? (
        <MoreOptions label="More options">
          <div>
            <Link href={`/scorecards/full/new?companyId=${company.id}`} className="text-[15px] font-semibold text-brand hover:underline">
              Older workbook calculator
            </Link>
            <p className="text-[15px] text-muted">The earlier way of scoring a workbook. Use the full scorecard instead unless you need it.</p>
          </div>
          <div className="border-t border-line pt-4">
            <p className="pb-2 text-[15px] text-muted">Deleting removes the company and all of its scorecards for good.</p>
            <DeleteCompanyButton companyId={company.id} companyName={company.name} />
          </div>
        </MoreOptions>
      ) : null}
    </div>
  )
}
