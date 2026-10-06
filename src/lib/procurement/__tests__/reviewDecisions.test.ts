import { describe, expect, it, vi } from 'vitest'
import { parseReviewDecisions, serializeReviewDecisions, storeReviewDecisions } from '../reviewDecisions'
import { supplierFromDatabaseRow } from '../supplierFormRow'

describe('review decisions', () => {
  it('keep only well-formed duplicate keys, once each', () => {
    expect(
      parseReviewDecisions(JSON.stringify({ keptDuplicates: ['vat:4123456789', 'vat:4123456789', 'name:acme', 'evil', 5] })),
    ).toEqual({ keptDuplicates: ['name:acme', 'vat:4123456789'] })
    expect(parseReviewDecisions('not json')).toEqual({ keptDuplicates: [] })
    expect(parseReviewDecisions(null)).toEqual({ keptDuplicates: [] })
    expect(parseReviewDecisions({ keptDuplicates: ['registration:200112345607'] }).keptDuplicates).toHaveLength(1)
    expect(serializeReviewDecisions({ keptDuplicates: ['name:b', 'name:a'] })).toBe('{"keptDuplicates":["name:a","name:b"]}')
  })

  function client(error: { code?: string } | null) {
    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error })) }))
    return { update, client: { from: vi.fn(() => ({ update })) } }
  }

  it('write nothing for a new scorecard with nothing to remember', async () => {
    const { client: c, update } = client(null)
    expect(await storeReviewDecisions(c, 'a', { keptDuplicates: [] }, { onlyIfAny: true })).toBe('skipped')
    expect(update).not.toHaveBeenCalled()
  })

  it('clear old decisions when an edited scorecard has none left', async () => {
    const { client: c, update } = client(null)
    expect(await storeReviewDecisions(c, 'a', { keptDuplicates: [] }, { onlyIfAny: false })).toBe('saved')
    expect(update).toHaveBeenCalledWith({ review_decisions: null })
  })

  it('do not stop the save when the column is not in the database yet', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client: c } = client({ code: 'PGRST204' })
    expect(await storeReviewDecisions(c, 'a', { keptDuplicates: ['name:x'] }, { onlyIfAny: true })).toBe('unavailable')
    expect(spy.mock.calls[0][0]).toMatch(/apply migration 20261006130000/)
    spy.mockRestore()
  })
})

describe('supplierFromDatabaseRow', () => {
  const base = { id: 's', supplier_name: 'X', supplier_type: 'Generic', value_ex_vat: 1 }
  it('keeps a missing level missing instead of turning it into Non-compliant', () => {
    expect(supplierFromDatabaseRow({ ...base, level: '' }).level).toBe('')
    expect(supplierFromDatabaseRow({ ...base, level: 'Non-Compliant' }).level).toBe('Non-Compliant')
    expect(supplierFromDatabaseRow({ ...base, level: 'Level 3' }).level).toBe('3')
  })
})
