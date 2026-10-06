import {
  formatScore,
  fullScorecardStatus,
  procurementStatus,
  type AssessmentStatus,
  type FullScorecardRow,
} from '@/lib/status/assessment-status'
import { procurementScoreText, type StoredProcurementLinePoints } from '@/lib/procurement/scoreSummary'

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
  /** e.g. "Level 8 · 54.69 points" or, for procurement, "22.40 of 25 points, bonus 1.00 of 2". */
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
  /** The saved per-indicator points, embedded by PROCUREMENT_LIST_COLUMNS. */
  procurement_results?: StoredProcurementLinePoints[] | null
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
    // Base points out of the engine cap, bonus apart, as on the score page.
    score: procurementScoreText({ results: row.procurement_results, storedTotal: row.total_score }),
  }
}

/** The columns every list needs, so all lists read the same thing. */
export const FULL_SCORECARD_LIST_COLUMNS =
  'id, name, company_id, measurement_year, updated_at, created_at, scope_mode, workbook_import_status, overall_result_snapshot, needs_recalculation, readiness_complete, final_level, preliminary_level'
// procurement_results is embedded through its assessment_id foreign key, so a
// list needs no second read to show the points as the score page does.
export const PROCUREMENT_LIST_COLUMNS =
  'id, company_id, assessment_year, total_score, created_at, procurement_results(category_key, points_achieved)'

/** Most recently touched first. */
export function byRecent(a: AssessmentRow, b: AssessmentRow): number {
  return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
}
