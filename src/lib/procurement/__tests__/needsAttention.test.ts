import { describe, expect, it } from 'vitest'
import {
  analyseNeedsAttention,
  certificateReferenceDate,
  expiredAndNotCounting,
  findDuplicateGroups,
  isCertificateExpired,
  markNonCompliant,
  mergeDuplicateRows,
  normaliseRegistration,
  normaliseSupplierName,
  normaliseVatNumber,
  removeRows,
  type AttentionRow,
} from '../needsAttention'
import { calculateSupplierRow } from '../rows'

function row(id: string, overrides: Partial<AttentionRow> = {}): AttentionRow {
  return { id, supplier_name: `Supplier ${id}`, value_ex_vat: 100, level: '4', expiry: '', vat_number: '', company_registration: '', ...overrides }
}

const REF = '2026-06-30'

describe('certificate dates', () => {
  it('uses the end of the measurement year, or today if that has not come yet', () => {
    const now = new Date('2026-10-06T10:00:00Z')
    expect(certificateReferenceDate(2025, now)).toBe('2025-12-31')
    expect(certificateReferenceDate(2026, now)).toBe('2026-10-06')
    expect(certificateReferenceDate(null, now)).toBe('2026-10-06')
  })

  it('treats a certificate as expired only when its date is before the reference date', () => {
    expect(isCertificateExpired('2026-06-29', REF)).toBe(true)
    expect(isCertificateExpired('2026-06-30', REF)).toBe(false)
    expect(isCertificateExpired('', REF)).toBe(false)
    expect(isCertificateExpired('31/12/2020', REF)).toBe(false)
    expect(isCertificateExpired('2026-02-31', REF)).toBe(false)
  })
})

describe('analyseNeedsAttention', () => {
  it('lists expired certificates first and explains nothing silently', () => {
    const rows = [
      row('a', { expiry: '2025-01-31', level: '2' }),
      row('b', { expiry: '2027-01-31', level: '2' }),
      row('c', { level: '' }),
      row('d', { level: 'Non-Compliant', expiry: '2020-01-01' }),
    ]
    const result = analyseNeedsAttention(rows, { referenceDate: REF })
    expect(result.expired.map((i) => i.rowId)).toEqual(['a'])
    expect(result.missingLevel.map((i) => i.rowId)).toEqual(['c'])
    // d is already Non-compliant: it is not counting, and that is no longer a problem.
    expect(result.count).toBe(2)
    expect(expiredAndNotCounting(rows, REF)).toEqual({ count: 1, spend: 100 })
  })

  it('treats an unknown level text as missing, not as Non-compliant', () => {
    const result = analyseNeedsAttention([row('a', { level: 'Level 9' }), row('b', { level: 'Non-Compliant' })], {
      referenceDate: REF,
    })
    expect(result.missingLevel.map((i) => i.rowId)).toEqual(['a'])
  })

  it('shows zero, negative and above-total amounts instead of skipping them', () => {
    const rows = [
      row('zero', { value_ex_vat: 0 }),
      row('neg', { value_ex_vat: -50 }),
      row('big', { value_ex_vat: 5000 }),
      row('ok', { value_ex_vat: 500 }),
    ]
    const result = analyseNeedsAttention(rows, { referenceDate: REF, totalMeasuredSpend: 1000 })
    expect(result.oddAmounts.map((i) => [i.rowId, i.reason])).toEqual([
      ['zero', 'zero'],
      ['neg', 'negative'],
      ['big', 'above_total'],
    ])
    expect(result.blockingCount).toBe(2)
    // Without a total spend there is nothing to be above.
    expect(analyseNeedsAttention(rows, { referenceDate: REF }).oddAmounts).toHaveLength(2)
  })

  it('is empty for a clean list', () => {
    const result = analyseNeedsAttention([row('a'), row('b')], { referenceDate: REF, totalMeasuredSpend: 1000 })
    expect(result.count).toBe(0)
  })
})

