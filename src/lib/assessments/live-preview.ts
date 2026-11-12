/**
 * The live score: the engine run on a full scorecard's figures as they stand
 * now, before anyone presses Calculate. This is Home's read, moved here
 * unchanged so /companies and company detail show the same number (approved
 * 2026-11-12). Read-only: three selects, then the engine, nothing written.
 */
import { calculateGenericScorecard, type GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { buildGenericInputs, type StoredAssessmentRow, type StoredContributionRow, type StoredElementRow } from '@/lib/scorecard/generic/persistence'

import type { SupabaseClient } from '@supabase/supabase-js'

type Db = Pick<SupabaseClient, 'from'>

export async function loadLivePreviews(db: Db, assessmentIds: string[]): Promise<Map<string, GenericScorecardCalculation>> {
  const previews = new Map<string, GenericScorecardCalculation>()
  if (assessmentIds.length === 0) return previews
  const [{ data: assessments }, { data: elements }, { data: contributions }] = await Promise.all([
    db.from('scorecard_assessments').select('*').in('id', assessmentIds),
    db.from('scorecard_assessment_elements').select('*').in('assessment_id', assessmentIds),
    db.from('scorecard_contribution_records').select('*').in('assessment_id', assessmentIds),
  ])
  for (const assessment of (assessments ?? []) as Array<{ id: string }>) {
    try {
      const inputs = buildGenericInputs({
        assessment: assessment as unknown as StoredAssessmentRow,
        elements: ((elements ?? []) as unknown as Array<StoredElementRow & { assessment_id: string }>).filter((e) => e.assessment_id === assessment.id),
        contributions: ((contributions ?? []) as unknown as Array<StoredContributionRow & { assessment_id: string }>).filter((c) => c.assessment_id === assessment.id),
      })
      previews.set(assessment.id, calculateGenericScorecard(inputs))
    } catch {
      // A scorecard the engine cannot read yet simply shows no live score.
    }
  }
  return previews
}

/**
 * The score a list shows for a company: the live score when the engine could
 * read the scorecard, otherwise the last saved result. Home, /companies and
 * company detail all call this, so the same company never shows two numbers.
 */
export function liveScore(
  preview: Pick<GenericScorecardCalculation, 'rawTotalPoints' | 'totalBasePointsAvailable'> | null | undefined,
  snapshot: unknown,
): { total: number; available: number } | null {
  const saved = snapshot as { rawTotalPoints?: unknown; totalBasePointsAvailable?: unknown } | null | undefined
  const source = preview ?? saved
  if (!source || typeof source.rawTotalPoints !== 'number' || typeof source.totalBasePointsAvailable !== 'number') return null
  return { total: source.rawTotalPoints, available: source.totalBasePointsAvailable }
}
