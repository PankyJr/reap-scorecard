import 'server-only'

import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { deriveProcurementReapLevel } from '@/lib/procurement/insights'
import { formatCurrencyZar, formatPercentage, formatPoints } from '@/lib/procurement/format'

function startOfUtcMonthIso(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString()
}

export type AdminCompanyRow = {
  id: string
  name: string
  owner_id: string | null
  created_at: string
  updated_at: string
  owner_email: string | null
  assessment_count: number
  last_activity_at: string | null
}

export type AdminProcurementRow = {
  id: string
  company_id: string
  company_name: string
  assessment_year: number | null
  total_score: number | null
  tmps: number
  level: string
  recognised_pct_display: string
  created_at: string
}

function maxIso(...dates: (string | null | undefined)[]): string | null {
  const parsed = dates
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime())
    .filter((t) => !Number.isNaN(t))
  if (!parsed.length) return null
  return new Date(Math.max(...parsed)).toISOString()
}

export async function fetchAdminOverviewMetrics() {
  const db = createServiceRoleSupabase()

  const [
    usersRes,
    companiesRes,
    procurementRes,
    scorecardsRes,
    workbooksRes,
    monthProcurementRes,
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('companies').select('*', { count: 'exact', head: true }),
    db.from('procurement_assessments').select('*', { count: 'exact', head: true }),
    db.from('scorecards').select('*', { count: 'exact', head: true }),
    db.from('scorecard_workbooks').select('*', { count: 'exact', head: true }),
    db
      .from('procurement_assessments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfUtcMonthIso()),
  ])

  return {
    totalUsers: usersRes.count ?? 0,
    totalCompanies: companiesRes.count ?? 0,
    totalProcurementAssessments: procurementRes.count ?? 0,
    totalScorecards: scorecardsRes.count ?? 0,
    totalWorkbooks: workbooksRes.count ?? 0,
    procurementAssessmentsThisMonth: monthProcurementRes.count ?? 0,
  }
}