describe('duplicates', () => {
  it('normalises names, VAT numbers and registrations', () => {
    expect(normaliseSupplierName('ACME Supplies (Pty) Ltd.')).toBe('acme supplies')
    expect(normaliseSupplierName('Acme  Supplies CC')).toBe('acme supplies')
    expect(normaliseSupplierName('Smith & Sons')).toBe('smith and sons')
    expect(normaliseVatNumber('4123 456 789')).toBe('4123456789')
    expect(normaliseVatNumber('n/a')).toBe('')
    expect(normaliseRegistration('2001/123456/07')).toBe('200112345607')
    expect(normaliseRegistration('-')).toBe('')
  })

  it('groups the same name, the same VAT number or the same registration', () => {
    const rows = [
      row('1', { supplier_name: 'Acme Supplies (Pty) Ltd' }),
      row('2', { supplier_name: 'ACME SUPPLIES' }),
      row('3', { supplier_name: 'Beta', vat_number: '4111111111' }),
      row('4', { supplier_name: 'Beta Holdings', vat_number: '4111 111 111' }),
      row('5', { supplier_name: 'Gamma', company_registration: '2001/123456/07' }),
      row('6', { supplier_name: 'Gamma Trading', company_registration: '200112345607', level: '2' }),
      row('7', { supplier_name: 'Unique' }),
    ]
    const groups = findDuplicateGroups(rows)
    expect(groups.map((g) => [g.rowIds, g.reasons, g.key])).toEqual([
      [['1', '2'], ['name'], 'name:acme supplies'],
      [['3', '4'], ['vat'], 'vat:4111111111'],
      [['5', '6'], ['registration'], 'registration:200112345607'],
    ])
    expect(groups[2].levelsDiffer).toBe(true)
    expect(groups[0].totalSpend).toBe(200)
  })

  it('leaves out groups the person chose to keep as separate suppliers', () => {
    const rows = [row('1', { supplier_name: 'Same' }), row('2', { supplier_name: 'Same' })]
    expect(findDuplicateGroups(rows, new Set(['name:same']))).toEqual([])
  })

  it('finds pairs among 8,000 suppliers quickly', () => {
    const rows = Array.from({ length: 8000 }, (_, i) => row(String(i), { supplier_name: `Supplier ${i % 7999}` }))
    const started = performance.now()
    const groups = findDuplicateGroups(rows)
    expect(performance.now() - started).toBeLessThan(500)
    expect(groups).toHaveLength(1)
    expect(groups[0].rowIds).toEqual(['0', '7999'])
  })
})

describe('one-click fixes', () => {
  it('marks an expired supplier Non-compliant, which scores nothing', () => {
    const rows = [row('a', { level: '1', expiry: '2020-01-01' }), row('b', { level: '1' })]
    const fixed = markNonCompliant(rows, ['a'])
    expect(fixed.map((r) => r.level)).toEqual(['Non-Compliant', '1'])
    expect(rows[0].level).toBe('1')
    const scored = calculateSupplierRow({
      supplier_name: 'a',
      supplier_type: 'Generic',
      level: fixed[0].level,
      value_ex_vat: 100,
      is_51_black_owned: true,
      is_30_black_women_owned: false,
      is_51_bdgs: false,
    })
    expect(scored.recognition_percent).toBe(0)
    expect(scored.bbbee_spend).toBe(0)
    expect(analyseNeedsAttention(fixed, { referenceDate: REF }).count).toBe(0)
  })

  it('marks a supplier with no level Non-compliant', () => {
    expect(markNonCompliant([row('a', { level: '' })], ['a'])[0].level).toBe('Non-Compliant')
  })

  it('merges duplicates by adding the spend and keeping the first row', () => {
    const rows = [
      row('1', { supplier_name: 'Acme', value_ex_vat: 100, level: '2' }),
      row('x', { supplier_name: 'Other', value_ex_vat: 5 }),
      row('2', { supplier_name: 'ACME', value_ex_vat: 250, level: '4', vat_number: '4123456789' }),
    ]
    const merged = mergeDuplicateRows(rows, ['1', '2'])
    expect(merged.map((r) => [r.id, r.value_ex_vat, r.level, r.vat_number])).toEqual([
      ['1', 350, '2', '4123456789'],
      ['x', 5, '4', ''],
    ])
  })

  it('removes rows', () => {
    expect(removeRows([row('a'), row('b')], ['a']).map((r) => r.id)).toEqual(['b'])
  })
})
