import type { createClient } from '@/utils/supabase/server'

/**
 * Small writes shared by the full scorecard actions and by the procurement
 * scorecard's "Continue to full scorecard": an audit-log entry, and the flag
 * that says an element must be calculated again.
 */

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export async function recordAudit(args: {
  supabase: ServerSupabase
  assessmentId: string
  action: string
  actor: string
  elementKey?: string | null
  detail?: Record<string, unknown>
}) {
  await args.supabase.from('scorecard_assessment_audit_log').insert({
    assessment_id: args.assessmentId,
    action: args.action,
    element_key: args.elementKey ?? null,
    actor: args.actor,
    detail: args.detail ?? {},
  })
}

export async function markElementNeedsRecalculation(
  supabase: ServerSupabase,
  assessmentId: string,
  elementKey: string,
) {
  await supabase
    .from('scorecard_assessment_elements')
    .update({ needs_recalculation: true, updated_at: new Date().toISOString() })
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)

  await supabase
    .from('scorecard_assessments')
    .update({ needs_recalculation: true })
    .eq('id', assessmentId)
}
