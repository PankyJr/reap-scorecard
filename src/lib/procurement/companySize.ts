import {
  EMPTY_APPLICABILITY_INPUTS,
  evaluateApplicability,
  type ApplicabilityInputs,
} from '@/lib/scorecard/generic/applicability'

/**
 * Which procurement targets fit this company, as far as the app knows.
 *
 * Procurement-only scorecards do not ask for turnover, so the only source is
 * the company's own full scorecard (its applicability step). The app has the
 * Generic procurement targets only; an EME or QSE gets a plain notice that the
 * QSE procurement scorecard is not in the app yet. No QSE targets are invented.
 */
export type ProcurementSizeClass = 'eme' | 'qse' | 'generic' | 'unknown'

export function procurementSizeClassFromApplicability(snapshot: unknown): ProcurementSizeClass {
  if (!snapshot || typeof snapshot !== 'object') return 'unknown'
  const inputs: ApplicabilityInputs = { ...EMPTY_APPLICABILITY_INPUTS, ...(snapshot as Partial<ApplicabilityInputs>) }
  if (inputs.annualRevenue == null) return 'unknown'
  const result = evaluateApplicability(inputs)
  // An EME or QSE that chose to be measured on the full Generic scorecard uses the Generic targets.
  if (inputs.fullScorecardElection?.elected) return 'generic'
  if (result.classification === 'eme' || result.classification === 'qse' || result.classification === 'generic') {
    return result.classification
  }
  return 'unknown'
}

type Result<T> = PromiseLike<{ data: T | null; error: unknown }>
type SizeQueryClient = {
  from(table: 'scorecard_assessments'): {
    select(columns: string): {
      eq(column: string, value: string): {
        not(column: string, operator: string, value: null): {
          order(column: string, options: { ascending: boolean }): {
            limit(count: number): Result<{ applicability_snapshot: unknown }[]>
          }
        }
      }
    }
  }
  from(table: 'companies'): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): Result<{ annual_turnover: number | string | null }> }
    }
  }
}

/**
 * The size class for a company: from its most recent full scorecard that
 * recorded turnover (per year, and it knows about an election to the Generic
 * scorecard), otherwise from the turnover on the company's details. Takes the
 * Supabase client as a plain object: its full generic type is too deep to
 * match structurally. Any read error means 'unknown', never a guess.
 */
export async function loadProcurementSizeClass(client: object, companyId: string): Promise<ProcurementSizeClass> {
  const db = client as SizeQueryClient
  try {
    const { data, error } = await db
      .from('scorecard_assessments')
      .select('applicability_snapshot')
      .eq('company_id', companyId)
      .not('applicability_snapshot', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5)
    if (!error && data) {
      for (const row of data) {
        const size = procurementSizeClassFromApplicability(row.applicability_snapshot)
        if (size !== 'unknown') return size
      }
    }
  } catch {
    // Fall through to the company's own details.
  }
  try {
    const { data, error } = await db.from('companies').select('annual_turnover').eq('id', companyId).maybeSingle()
    if (error || data?.annual_turnover == null) return 'unknown'
    const turnover = Number(data.annual_turnover)
    return Number.isFinite(turnover) ? procurementSizeClassFromApplicability({ annualRevenue: turnover }) : 'unknown'
  } catch {
    return 'unknown'
  }
}
