import type { ProcurementSnapshot } from '@/lib/scorecard/generic/elements/procurement'
import { normaliseSourceProcurementPoints } from '@/lib/scorecard/generic/elements/procurement'
import { calculateProcurementResults } from '@/lib/procurement/assessment'
import { fetchAllRows } from '@/lib/procurement/supplierStore'
import { markElementNeedsRecalculation, recordAudit, type ServerSupabase } from '@/lib/scorecard/assessmentAudit'

/**
 * Attaching a procurement scorecard to a full scorecard. Used by the full
 * scorecard's procurement step and by "Continue to full scorecard" on a
 * procurement scorecard, so both attach in exactly the same way.
 */

type SupplierSpendRow = {
  id: string
  bbbee_spend: number | string | null
  eme_amount: number | string | null
  qse_amount: number | string | null
  black_owned_amount: number | string | null
  black_women_amount: number | string | null
  bdgs_amount: number | string | null
  is_51_percent_flow_through: boolean | null
}

/**
 * Freeze the measured spend ratios from a completed procurement assessment.
 * The full scorecard scores those ratios itself so that the points always match
 * the selected rule set.
 */
export async function buildProcurementSnapshot(
  supabase: ServerSupabase,
  sourceAssessmentId: string,
  userId: string,
): Promise<ProcurementSnapshot | null> {
  const { data: source } = await supabase
    .from('procurement_assessments')
    .select('*')
    .eq('id', sourceAssessmentId)
    .maybeSingle()
  if (!source) return null

  // Every supplier, page by page: a plain select stops at 1,000 rows and
  // would freeze too little recognised spend for a larger list.
  const { data: suppliers } = await fetchAllRows<SupplierSpendRow>((from, to) =>
    supabase
      .from('procurement_suppliers')
      .select(
        'id, bbbee_spend, eme_amount, qse_amount, black_owned_amount, black_women_amount, bdgs_amount, is_51_percent_flow_through',
      )
      .eq('assessment_id', sourceAssessmentId)
      .order('id', { ascending: true })
      .range(from, to),
  )

  const rows = suppliers ?? []
  const sumOf = (key: keyof SupplierSpendRow) =>
    rows.reduce((sum, row) => {
      const value = Number(row[key] ?? 0)
      return Number.isFinite(value) ? sum + value : sum
    }, 0)

  const total = Number(source.total_measured_procurement_spend ?? 0)
  const recognisedSpend = {
    'preferential_procurement.all_empowering_suppliers': sumOf('bbbee_spend'),
    'preferential_procurement.qse': sumOf('qse_amount'),
    'preferential_procurement.eme': sumOf('eme_amount'),
    'preferential_procurement.black_owned_51': sumOf('black_owned_amount'),
    'preferential_procurement.black_women_owned_30': sumOf('black_women_amount'),
    'preferential_procurement.bonus.designated_group': sumOf('bdgs_amount'),
  }

  // Separate Formal Procurement category points so a combined total_score is
  // never treated as base-only. The Generic engine still re-scores from spend.
  const formal = calculateProcurementResults({
    totals: {
      all_bbbee_suppliers: recognisedSpend['preferential_procurement.all_empowering_suppliers'],
      all_qses: recognisedSpend['preferential_procurement.qse'],
      all_emes: recognisedSpend['preferential_procurement.eme'],
      black_owned_51: recognisedSpend['preferential_procurement.black_owned_51'],
      black_women_30: recognisedSpend['preferential_procurement.black_women_owned_30'],
      bdgs_51: recognisedSpend['preferential_procurement.bonus.designated_group'],
    },
    totalMeasuredSpend: total,
  })
  const categoryBonus =
    formal.categories.find((category) => category.key === 'bdgs_51')?.pointsAchieved ?? 0
  const categoryBase = formal.categories
    .filter((category) => category.key !== 'bdgs_51')
    .reduce((sum, category) => sum + category.pointsAchieved, 0)
  const normalised = normaliseSourceProcurementPoints({
    combinedTotal: source.total_score != null ? Number(source.total_score) : formal.totalScore,
    categoryBasePoints: categoryBase,
    categoryBonusPoints: categoryBonus,
  })

  return {
    sourceAssessmentId,
    sourceAssessmentName: `Formal Procurement Assessment ${source.assessment_year}`,
    measurementPeriodStart: null,
    measurementPeriodEnd: null,
    capturedAt: new Date().toISOString(),
    capturedBy: userId,
    totalMeasuredProcurementSpend: total > 0 ? total : null,
    recognisedSpend,
    flowThroughApplied: rows.some((row) => row.is_51_percent_flow_through === true),
    sourceReportedBasePoints: normalised.sourceReportedBasePoints,
    sourceReportedBonusPoints: normalised.sourceReportedBonusPoints,
    sourceReportedCombinedPoints: normalised.sourceReportedCombinedPoints,
    sourceNormalisationWarning: normalised.sourceNormalisationWarning,
  }
}

/**
 * Store the snapshot on the full scorecard, record who attached it, and mark
 * procurement for recalculation.
 */
export async function attachProcurementSnapshot(args: {
  supabase: ServerSupabase
  assessmentId: string
  sourceId: string
  snapshot: ProcurementSnapshot
  userId: string
  /** True when a procurement snapshot was already attached (it is replaced). */
  replacing: boolean
  previousSourceId: string | null
}): Promise<{ error: { message?: string } | null }> {
  const { supabase, assessmentId, sourceId, snapshot, userId, replacing, previousSourceId } = args
  const { error } = await supabase
    .from('scorecard_assessments')
    .update({ procurement_assessment_id: sourceId, procurement_snapshot: snapshot })
    .eq('id', assessmentId)

  await recordAudit({
    supabase,
    assessmentId,
    action: replacing ? 'procurement.snapshot_replaced' : 'procurement.snapshot_attached',
    actor: userId,
    elementKey: 'preferential_procurement',
    detail: {
      previousAssessmentId: previousSourceId,
      newAssessmentId: sourceId,
    },
  })
  await markElementNeedsRecalculation(supabase, assessmentId, 'preferential_procurement')
  return { error }
}
