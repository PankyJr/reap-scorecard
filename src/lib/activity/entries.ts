/**
 * Activity feed entries, merged from the two audit trails the app writes to.
 *
 * There are two, and that is the whole reason the feed looked empty:
 *
 *   `audit_log`                      — companies, legacy scorecards, procurement
 *   `scorecard_assessment_audit_log` — everything the generic scorecard engine does
 *
 * The feed only ever read the first, so generic scorecard work — evidence
 * confirmations, calculations, input changes — was recorded faithfully and
 * then never shown. This module normalises both into one shape so the page can
 * present a single chronological trail.
 *
 * Reading is fixed here rather than making the engine write to both tables:
 * dual-writing would duplicate every future row and would still leave the
 * existing history invisible.
 */

export type ActivitySource = 'workspace' | 'scorecard'

export type ActivityEntry = {
  id: string
  action: string
  entityName: string | null
  actorEmail: string | null
  actorId: string | null
  createdAt: string | null
  source: ActivitySource
}

const ACTION_LABELS: Record<string, string> = {
  // audit_log — companies, legacy scorecards, procurement
  'company.created': 'Company created',
  'company.updated': 'Company updated',
  'company.deleted': 'Company deleted',
  'scorecard.created': 'Scorecard created',
  'scorecard.updated': 'Scorecard updated',
  'scorecard.deleted': 'Scorecard deleted',
  'procurement_assessment.created': 'Procurement assessment created',
  'procurement_assessment.updated': 'Procurement assessment updated',
  'procurement_assessment.deleted': 'Procurement assessment deleted',

  // scorecard_assessment_audit_log — the generic scorecard engine
  'scorecard.calculated': 'Scorecard calculated',
  'applicability.updated': 'Applicability updated',
  'financial_inputs.updated': 'Financial inputs updated',
  'ownership.updated': 'Ownership inputs updated',
  'management_control.inputs_updated': 'Management control inputs updated',
  'skills_development.inputs_updated': 'Skills development inputs updated',
  'contribution.created': 'Contribution added',
  'contribution.updated': 'Contribution updated',
  'contribution.deleted': 'Contribution deleted',
  'contribution.evidence_confirmed': 'Supporting evidence confirmed',
  'contribution.evidence_reference_corrected': 'Evidence reference corrected',
  'esd_bonus.updated': 'ESD bonus flags updated',
  'eap_target_set.attached': 'EAP target set attached',
  'eap_target_set.detached': 'EAP target set detached',
  'workbook.analysed': 'Workbook analysed',
  'workbook.imported': 'Workbook imported',
}

/** Human label for an audited action; unknown keys fall back to the raw key. */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

/** True when the feed has copy for this action rather than a raw key. */
export function hasActionLabel(action: string): boolean {
  return action in ACTION_LABELS
}

type WorkspaceRow = {
  id: string
  action: string
  entity_type?: string | null
  entity_name?: string | null
  actor_email?: string | null
  actor_id?: string | null
  created_at?: string | null
}

type ScorecardRow = {
  id: string
  action: string
  element_key?: string | null
  actor?: string | null
  created_at?: string | null
  // PostgREST embeds a to-one relation as an object, but tolerate an array.
  scorecard_assessments?: { name?: string | null } | Array<{ name?: string | null }> | null
}

function embeddedName(row: ScorecardRow): string | null {
  const rel = row.scorecard_assessments
  const one = Array.isArray(rel) ? rel[0] : rel
  return one?.name ?? null
}

/** Turn an element key such as `socio_economic_development` into words. */
function readableElement(elementKey: string): string {
  return elementKey.replace(/_/g, ' ')
}

export function toWorkspaceEntries(rows: readonly WorkspaceRow[] | null | undefined): ActivityEntry[] {
  return (rows ?? []).map((row) => ({
    id: `workspace:${row.id}`,
    action: row.action,
    entityName: row.entity_name ?? null,
    actorEmail: row.actor_email ?? null,
    actorId: row.actor_id ?? null,
    createdAt: row.created_at ?? null,
    source: 'workspace' as const,
  }))
}

export function toScorecardEntries(rows: readonly ScorecardRow[] | null | undefined): ActivityEntry[] {
  return (rows ?? []).map((row) => {
    const name = embeddedName(row)
    // The element gives the entry its bearings: "Acme 2026 — skills development".
    const entityName = name
      ? row.element_key
        ? `${name} — ${readableElement(row.element_key)}`
        : name
      : row.element_key
        ? readableElement(row.element_key)
        : null
    return {
      id: `scorecard:${row.id}`,
      action: row.action,
      entityName,
      // This trail stores only the actor's id; the page renders "User" for it.
      actorEmail: null,
      actorId: row.actor ?? null,
      createdAt: row.created_at ?? null,
      source: 'scorecard' as const,
    }
  })
}

/** Newest first. Entries with no timestamp sort last rather than disappearing. */
export function mergeActivityEntries(
  workspace: readonly ActivityEntry[],
  scorecard: readonly ActivityEntry[],
  limit = 100,
): ActivityEntry[] {
  return [...workspace, ...scorecard]
    .sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0
      if (!a.createdAt) return 1
      if (!b.createdAt) return -1
      return b.createdAt.localeCompare(a.createdAt)
    })
    .slice(0, limit)
}
