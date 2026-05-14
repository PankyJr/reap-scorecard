import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ClipboardList,
  ExternalLink,
  FileBarChart2,
  FileSpreadsheet,
  Mail,
  Phone,
  Shield,
  UserRound,
} from 'lucide-react'

import {
  AdminLevelPill,
  AdminPrimaryAction,
  AdminSecondaryAction,
  adminTableHead,
  adminTableRow,
  adminTableShell,
  adminTableTd,
  adminTableTh,
} from '@/app/admin/_ui'
import { fetchAdminCompanyDetail, formatAdminDate, formatAdminDateCompact } from '@/lib/admin/queries'
import { formatPoints } from '@/lib/procurement/format'
import { formatFullWorkbookStatus } from '@/lib/scorecard/full/ui-labels'

type PageProps = { params: Promise<{ id: string }> }

function EmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{message}</p>
    </div>
  )
}

function DossierCard({
  label,
  value,
  hint,
  icon: Icon,
  dark = false,
}: {
  label: string
  value: string | number
  hint: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  dark?: boolean
}) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)]',
        dark
          ? 'border-white/10 bg-[#071225] text-white'
          : 'border-slate-200/90 bg-white text-slate-950',
      ].join(' ')}
    >
      {dark ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(52,211,153,0.20),transparent_34%)]"
          aria-hidden
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p
            className={[
              'text-[11px] font-bold uppercase tracking-[0.18em]',
              dark ? 'text-white/50' : 'text-slate-400',
            ].join(' ')}
          >
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{value}</p>
          <p className={['mt-2 text-sm', dark ? 'text-white/55' : 'text-slate-500'].join(' ')}>{hint}</p>
        </div>

        <span
          className={[
            'inline-flex h-11 w-11 items-center justify-center rounded-2xl border',
            dark
              ? 'border-emerald-300/20 bg-white/[0.06] text-emerald-200'
              : 'border-slate-200 bg-white text-[#063b3f] shadow-sm',
          ].join(' ')}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | null | undefined
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_35px_-30px_rgba(15,23,42,0.7)]">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        <Icon className="h-3.5 w-3.5 text-[#063b3f]" aria-hidden />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-slate-950">{value || '—'}</p>
    </div>
  )
}

function SectionPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white shadow-[0_24px_70px_-52px_rgba(15,23,42,0.7)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/80 to-white px-5 py-5 sm:px-6">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  )
}

