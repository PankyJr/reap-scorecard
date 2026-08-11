import 'server-only'

import type { createClient } from '@/utils/supabase/server'
import {
  validateEapSetForGenericEngine,
  type EapTargetValueRow,
} from './eap-target-validation'

export { REQUIRED_EAP_DEMOGRAPHICS, validateEapSetForGenericEngine } from './eap-target-validation'
export type { EapTargetValueRow, EapValidation } from './eap-target-validation'

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * EAP target sets and the generic engine.
 *
 * The generic engine's EAP five-step needs the six race/gender population
 * shares. It reads them from `scorecard_assessments.eap_target_snapshot`,
 * which is frozen at calculate time so later admin edits to the set cannot
 * silently rescore history.
 *
 * KNOWN MODEL CONFLICT (separate ticket): `eap_target_set_values` is also used
 * by the Management Control admin grid, which stores
 * `band_key × {black_people, black_women}` — a different thing entirely. A set
 * saved in that shape cannot drive the engine. Rather than guess or convert,
 * `validateEapSetForGenericEngine` fails with a named error and the caller
 * surfaces it. Reconciling the two models is not attempted here.
 */

export type EapSnapshot = {
  id: string
  name: string
  year: number
  version: number | null
  geography: string | null
  status: string
  values: EapTargetValueRow[]
  snapped_at: string
}

/**
 * Freeze a target set into a snapshot. Returns a named error rather than a
 * partial snapshot when the set is the wrong shape.
 */
export async function buildEapSnapshot(
  supabase: Supabase,
  targetSetId: string,
): Promise<{ snapshot: EapSnapshot; error: null } | { snapshot: null; error: string }> {
  const { data: targetSet } = await supabase
    .from('eap_target_sets')
    .select('id, name, year, version, geography, status')
    .eq('id', targetSetId)
    .maybeSingle()
  if (!targetSet) return { snapshot: null, error: 'That EAP target set no longer exists.' }

  const { data: values } = await supabase
    .from('eap_target_set_values')
    .select('demographic_key, target_value')
    .eq('target_set_id', targetSetId)

  const rows = (values ?? []) as EapTargetValueRow[]
  const validation = validateEapSetForGenericEngine(rows)
  if (!validation.ok) return { snapshot: null, error: validation.error }

  return {
    snapshot: {
      ...(targetSet as Omit<EapSnapshot, 'values' | 'snapped_at'>),
      values: rows,
      snapped_at: new Date().toISOString(),
    },
    error: null,
  }
}

/** The active set for a measurement year, or null. */
export async function findActiveEapTargetSet(
  supabase: Supabase,
  measurementYear: number,
): Promise<string | null> {
  const { data } = await supabase
    .from('eap_target_sets')
    .select('id')
    .eq('status', 'active')
    .eq('year', measurementYear)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Resolve the snapshot a calculation should score against.
 *
 * An existing snapshot always wins — that is what keeps a recalculation
 * reproducing its original rules. Only when there is none is one frozen from
 * the attached set.
 */
export async function resolveEapSnapshotForCalculation(
  supabase: Supabase,
  assessment: { id: string; eap_target_set_id?: string | null; eap_target_snapshot?: unknown },
): Promise<{ snapshot: unknown; freshlyBuilt: boolean; error: string | null }> {
  if (assessment.eap_target_snapshot != null) {
    return { snapshot: assessment.eap_target_snapshot, freshlyBuilt: false, error: null }
  }
  if (!assessment.eap_target_set_id) {
    return { snapshot: null, freshlyBuilt: false, error: null }
  }
  const built = await buildEapSnapshot(supabase, assessment.eap_target_set_id)
  if (built.error) return { snapshot: null, freshlyBuilt: false, error: built.error }
  return { snapshot: built.snapshot, freshlyBuilt: true, error: null }
}
