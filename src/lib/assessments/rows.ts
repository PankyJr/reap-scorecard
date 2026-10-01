import {
  formatScore,
  fullScorecardStatus,
  procurementStatus,
  PROCUREMENT_MAX_POINTS,
  type AssessmentStatus,
  type FullScorecardRow,
} from '@/lib/status/assessment-status'

/** One line in any list of assessments, whatever its kind. */
export type AssessmentRow = {
  id: string
  kind: 'full' | 'procurement'
  title: string
  companyId: string
  companyName: string
  year: number | null
  updatedAt: string | null
  status: AssessmentStatus
  /** e.g. "Level 8 · 54.69 points" or "25.67 of 29 points". */
  score: string | null
}

type CompanyRef = { id: string; name: string | null } | null

export type StoredFullScorecard = FullScorecardRow & {
  name: string
  company_id: string
  measurement_year: number | null
  updated_at: string | null
  created_at?: string | null
  companies?: CompanyRef | CompanyRef[]
}

export type StoredProcurement = {
  id: string
  company_id: string
  assessment_year: number | null
  total_score: number | string | null
  created_at: string | null
  companies?: CompanyRef | CompanyRef[]
}

function companyOf(ref: CompanyRef | CompanyRef[] | undefined): CompanyRef {
  if (Array.isArray(ref)) return ref[0] ?? null
  return ref ?? null
}

export function fullScorecardToRow(row: StoredFullScorecard, companyName?: string): AssessmentRow {
  const status = fullScorecardStatus(row)
  const snapshot = row.overall_result_snapshot as { rawTotalPoints?: number } | null | undefined
  const points = typeof snapshot?.rawTotalPoints === 'number' ? `${formatScore(snapshot.rawTotalPoints)} points` : null
  const score = status.finished && row.final_level ? `${row.final_level} · ${points ?? ''}`.replace(/ · $/, '') : points
  return {
    id: row.id,
    kind: 'full',
    title: row.name,
    companyId: row.company_id,
    companyName: companyName ?? companyOf(row.companies)?.name ?? 'Company',
    year: row.measurement_year ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    status,
    score,
  }
}

export function procurementToRow(row: StoredProcurement, companyName?: string): AssessmentRow {
  return {
    id: row.id,
    kind: 'procurement',
    title: `Procurement ${row.assessment_year ?? ''}`.trim(),
    companyId: row.company_id,
    companyName: companyName ?? companyOf(row.companies)?.name ?? 'Company',
    year: row.assessment_year ?? null,
    updatedAt: row.created_at ?? null,
    status: procurementStatus(row),
    score: `${formatScore(row.total_score)} of ${PROCUREMENT_MAX_POINTS} points`,
  }
}

/** The columns every list needs, so all lists read the same thing. */
export const FULL_SCORECARD_LIST_COLUMNS =
  'id, name, company_id, measurement_year, updated_at, created_at, scope_mode, workbook_import_status, overall_result_snapshot, needs_recalculation, readiness_complete, final_level, preliminary_level'
export const PROCUREMENT_LIST_COLUMNS = 'id, company_id, assessment_year, total_score, created_at'

/** Most recently touched first. */
export function byRecent(a: AssessmentRow, b: AssessmentRow): number {
  return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
}