export default async function AdminCompanyDetailPage({ params }: PageProps) {
  const { id } = await params
  const detail = await fetchAdminCompanyDetail(id)
  if (!detail) notFound()

  const { company, ownerEmail, procurementAssessments, scorecards, workbooks } = detail

  const latestProcurement = procurementAssessments[0]
  const latestScorecard = scorecards[0]
  const latestWorkbook = workbooks[0]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#052a2e]/20 bg-[#031f22] text-white shadow-[0_30px_90px_-55px_rgba(2,24,27,0.95)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(52,211,153,0.20),transparent_30%),radial-gradient(circle_at_90%_8%,rgba(148,163,184,0.16),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%)]"
          aria-hidden
        />

        <div className="relative px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 transition hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Overview
                </Link>

                <Link
                  href="/admin/companies/browse"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 transition hover:text-white"
                >
                  All companies
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber-200/20 bg-amber-200/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-100">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                Read-only company dossier
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-3">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-white/[0.06] text-emerald-200">
                  <Building2 className="h-7 w-7" aria-hidden />
                </span>

                <div className="min-w-0">
                  <h1 className="truncate text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                    {company.name}
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-7 text-white/62">
                    Internal tenant snapshot for REAP operators. Admin can inspect activity, procurement results,
                    scorecards, and workbooks without changing client data.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Owner</p>
                  <p className="mt-2 truncate text-sm font-semibold text-white" title={ownerEmail ?? undefined}>
                    {ownerEmail ?? '—'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Created</p>
                  <p className="mt-2 text-sm font-semibold tabular-nums text-white">
                    {formatAdminDate(company.created_at)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Updated</p>
                  <p className="mt-2 text-sm font-semibold tabular-nums text-white">
                    {formatAdminDate(company.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 xl:items-end">
              <Link
                href={`/companies/${company.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#063b3f] shadow-[0_18px_40px_-24px_rgba(255,255,255,0.8)] transition hover:bg-emerald-50"
              >
                Open in client app
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Link>

              <p className="max-w-[18rem] text-sm leading-relaxed text-white/45 xl:text-right">
                Client-side ownership rules still apply in the main app.
              </p>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-white/[0.04] px-6 py-4 sm:px-8">
          <p className="text-sm text-white/55">
            Use this page to inspect the tenant footprint before jumping into a result, report, or workbook.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <DossierCard
          label="Procurement runs"
          value={procurementAssessments.length.toLocaleString()}
          hint="Saved assessments"
          icon={ClipboardList}
          dark
        />
        <DossierCard
          label="Latest score"
          value={latestProcurement?.points_display ?? '—'}
          hint={latestProcurement?.level ?? 'No procurement result'}
          icon={Shield}
        />
        <DossierCard
          label="Scorecards"
          value={scorecards.length.toLocaleString()}
          hint={latestScorecard ? 'Legacy records found' : 'No legacy records'}
          icon={FileBarChart2}
        />
        <DossierCard
          label="Workbooks"
          value={workbooks.length.toLocaleString()}
          hint={latestWorkbook ? formatFullWorkbookStatus(latestWorkbook.status) : 'No uploads'}
          icon={FileSpreadsheet}
        />
      </section>

      <SectionPanel
        eyebrow="Company profile"
        title="Registration and contact"
        description="Stored tenant information. This remains read-only from the admin console."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Industry" value={company.industry} icon={Building2} />
          <InfoItem label="Contact person" value={company.contact_person} icon={UserRound} />
          <InfoItem label="Company email" value={company.email} icon={Mail} />
          <InfoItem label="Phone" value={company.phone} icon={Phone} />
        </div>

        {company.notes ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Notes</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{company.notes}</p>
          </div>
        ) : null}
      </SectionPanel>

      <SectionPanel
        eyebrow="Procurement history"
        title="Procurement assessments"
        description="Saved procurement runs for this company. Open the result workspace or printable report."
      >
        {procurementAssessments.length === 0 ? (
          <EmptyState
            title="No procurement assessments"
            message="When this company saves a procurement assessment, it will appear here for internal review."
          />
        ) : (
          <div className={adminTableShell}>
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className={adminTableHead}>
                <tr>
                  <th className={adminTableTh}>Year</th>
                  <th className={`${adminTableTh} text-right`}>Points</th>
                  <th className={adminTableTh}>Level</th>
                  <th className={`${adminTableTh} text-right`}>TMPS</th>
                  <th className={`${adminTableTh} text-right`}>Recognised</th>
                  <th className={adminTableTh}>Import source</th>
                  <th className={adminTableTh}>Created</th>
                  <th className={`${adminTableTh} w-[1%] text-right`} scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {procurementAssessments.map((p) => (
                  <tr key={p.id} className={adminTableRow}>
                    <td className={`${adminTableTd} font-semibold tabular-nums text-slate-900`}>
                      {p.assessment_year}
                    </td>

                    <td className={`${adminTableTd} text-right`}>
                      <span className="font-bold tabular-nums text-[#042f34]">{p.points_display}</span>
                    </td>

                    <td className={adminTableTd}>
                      <AdminLevelPill label={p.level} />
                    </td>

                    <td className={`${adminTableTd} text-right tabular-nums text-slate-700`}>
                      {p.tmps_display}
                    </td>

                    <td className={`${adminTableTd} text-right tabular-nums text-slate-700`}>
                      {p.recognised_display}
                    </td>

                    <td className={`${adminTableTd} text-slate-600`}>
                      <span
                        className="block max-w-[14rem] truncate"
                        title={
                          p.import_workbook_name || p.import_sheet_name
                            ? [p.import_workbook_name, p.import_sheet_name].filter(Boolean).join(' · ')
                            : undefined
                        }
                      >
                        {p.import_workbook_name || p.import_sheet_name
                          ? [p.import_workbook_name, p.import_sheet_name].filter(Boolean).join(' · ')
                          : '—'}
                      </span>
                    </td>

                    <td className={`${adminTableTd} tabular-nums text-slate-600`} title={formatAdminDate(p.created_at)}>
                      {formatAdminDateCompact(p.created_at)}
                    </td>

                    <td className={`${adminTableTd} text-right`}>
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-end">
                        <AdminPrimaryAction href={`/procurement/assessments/${p.id}`}>Result</AdminPrimaryAction>
                        <AdminSecondaryAction href={`/procurement/assessments/${p.id}/report`}>Report</AdminSecondaryAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionPanel
          eyebrow="Legacy"
          title="Scorecards"
          description="Legacy scorecard records linked to this company."
        >
          {scorecards.length === 0 ? (
            <EmptyState
              title="No legacy scorecards"
              message="This company does not have legacy scorecard records yet."
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white">
              {scorecards.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{s.score_level ?? '—'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatPoints(Number(s.total_score ?? 0))} points · updated{' '}
                      <time dateTime={s.updated_at}>{formatAdminDate(s.updated_at)}</time>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <AdminPrimaryAction href={`/scorecards/${s.id}`}>Open</AdminPrimaryAction>
                    <AdminSecondaryAction href={`/scorecards/${s.id}/report`}>Report</AdminSecondaryAction>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>

        <SectionPanel
          eyebrow="Uploads"
          title="Full scorecard workbooks"
          description="Uploaded files and processing status for this company."
        >
          {workbooks.length === 0 ? (
            <EmptyState
              title="No workbook uploads"
              message="No full scorecard workbook uploads are linked to this company."
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white">
              {workbooks.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{w.filename}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{formatFullWorkbookStatus(w.status)}</span>
                      {' · '}
                      uploaded <time dateTime={w.uploaded_at}>{formatAdminDate(w.uploaded_at)}</time>
                      {w.processed_at ? (
                        <>
                          {' · '}
                          processed <time dateTime={w.processed_at}>{formatAdminDate(w.processed_at)}</time>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <AdminPrimaryAction href={`/scorecards/full/${w.id}`}>Workbook</AdminPrimaryAction>
                    <AdminSecondaryAction href={`/scorecards/full/${w.id}/report`}>Report</AdminSecondaryAction>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>
    </div>
  )
}