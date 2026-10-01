import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/procurement/assessments/new',
}))
vi.mock('../actions', () => ({ createProcurementAssessment: vi.fn() }))
vi.mock('../excelParseAction', () => ({ parseProcurementExcelAction: vi.fn() }))

import { NewProcurementAssessmentForm } from '../NewProcurementAssessmentForm'

/** Every <button> whose aria-label does not contain the words it shows. */
function mismatchedButtons(html: string): string[] {
  const bad: string[] = []
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const label = m[1].match(/aria-label="([^"]*)"/)?.[1]
    const visible = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (label && visible && !label.toLowerCase().includes(visible.toLowerCase())) bad.push(`"${visible}" is named "${label}"`)
  }
  return bad
}

describe('procurement form buttons', () => {
  it('are named by the words they show, so voice control can press them', () => {
    const html = renderToStaticMarkup(<NewProcurementAssessmentForm formId="test" />)
    expect(html).toContain('Save and see result')
    expect(mismatchedButtons(html)).toEqual([])
  })
})
