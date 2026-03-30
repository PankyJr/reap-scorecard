import { PROCUREMENT_POINT_COMPARE_EPS } from './compareAssessments'
import { deriveProcurementReapLevel } from './insights'

export type PortfolioProcurementAssessmentRow = {
  id: string
  company_id: string
  assessment_year?: number | null
  total_score: number | null
  created_at: string
  company?: { name: string } | { name: string }[] | null
}

function rowCompanyName(row: PortfolioProcurementAssessmentRow): string {
  const c = row.company
  return (Array.isArray(c) ? c[0]?.name : c?.name) ?? 'Unknown company'
}

export type PortfolioAttentionReason =
  | 'declined_vs_prior'
  | 'low_latest_score'

export type PortfolioAttentionItem = {
  companyId: string
  companyName: string
  latestAssessmentId: string
  latestScore: number
  reapLevelCurrent: string
  reason: PortfolioAttentionReason
  scoreDeltaVsPrior: number | null
  reapLevelPrevious: string | null
}

export type PortfolioProcurementTrends = {
  totalAssessmentCount: number
  companiesWithProcurement: number
  recentAssessmentCount: number
  recentWindowDays: number
  averageLatestScore: number | null
  companiesImprovedVsPrior: number
  companiesDeclinedVsPrior: number
  /** Companies with at least two assessments (can compute vs prior). */
  companiesComparable: number
  attention: PortfolioAttentionItem[]
}

/**
 * Portfolio-level procurement indicators from a flat list of assessments (RLS-scoped).
 * Rows should include `company_id` and `created_at`; order does not matter.
 */
export function computePortfolioProcurementTrends(
  rows: PortfolioProcurementAssessmentRow[],
  options?: { recentWindowDays?: number },
): PortfolioProcurementTrends {
  const recentWindowDays = options?.recentWindowDays ?? 30
  const cutoff = Date.now() - recentWindowDays * 86400000

  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const recentAssessmentCount = sorted.filter(
    (r) => new Date(r.created_at).getTime() >= cutoff,
  ).length

  const byCompany = new Map<string, PortfolioProcurementAssessmentRow[]>()
  for (const r of sorted) {
    const list = byCompany.get(r.company_id) ?? []
    list.push(r)
    byCompany.set(r.company_id, list)
  }

  const companiesWithProcurement = byCompany.size
  const totalAssessmentCount = sorted.length

  let sumLatest = 0
  let nLatest = 0
  const latestPerCompany: {
    companyId: string
    companyName: string
    row: PortfolioProcurementAssessmentRow
    score: number
    priorRow: PortfolioProcurementAssessmentRow | null
    scoreDelta: number | null
  }[] = []

  for (const [companyId, arr] of byCompany) {
    const latest = arr[arr.length - 1]!
    const score = Number(latest.total_score ?? 0)
    if (Number.isFinite(score)) {
      sumLatest += score
      nLatest += 1
    }
    const prior = arr.length >= 2 ? arr[arr.length - 2]! : null
    const priorScore = prior ? Number(prior.total_score ?? 0) : NaN
    const scoreDelta =
      prior != null && Number.isFinite(priorScore) && Number.isFinite(score)
        ? score - priorScore
        : null

    latestPerCompany.push({
      companyId,
      companyName: rowCompanyName(latest),
      row: latest,
      score,
      priorRow: prior,
      scoreDelta,
    })
  }

  const averageLatestScore = nLatest > 0 ? sumLatest / nLatest : null

  let companiesImprovedVsPrior = 0
  let companiesDeclinedVsPrior = 0
  let companiesComparable = 0

  const declinedCandidates: typeof latestPerCompany = []

  for (const item of latestPerCompany) {
    if (item.scoreDelta == null) continue
    companiesComparable += 1
    if (item.scoreDelta > PROCUREMENT_POINT_COMPARE_EPS) {
      companiesImprovedVsPrior += 1
    } else if (item.scoreDelta < -PROCUREMENT_POINT_COMPARE_EPS) {
      companiesDeclinedVsPrior += 1
      declinedCandidates.push(item)
    }
  }

  declinedCandidates.sort(
    (a, b) => (a.scoreDelta ?? 0) - (b.scoreDelta ?? 0),
  )

  const attention: PortfolioAttentionItem[] = []
  const usedCompanyIds = new Set<string>()

  for (const item of declinedCandidates) {
    if (attention.length >= 5) break
    const prior = item.priorRow
    attention.push({
      companyId: item.companyId,
      companyName: item.companyName,
      latestAssessmentId: item.row.id,
      latestScore: item.score,
      reapLevelCurrent: deriveProcurementReapLevel(item.score),
      reason: 'declined_vs_prior',
      scoreDeltaVsPrior: item.scoreDelta,
      reapLevelPrevious: prior
        ? deriveProcurementReapLevel(Number(prior.total_score ?? 0))
        : null,
    })
    usedCompanyIds.add(item.companyId)
  }

  if (attention.length < 3 && latestPerCompany.length > 0) {
    const sortedByLowScore = [...latestPerCompany].sort(
      (a, b) => a.score - b.score,
    )
    for (const item of sortedByLowScore) {
      if (attention.length >= 5) break
      if (usedCompanyIds.has(item.companyId)) continue
      const nc = deriveProcurementReapLevel(item.score) === 'Non-Compliant'
      const belowPack =
        averageLatestScore != null &&
        item.score < averageLatestScore - PROCUREMENT_POINT_COMPARE_EPS
      if (nc || belowPack) {
        attention.push({
          companyId: item.companyId,
          companyName: item.companyName,
          latestAssessmentId: item.row.id,
          latestScore: item.score,
          reapLevelCurrent: deriveProcurementReapLevel(item.score),
          reason: 'low_latest_score',
          scoreDeltaVsPrior: item.scoreDelta,
          reapLevelPrevious: item.priorRow
            ? deriveProcurementReapLevel(
                Number(item.priorRow.total_score ?? 0),
              )
            : null,
        })
        usedCompanyIds.add(item.companyId)
      }
    }
  }

  return {
    totalAssessmentCount,
    companiesWithProcurement,
    recentAssessmentCount,
    recentWindowDays,
    averageLatestScore,
    companiesImprovedVsPrior,
    companiesDeclinedVsPrior,
    companiesComparable,
    attention,
  }
}