export async function fetchRecentCompanies(limit = 8) {
  const db = createServiceRoleSupabase()
  const { data, error } = await db
    .from('companies')
    .select('id, name, owner_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function fetchRecentProcurementAssessments(limit = 8) {
  const db = createServiceRoleSupabase()
  const { data, error } = await db
    .from('procurement_assessments')
    .select(
      `
      id,
      assessment_year,
      total_score,
      total_measured_procurement_spend,
      created_at,
      company:companies(name)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function fetchRecentScorecards(limit = 8) {
  const db = createServiceRoleSupabase()
  const { data, error } = await db
    .from('scorecards')
    .select(
      `
      id,
      total_score,
      score_level,
      created_at,
      updated_at,
      company:companies(name)
    `,
    )
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function fetchRecentWorkbooks(limit = 8) {
  const db = createServiceRoleSupabase()
  const { data, error } = await db
    .from('scorecard_workbooks')
    .select(
      `
      id,
      filename,
      uploaded_at,
      status,
      company:companies(name)
    `,
    )
    .order('uploaded_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function fetchAdminCompaniesTable(limit = 400): Promise<AdminCompanyRow[]> {
  const db = createServiceRoleSupabase()
  const { data: companies, error: cErr } = await db
    .from('companies')
    .select('id, name, owner_id, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (cErr) throw cErr
  if (!companies?.length) return []

  const ownerIds = [...new Set(companies.map((c) => c.owner_id).filter(Boolean))] as string[]
  const { data: profiles } =
    ownerIds.length > 0
      ? await db.from('profiles').select('id, email').in('id', ownerIds)
      : { data: [] as { id: string; email: string | null }[] }

  const emailByUser = new Map((profiles ?? []).map((p) => [p.id, p.email ?? null]))

  const { data: assessments } = await db
    .from('procurement_assessments')
    .select('company_id, created_at')

  const byCompany = new Map<string, { count: number; last: string | null }>()
  for (const row of assessments ?? []) {
    const cid = row.company_id as string
    const cur = byCompany.get(cid) ?? { count: 0, last: null }
    cur.count += 1
    const ca = row.created_at as string
    if (!cur.last || new Date(ca) > new Date(cur.last)) cur.last = ca
    byCompany.set(cid, cur)
  }

  return companies.map((c) => {
    const agg = byCompany.get(c.id)
    const lastActivity = maxIso(c.updated_at, agg?.last ?? null)
    return {
      id: c.id,
      name: c.name,
      owner_id: c.owner_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      owner_email: c.owner_id ? emailByUser.get(c.owner_id) ?? null : null,
      assessment_count: agg?.count ?? 0,
      last_activity_at: lastActivity,
    }
  })
}

export async function fetchAdminProcurementTable(limit = 80): Promise<AdminProcurementRow[]> {
  const db = createServiceRoleSupabase()
  const { data: rows, error } = await db
    .from('procurement_assessments')
    .select(
      `
      id,
      company_id,
      assessment_year,
      total_score,
      total_measured_procurement_spend,
      created_at,
      company:companies(name)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!rows?.length) return []

  const ids = rows.map((r) => r.id as string)
  const { data: spendAgg } = await db.from('procurement_suppliers').select('assessment_id, bbbee_spend').in('assessment_id', ids)

  const bbbeeByAssessment = new Map<string, number>()
  for (const s of spendAgg ?? []) {
    const aid = s.assessment_id as string
    bbbeeByAssessment.set(aid, (bbbeeByAssessment.get(aid) ?? 0) + Number(s.bbbee_spend ?? 0))
  }

  return rows.map((r) => {
    const id = r.id as string
    const tmps = Number(r.total_measured_procurement_spend ?? 0) || 0
    const bbbee = bbbeeByAssessment.get(id) ?? 0
    const ratio = tmps > 0 ? bbbee / tmps : null
    const totalScore = Number(r.total_score ?? 0)
    const co = r.company as { name?: string } | { name?: string }[] | null
    const companyName = Array.isArray(co) ? co[0]?.name : co?.name
    return {
      id,
      company_id: r.company_id as string,
      company_name: companyName ?? '—',
      assessment_year: r.assessment_year as number | null,
      total_score: r.total_score != null ? Number(r.total_score) : null,
      tmps,
      level: deriveProcurementReapLevel(Number.isFinite(totalScore) ? totalScore : 0),
      recognised_pct_display: ratio != null ? formatPercentage(ratio) : '—',
      created_at: r.created_at as string,
    }
  })
}

export async function fetchAdminCompanyDetail(companyId: string) {
  const db = createServiceRoleSupabase()
  const { data: company, error: cErr } = await db
    .from('companies')
    .select('id, name, owner_id, industry, contact_person, email, phone, created_at, updated_at, notes')
    .eq('id', companyId)
    .maybeSingle()
  if (cErr) throw cErr
  if (!company) return null

  let ownerEmail: string | null = null
  if (company.owner_id) {
    const { data: prof } = await db.from('profiles').select('email, full_name').eq('id', company.owner_id).maybeSingle()
    ownerEmail = prof?.email ?? null
  }

  const { data: procurementAssessments } = await db
    .from('procurement_assessments')
    .select(
      `
      id,
      assessment_year,
      total_score,
      total_measured_procurement_spend,
      created_at,
      import_workbook_name,
      import_sheet_name,
      status
    `,
    )
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  const { data: scorecards } = await db
    .from('scorecards')
    .select('id, total_score, score_level, created_at, updated_at')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })

  const { data: workbooks } = await db
    .from('scorecard_workbooks')
    .select('id, filename, uploaded_at, status, processed_at')
    .eq('company_id', companyId)
    .order('uploaded_at', { ascending: false })

  const paIds = (procurementAssessments ?? []).map((p) => p.id as string)
  const spendByAssessment = new Map<string, number>()
  if (paIds.length) {
    const { data: spendRows } = await db.from('procurement_suppliers').select('assessment_id, bbbee_spend').in('assessment_id', paIds)
    for (const s of spendRows ?? []) {
      const aid = s.assessment_id as string
      spendByAssessment.set(aid, (spendByAssessment.get(aid) ?? 0) + Number(s.bbbee_spend ?? 0))
    }
  }

  const procurementEnriched = (procurementAssessments ?? []).map((p) => {
    const tmps = Number(p.total_measured_procurement_spend ?? 0) || 0
    const bbbee = spendByAssessment.get(p.id as string) ?? 0
    const ratio = tmps > 0 ? bbbee / tmps : null
    const ts = Number(p.total_score ?? 0)
    return {
      ...p,
      tmps_display: formatCurrencyZar(tmps),
      recognised_display: ratio != null ? formatPercentage(ratio) : '—',
      level: deriveProcurementReapLevel(Number.isFinite(ts) ? ts : 0),
      points_display: formatPoints(ts),
    }
  })

  return {
    company,
    ownerEmail,
    procurementAssessments: procurementEnriched,
    scorecards: scorecards ?? [],
    workbooks: workbooks ?? [],
  }
}

export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}
