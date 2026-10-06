import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SUPPLIER_PAGE_SIZE, SuppliersTable, emptySupplierFormRow, parseBulkSuppliers } from '../SuppliersTable'
import type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'
import { mismatchedButtons } from '@/test-utils/button-names'

function rows(n: number): SupplierFormRow[] {
  return Array.from({ length: n }, (_, i) => ({
    ...emptySupplierFormRow(),
    id: `r${i}`,
    supplier_name: `Supplier ${i}`,
    value_ex_vat: 1000 + i,
    level: String((i % 8) + 1),
  }))
}

describe('SuppliersTable with 8,000 suppliers', () => {
  it('renders one page of cards, not 8,000', () => {
    const started = performance.now()
    const html = renderToStaticMarkup(<SuppliersTable rows={rows(8000)} onChangeRows={() => {}} />)
    const elapsed = performance.now() - started
    expect(html.match(/<li class="rounded-card/g)).toHaveLength(SUPPLIER_PAGE_SIZE)
    expect(html).toContain(`Page 1 of ${8000 / SUPPLIER_PAGE_SIZE}`)
    expect(html).toContain('Showing 1 to 50 of 8000 suppliers')
    expect(elapsed).toBeLessThan(1000)
  })

  it('names every button by the words it shows', () => {
    const html = renderToStaticMarkup(<SuppliersTable rows={rows(3)} onChangeRows={() => {}} />)
    expect(mismatchedButtons(html)).toEqual([])
  })

  it('shows a missing level as missing, not as Non-compliant', () => {
    const html = renderToStaticMarkup(
      <SuppliersTable rows={[{ ...emptySupplierFormRow(), supplier_name: 'No level yet', value_ex_vat: 10 }]} onChangeRows={() => {}} />,
    )
    expect(html).toContain('no level')
    expect(html).toContain('Not given (counts as nothing)')
  })
})

describe('parseBulkSuppliers', () => {
  it('keeps a zero amount and a blank level so they are shown, not skipped', () => {
    const result = parseBulkSuppliers('Supplier name\tSpend\nAcme\t0\nBeta\t100\tQSE\t\nGamma\tabc')
    expect(result.rows.map((r) => [r.supplier_name, r.value_ex_vat, r.level, r.supplier_type])).toEqual([
      ['Acme', 0, '', 'Generic'],
      ['Beta', 100, '', 'QSE'],
    ])
    expect(result.skippedHeaderRows).toBe(1)
    expect(result.warnings).toEqual(['Line 4 (“Gamma”): not added, the amount in the second column is not a number.'])
  })

  it('reads levels, flags and identifiers', () => {
    const [row] = parseBulkSuppliers('Acme,500,EME,Level 2,yes,no,yes,C1,4123456789,2001/1/07,,,,,2027-01-31,note,yes').rows
    expect(row).toMatchObject({
      level: '2',
      supplier_type: 'EME',
      is_51_black_owned: true,
      is_30_black_women_owned: false,
      is_51_bdgs: true,
      supplier_code: 'C1',
      vat_number: '4123456789',
      expiry: '2027-01-31',
      is_51_percent_flow_through: true,
    })
  })
})
