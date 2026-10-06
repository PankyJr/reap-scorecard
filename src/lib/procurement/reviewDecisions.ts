/**
 * Choices made in the "Needs attention" list that must survive a save.
 *
 * Most fixes change the suppliers themselves (a level, an amount, a merge), so
 * they are saved with the suppliers. "Keep both" changes nothing on a supplier;
 * without remembering it, the same pair would be flagged again every time the
 * scorecard is opened. Stored in procurement_assessments.review_decisions.
 */

export type ProcurementReviewDecisions = {
  /** Duplicate-group keys (e.g. "vat:4123456789") kept as separate suppliers. */
  keptDuplicates: string[]
}

export const EMPTY_REVIEW_DECISIONS: ProcurementReviewDecisions = { keptDuplicates: [] }

const KEY_PATTERN = /^(name|vat|registration):[^\n\r]{1,200}$/
const MAX_KEYS = 10_000

export function parseReviewDecisions(raw: unknown): ProcurementReviewDecisions {
  let value: unknown = raw
  if (typeof raw === 'string') {
    if (!raw.trim()) return { keptDuplicates: [] }
    try {
      value = JSON.parse(raw)
    } catch {
      return { keptDuplicates: [] }
    }
  }
  if (!value || typeof value !== 'object') return { keptDuplicates: [] }
  const list = (value as { keptDuplicates?: unknown }).keptDuplicates
  if (!Array.isArray(list)) return { keptDuplicates: [] }
  const kept = new Set<string>()
  for (const item of list) {
    if (typeof item === 'string' && KEY_PATTERN.test(item)) kept.add(item)
    if (kept.size >= MAX_KEYS) break
  }
  return { keptDuplicates: [...kept].sort() }
}

export function serializeReviewDecisions(decisions: ProcurementReviewDecisions): string {
  return JSON.stringify(parseReviewDecisions(decisions))
}

type StoreError = { code?: string; message?: string } | null
type UpdatableClient = {
  from(table: string): {
    update(values: Record<string, unknown>): { eq(column: string, value: string): PromiseLike<{ error: StoreError }> }
  }
}

/**
 * Save the decisions on the assessment. Written as its own update after the
 * main save, so a database without the review_decisions column yet (migration
 * 20261006120000 not applied) still saves the scorecard; only "Keep both" is
 * then not remembered. With nothing to remember and `onlyIfAny`, nothing is written.
 */
export async function storeReviewDecisions(
  client: UpdatableClient,
  assessmentId: string,
  decisions: ProcurementReviewDecisions,
  options: { onlyIfAny: boolean },
): Promise<'saved' | 'skipped' | 'unavailable'> {
  if (options.onlyIfAny && decisions.keptDuplicates.length === 0) return 'skipped'
  const { error } = await client
    .from('procurement_assessments')
    .update({ review_decisions: decisions.keptDuplicates.length > 0 ? decisions : null })
    .eq('id', assessmentId)
  if (!error) return 'saved'
  const missingColumn = error.code === 'PGRST204' || error.code === '42703'
  console.error(
    missingColumn
      ? '[PROCUREMENT] review_decisions column missing: apply migration 20261006120000_procurement_review_decisions.sql'
      : '[PROCUREMENT] Could not save review decisions',
    { assessmentId, code: error.code },
  )
  return 'unavailable'
}
