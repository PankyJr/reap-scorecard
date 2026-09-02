import { describe, expect, it } from 'vitest'
import {
  actionLabel,
  hasActionLabel,
  mergeActivityEntries,
  toScorecardEntries,
  toWorkspaceEntries,
} from '../entries'

const workspaceRow = (overrides = {}) => ({
  id: 'w1',
  action: 'company.created',
  entity_name: 'Walkthrough Test',
  actor_email: 'someone@example.com',
  actor_id: 'user-1',
  created_at: '2026-08-20T10:00:00.000Z',
  ...overrides,
})

const scorecardRow = (overrides = {}) => ({
  id: 's1',
  action: 'contribution.evidence_confirmed',
  element_key: 'enterprise_development',
  actor: 'user-1',
  created_at: '2026-08-27T10:00:00.000Z',
  scorecard_assessments: { name: 'Walkthrough Test 2026 Generic Scorecard' },
  ...overrides,
})

describe('action labels', () => {
  // The feed claimed to record scorecard saves while showing none of them.
  it.each([
    ['contribution.evidence_confirmed', 'Supporting evidence confirmed'],
    ['contribution.evidence_reference_corrected', 'Evidence reference corrected'],
    ['scorecard.calculated', 'Scorecard calculated'],
    ['ownership.updated', 'Ownership inputs updated'],
  ])('labels %s', (action, label) => {
    expect(actionLabel(action)).toBe(label)
  })

  it('still labels the pre-existing workspace actions', () => {
    expect(actionLabel('company.created')).toBe('Company created')
    expect(actionLabel('procurement_assessment.updated')).toBe('Procurement assessment updated')
  })

  it('covers every action the generic engine actually records', () => {
    // Taken from the distinct actions present in scorecard_assessment_audit_log.
    for (const action of [
      'applicability.updated',
      'contribution.created',
      'contribution.deleted',
      'contribution.evidence_confirmed',
      'eap_target_set.attached',
      'esd_bonus.updated',
      'financial_inputs.updated',
      'management_control.inputs_updated',
      'ownership.updated',
      'scorecard.calculated',
      'skills_development.inputs_updated',
      'workbook.analysed',
      'workbook.imported',
    ]) {
      expect(hasActionLabel(action), `${action} has no label`).toBe(true)
    }
  })

  it('falls back to the raw key rather than rendering nothing', () => {
    expect(actionLabel('something.new')).toBe('something.new')
  })
})

describe('normalising the two trails', () => {
  it('names a scorecard entry by its assessment and element', () => {
    const [entry] = toScorecardEntries([scorecardRow()])
    expect(entry.entityName).toBe('Walkthrough Test 2026 Generic Scorecard — enterprise development')
    expect(entry.actorId).toBe('user-1')
    expect(entry.source).toBe('scorecard')
  })

  it('copes with an embedded relation returned as an array', () => {
    const [entry] = toScorecardEntries([
      scorecardRow({ scorecard_assessments: [{ name: 'Acme 2026' }], element_key: null }),
    ])
    expect(entry.entityName).toBe('Acme 2026')
  })

  it('survives a missing assessment relation', () => {
    const [entry] = toScorecardEntries([scorecardRow({ scorecard_assessments: null })])
    expect(entry.entityName).toBe('enterprise development')
  })

  it('keeps ids from the two trails distinct', () => {
    const [w] = toWorkspaceEntries([workspaceRow({ id: 'same' })])
    const [s] = toScorecardEntries([scorecardRow({ id: 'same' })])
    expect(w.id).not.toBe(s.id)
  })

  it('handles null input', () => {
    expect(toWorkspaceEntries(null)).toEqual([])
    expect(toScorecardEntries(undefined)).toEqual([])
  })
})

describe('merging into one chronological feed', () => {
  it('interleaves both sources, newest first', () => {
    const merged = mergeActivityEntries(
      toWorkspaceEntries([
        workspaceRow({ id: 'old', created_at: '2026-08-01T00:00:00.000Z' }),
        workspaceRow({ id: 'newest', created_at: '2026-08-30T00:00:00.000Z' }),
      ]),
      toScorecardEntries([scorecardRow({ id: 'middle', created_at: '2026-08-15T00:00:00.000Z' })]),
    )
    expect(merged.map((e) => e.id)).toEqual(['workspace:newest', 'scorecard:middle', 'workspace:old'])
  })

  it('shows scorecard activity even when the workspace trail is empty', () => {
    // Exactly the staging situation: audit_log empty, 77 scorecard rows.
    const merged = mergeActivityEntries([], toScorecardEntries([scorecardRow()]))
    expect(merged).toHaveLength(1)
    expect(merged[0].source).toBe('scorecard')
  })

  it('sorts entries with no timestamp last rather than dropping them', () => {
    const merged = mergeActivityEntries(
      toWorkspaceEntries([workspaceRow({ id: 'undated', created_at: null })]),
      toScorecardEntries([scorecardRow({ id: 'dated' })]),
    )
    expect(merged.map((e) => e.id)).toEqual(['scorecard:dated', 'workspace:undated'])
  })

  it('applies the limit after merging, not before', () => {
    const merged = mergeActivityEntries(
      toWorkspaceEntries([workspaceRow({ id: 'a', created_at: '2026-08-01T00:00:00.000Z' })]),
      toScorecardEntries([scorecardRow({ id: 'b', created_at: '2026-08-30T00:00:00.000Z' })]),
      1,
    )
    expect(merged.map((e) => e.id)).toEqual(['scorecard:b'])
  })
})
