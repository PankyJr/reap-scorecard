import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/procurement/assessments/new',
}))
vi.mock('../actions', () => ({ createProcurementAssessment: vi.fn() }))
vi.mock('../excelParseAction', () => ({ parseProcurementExcelAction: vi.fn() }))

import { mismatchedButtons } from '@/test-utils/button-names'
import { NewProcurementAssessmentForm } from '../NewProcurementAssessmentForm'

describe('procurement form buttons', () => {
  it('are named by the words they show, so voice control can press them', () => {
    const html = renderToStaticMarkup(<NewProcurementAssessmentForm formId="test" />)
    expect(html).toContain('Save and see result')
    expect(mismatchedButtons(html)).toEqual([])
  })
})
