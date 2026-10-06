import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/procurement/assessments/new',
}))
vi.mock('../actions', () => ({ createProcurementAssessment: vi.fn() }))
vi.mock('../excelParseAction', () => ({ procurementExcelParseAction: vi.fn() }))

import { mismatchedButtons } from '@/test-utils/button-names'
import { NewProcurementAssessmentForm } from '../NewProcurementAssessmentForm'
import { emptySupplierFormRow } from '../SuppliersTable'
import type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'

function supplier(overrides: Partial<SupplierFormRow>): SupplierFormRow {
  return { ...emptySupplierFormRow(), supplier_name: 'Supplier', value_ex_vat: 1000, level: '4', ...overrides }
}

function render(suppliers: SupplierFormRow[]) {
  return renderToStaticMarkup(
    <NewProcurementAssessmentForm
      formId="test"
      initialData={{ assessment_year: 2025, tmps: {}, suppliers, tmpsDenominatorSource: 'import_supplier_total' }}
    />,
  )
}

describe('procurement wizard', () => {
  it('starts with the upload and the template downloads', () => {
    const html = renderToStaticMarkup(<NewProcurementAssessmentForm formId="test" />)
    expect(html).toContain('Upload the supplier list')
    expect(html).toContain('href="/api/procurement/supplier-template"')
    expect(html).toContain('href="/api/procurement/supplier-template?format=csv"')
    expect(html).toContain('Suppliers')
    expect(html).toContain('Check suppliers')
    expect(mismatchedButtons(html)).toEqual([])
  })

  it('lists expired certificates first, with a one-click fix, and marks the score Incomplete', () => {
    const html = render([
      supplier({ id: 'a', supplier_name: 'Expired Co', level: '1', expiry: '2024-03-31' }),
      supplier({ id: 'b', supplier_name: 'No Level Co', level: '' }),
      supplier({ id: 'c', supplier_name: 'Fine Co', level: '2', expiry: '2027-01-01' }),
    ])
    const expiredAt = html.indexOf('Expired certificates')
    const missingAt = html.indexOf('No B-BBEE level')
    expect(expiredAt).toBeGreaterThan(0)
    expect(missingAt).toBeGreaterThan(expiredAt)
    expect(html).toContain('Mark all 1 as non-compliant')
    expect(html).toContain('An expired certificate scores nothing')
    expect(html).toContain('Incomplete')
    expect(html).toContain('/ 25 points')
    expect(html).toContain('bonus')
    expect(mismatchedButtons(html)).toEqual([])
  })

  it('offers Merge and Keep both for the same VAT number', () => {
    const html = render([
      supplier({ id: 'a', supplier_name: 'Alpha', vat_number: '4123456789' }),
      supplier({ id: 'b', supplier_name: 'Alpha Trading', vat_number: '4123 456 789' }),
    ])
    expect(html).toContain('the same VAT number')
    expect(html).toContain('>Merge<')
    expect(html).toContain('Keep both')
  })

  it('shows zero amounts instead of dropping them, and says they block saving', () => {
    const html = render([supplier({ id: 'a', supplier_name: 'Nothing Spent', value_ex_vat: 0 }), supplier({ id: 'b', supplier_name: 'Spent' })])
    expect(html).toContain('Zero or negative amounts')
    expect(html).toContain('Nothing Spent')
    expect(html).toContain('These must be fixed before saving')
  })

  it('asks for total spend in one plain sentence, pre-filled from the supplier list', () => {
    const html = render([
      supplier({ id: 'a', supplier_name: 'One', value_ex_vat: 2500 }),
      supplier({ id: 'b', supplier_name: 'Two', value_ex_vat: 7500 }),
    ])
    expect(html).toContain('leaving out salaries and wages')
    expect(html).toContain('The total of your supplier list.')
    expect(html).toContain('More options: work it out from the financial statements')
    expect(html).toContain('R 10,000.00')
    expect(html).toContain('Nothing needs attention.')
  })
})
