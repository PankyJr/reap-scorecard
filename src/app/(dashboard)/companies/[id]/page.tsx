import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  FileBarChart2,
  ChevronRight,
} from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { CompanyScoreTrend } from '@/components/charts/CompanyScoreTrend'
import { buildProcurementComparison, formatSignedPoints } from '@/lib/procurement/compareAssessments'
import { formatCurrency } from '@/lib/procurement/format'
import { DeleteCompanyButton } from './DeleteCompanyButton'

type PageProps = {
  params: Promise<{ id: string }>
}

function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {eyebrow}
            </p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  )
}

function StatTile({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <div
      className={[
        'rounded-2xl border px-4 py-4',
        emphasis
          ? 'border-slate-900 bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
          : 'border-slate-200/90 bg-slate-50/80 text-slate-950',
      ].join(' ')}
    >
      <p
        className={[
          'text-[11px] font-semibold uppercase tracking-[0.14em]',
          emphasis ? 'text-slate-300' : 'text-slate-500',
        ].join(' ')}
      >
        {label}
      </p>
      <div
        className={[
          'mt-2 font-semibold tabular-nums tracking-tight',
          emphasis ? 'text-3xl sm:text-[2rem]' : 'text-xl',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  breakAll = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  breakAll?: boolean
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <div
          className={`mt-1 text-sm font-medium leading-6 text-slate-900 ${
            breakAll ? 'break-all' : ''
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-6 text-slate-500">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

export default async function CompanyDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (!company || company.owner_id !== user.id) {
    notFound()
  }

  const { data: scorecards } = await supabase
    .from('scorecards')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: false })

  const { data: procurementAssessments } = await supabase
    .from('procurement_assessments')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: true })

  const latestScorecard = scorecards?.[0] ?? null
  const procurementChron = procurementAssessments ?? []
  const latestProcurement =
    procurementChron.length > 0
      ? procurementChron[procurementChron.length - 1]
      : null
  const latestProcurementId = latestProcurement?.id ?? null

  const assessmentCount = scorecards?.length ?? 0
  const procurementCount = procurementChron.length

  let procurementTrendSummary: string | null = null
  if (procurementChron.length >= 2) {
    const prior = procurementChron[procurementChron.length - 2]!
    const latest = procurementChron[procurementChron.length - 1]!
    const { data: spendRows } = await supabase
      .from('procurement_suppliers')
      .select('assessment_id, bbbee_spend')
      .in('assessment_id', [prior.id, latest.id])
    const sumBbbee = (aid: string) =>
      spendRows
        ?.filter((r) => r.assessment_id === aid)
        .reduce((s, r) => s + Number(r.bbbee_spend ?? 0), 0) ?? 0
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
        createdAt: prior.created_at,
        totalScore: Number(prior.total_score ?? 0),
        totalMeasuredSpend: Number(prior.total_measured_procurement_spend ?? 0),
        totalBbbeeSpend: sumBbbee(prior.id),
        categories: [],
      },
    )
    const moneyDelta = (delta: number) => {
      const u = formatCurrency(Math.abs(delta))
      if (delta > 0.5) return `+${u}`
      if (delta < -0.5) return `-${u}`
      return formatCurrency(0)
    }
    procurementTrendSummary = [
      `Points ${formatSignedPoints(snap.scoreDelta)}`,
      `REAP ${snap.reapLevelPrevious} → ${snap.reapLevelCurrent}`,
      `TMPS ${moneyDelta(snap.tmpsDelta)}`,
      `Recognised B-BBEE spend ${moneyDelta(snap.bbbeeSpendDelta)}`,
    ].join(' · ')
  }

  const latestLegacyDate = latestScorecard?.created_at
    ? new Date(latestScorecard.created_at)
    : null

  const trendData =
    scorecards
      ?.slice()
      .reverse()
      .map((s) => ({
        dateLabel: new Date(s.created_at).toLocaleDateString(),
        score: Number(s.total_score ?? 0),
      })) ?? []

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.05),transparent_30%),linear-gradient(to_bottom,#f8fafc,#f8fafc)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.05),transparent_28%)]" />

          <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <Link
                    href="/companies"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    aria-label="Back to companies"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Company Profile
                    </span>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">
                      {company.name}
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                      View company details, procurement performance, and legacy
                      scorecard history from one clean dashboard.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatTile label="Procurement Assessments" value={procurementCount} />
                  <StatTile label="Legacy Scorecards" value={assessmentCount} />
                  <StatTile
                    label="Latest Procurement Score"
                    value={
                      latestProcurement
                        ? Number(latestProcurement.total_score ?? 0).toFixed(2)
                        : '—'
                    }
                    emphasis
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:max-w-sm xl:justify-end">
                <Link
                  href={`/procurement/assessments/new?companyId=${company.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  New Procurement Assessment
                </Link>

                <Link
                  href={`/scorecards/new?companyId=${company.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <FileBarChart2 className="h-4 w-4" />
                  Create Scorecard
                </Link>

                <Link
                  href={`/companies/${company.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Edit company
                </Link>

                <DeleteCompanyButton
                  companyId={company.id}
                  companyName={company.name}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-8">
          {/* Company overview */}
          <SectionCard
            eyebrow="Overview"
            title="Company Details"
            description="Core company information and contact details."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DetailRow
                icon={Building2}
                label="Industry"
                value={company.industry || '—'}
              />
              <DetailRow
                icon={User}
                label="Contact Person"
                value={company.contact_person || '—'}
              />
              <DetailRow
                icon={Mail}
                label="Email"
                value={company.email || '—'}
                breakAll
              />
              <DetailRow
                icon={Phone}
                label="Phone"
                value={company.phone || '—'}
              />
              <DetailRow
                icon={Calendar}
                label="Added Date"
                value={new Date(company.created_at).toLocaleDateString()}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {company.notes || 'No notes added yet.'}
              </p>
            </div>
          </SectionCard>

          {/* Procurement assessments */}
          <SectionCard
            eyebrow="Procurement"
            title="Procurement Assessments"
            description="Measured spend, scores, and report history for this company."
            action={
              procurementCount > 0 ? (
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                  {procurementCount} total
                </span>
              ) : null
            }
          >
            {procurementChron.length > 0 ? (
              <div className="space-y-3">
                {procurementChron.map((pa) => (
                  <div
                    key={pa.id}
                    className="group rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold tracking-wide text-white shadow-sm">
                          {pa.assessment_year
                            ? String(pa.assessment_year).slice(-2)
                            : '--'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950 sm:text-[15px]">
                              Assessment {pa.assessment_year ?? '—'}
                            </p>
                            {pa.id === latestProcurementId ? (
                              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                                Latest
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:text-sm">
                            <span>
                              {pa.created_at
                                ? new Date(pa.created_at).toLocaleDateString()
                                : 'Date unknown'}
                            </span>
                            <span className="hidden text-slate-300 sm:inline">
                              •
                            </span>
                            <span>
                              Measured spend{' '}
                              {formatCurrency(
                                Number(pa.total_measured_procurement_spend ?? 0),
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm sm:min-w-[130px] sm:text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Total Score
                          </p>
                          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-950">
                            {Number(pa.total_score ?? 0).toFixed(2)}
                          </p>
                        </div>

                        <Link
                          href={`/procurement/assessments/${pa.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Open assessment
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileBarChart2}
                title="No procurement assessments yet"
                description="Create a procurement assessment to start building this company's record."
                actionLabel="New assessment"
                actionHref={`/procurement/assessments/new?companyId=${id}`}
              />
            )}
          </SectionCard>

          {/* Legacy analytics */}
          <SectionCard
            eyebrow="Legacy Analytics"
            title="Legacy Scorecard Summary"
            description="A quick look at historical legacy scorecard performance."
            action={
              assessmentCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                  Historical trend
                </span>
              ) : null
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Latest Level" value={latestScorecard?.score_level ?? '—'} />
              <StatTile label="Latest Score" value={latestScorecard?.total_score ?? '—'} />
              <StatTile label="Total Assessments" value={assessmentCount} />
              <StatTile
                label="Latest Date"
                value={latestLegacyDate ? latestLegacyDate.toLocaleDateString() : '—'}
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4">
              <div className="rounded-[20px] border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
                <CompanyScoreTrend data={trendData} />
              </div>
            </div>
          </SectionCard>

          {/* Procurement snapshot */}
          <SectionCard
            eyebrow="Snapshot"
            title="Procurement Overview"
            description="A quick summary of the company’s current procurement assessment state."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatTile label="Total Assessments" value={procurementCount} />
              <StatTile
                label="Latest Score"
                value={
                  latestProcurement
                    ? Number(latestProcurement.total_score ?? 0).toFixed(2)
                    : '—'
                }
                emphasis
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Latest Assessment Date
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {latestProcurement
                  ? new Date(latestProcurement.created_at).toLocaleDateString()
                  : 'No assessments yet'}
              </p>
            </div>

            {procurementTrendSummary ? (
              <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Versus prior assessment
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {procurementTrendSummary}
                </p>
                {procurementChron.length >= 2 ? (
                  <Link
                    href={`/procurement/assessments/${procurementChron[procurementChron.length - 2]!.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    View previous assessment
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </SectionCard>

          {/* Legacy history */}
          <SectionCard
            eyebrow="Legacy Records"
            title="Legacy Scorecard History"
            description="All legacy scorecards created for this company."
          >
            {scorecards && scorecards.length > 0 ? (
              <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50/90">
                      <tr className="border-b border-slate-200">
                        <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Date
                        </th>
                        <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Level
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Score
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {scorecards.map((scorecard) => (
                        <tr
                          key={scorecard.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 font-medium text-slate-900">
                            {new Date(scorecard.created_at).toLocaleDateString()}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                              {scorecard.score_level || 'Pending'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-950">
                            {scorecard.total_score ?? '—'}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/scorecards/${scorecard.id}`}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              View report
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={FileBarChart2}
                title="No legacy scorecards yet"
                description="Create a scorecard to start building historical records for this company."
                actionLabel="New scorecard"
                actionHref={`/scorecards/new?companyId=${id}`}
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}