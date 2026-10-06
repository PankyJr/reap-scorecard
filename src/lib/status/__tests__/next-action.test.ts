import { describe, expect, it } from 'vitest'
import { pickNextAction } from '../next-action'
import type { AssessmentRow } from '@/lib/assessments/rows'

const row = (over: Partial<AssessmentRow>): AssessmentRow => ({
  id: 'a',
  kind: 'full',
  title: 'FY2026 scorecard',
  companyId: 'c1',
  companyName: 'Mokoena',
  year: 2026,
  updatedAt: '2026-10-01T00:00:00Z',
  status: { label: 'Workbook not uploaded', tone: 'neutral', next: 'Upload the workbook', href: '/x', finished: false, explain: 'Upload it.' },
  score: null,
  ...over,
})

describe('pickNextAction', () => {
  it('asks a new user to start', () => {
    expect(pickNextAction({ companies: [], rows: [] })).toMatchObject({ href: '/companies/new', button: 'Add your first company' })
  })

  it('picks the most recently touched unfinished scorecard', () => {
    const a = row({ id: 'old', updatedAt: '2026-09-01T00:00:00Z', status: { ...row({}).status, href: '/old' } })
    const b = row({ id: 'new', updatedAt: '2026-10-01T00:00:00Z', status: { ...row({}).status, href: '/new' } })
    expect(pickNextAction({ companies: [{ id: 'c1', name: 'Mokoena' }], rows: [a, b] }).href).toBe('/new')
  })

  it('suggests a company that has nothing started', () => {
    const done = row({ status: { label: 'Finished', tone: 'ok', next: 'View result', href: '/r', finished: true, explain: 'Done.' } })
    const next = pickNextAction({ companies: [{ id: 'c1', name: 'Mokoena' }, { id: 'c2', name: 'Thaba' }], rows: [done] })
    expect(next).toMatchObject({ title: 'Choose what you need for Thaba', href: '/start?companyId=c2' })
  })

  it('says everything is up to date when all is finished', () => {
    const done = row({ status: { label: 'Finished', tone: 'ok', next: 'View result', href: '/r', finished: true, explain: 'Done.' } })
    expect(pickNextAction({ companies: [{ id: 'c1', name: 'Mokoena' }], rows: [done] }).title).toBe('Everything is up to date')
  })
})
