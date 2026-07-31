import 'server-only'

import { createClient } from '@/utils/supabase/server'
import { calculateGenericScorecard, type GenericScorecardCalculation } from '@/lib/scorecard/generic'
import {
  buildGenericInputs,
  type StoredAssessmentRow,
  type StoredContributionRow,
  type StoredElementRow,
} from '@/lib/scorecard/generic/persistence'
import type { GenericScorecardInputs } from '@/lib/scorecard/generic'

export type LoadedGenericAssessment = {
  assessment: StoredAssessmentRow & {
    name: string
    company_id: string
    measurement_year: number
    status: string
    needs_recalculation: boolean
    overall_result_snapshot: unknown
  }
  company: { id: string; name: string }
  elements: StoredElementRow[]
  contributions: StoredContributionRow[]
  inputs: GenericScorecardInputs
  /** Live preview of the engine result. Never persisted by a read. */
  preview: GenericScorecardCalculation
  userId: string
}

/**
 * Load everything the generic workspace needs, or null when the current user
 * does not own the assessment. Callers turn null into notFound().
 */
export async function loadGenericAssessment(assessmentId: string): Promise<LoadedGenericAssessment | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: assessment } = await supabase
    .from('scorecard_assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle()
  if (!assessment) return null

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', assessment.company_id)
    .maybeSingle()
  if (!company || company.owner_id !== user.id) return null

  const [{ data: elements }, { data: contributions }] = await Promise.all([
    supabase.from('scorecard_assessment_elements').select('*').eq('assessment_id', assessmentId),
    supabase.from('scorecard_contribution_records').select('*').eq('assessment_id', assessmentId).order('created_at'),
  ])

  const elementRows = (elements ?? []) as unknown as StoredElementRow[]
  const contributionRows = (contributions ?? []) as unknown as StoredContributionRow[]

  const inputs = buildGenericInputs({
    assessment: assessment as unknown as StoredAssessmentRow,
    elements: elementRows,
    contributions: contributionRows,
  })

  return {
    assessment: assessment as LoadedGenericAssessment['assessment'],
    company: { id: company.id, name: company.name },
    elements: elementRows,
    contributions: contributionRows,
    inputs,
    preview: calculateGenericScorecard(inputs),
    userId: user.id,
  }
}
