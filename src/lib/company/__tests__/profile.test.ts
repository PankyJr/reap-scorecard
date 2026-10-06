import { describe, expect, it } from 'vitest'
import { parseCompanyProfile } from '../profile'

function form(values: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

const complete = {
  name: 'Mokoena Logistics (Pty) Ltd',
  industry: 'Transport and logistics',
  financial_year_end_month: '2',
  annual_turnover: 'R30 000 000',
  black_ownership_percentage: '51',
}

describe('company form on the server', () => {
  it('accepts the five details and stores turnover and ownership as numbers', () => {
    const parsed = parseCompanyProfile(form(complete), { requireProfile: true })
    expect(parsed).toEqual({
      ok: true,
      values: expect.objectContaining({ financial_year_end_month: 2, annual_turnover: 30_000_000, black_ownership_percentage: 51 }),
    })
  })

  it('asks for each of the five details when a company is added', () => {
    expect(parseCompanyProfile(form({ ...complete, name: '' }), { requireProfile: true })).toMatchObject({ ok: false, error: 'Enter the company name.' })
    expect(parseCompanyProfile(form({ ...complete, industry: '' }), { requireProfile: true })).toMatchObject({ ok: false })
    expect(parseCompanyProfile(form({ ...complete, financial_year_end_month: '' }), { requireProfile: true })).toMatchObject({ ok: false })
    expect(parseCompanyProfile(form({ ...complete, annual_turnover: '' }), { requireProfile: true })).toMatchObject({ ok: false })
    expect(parseCompanyProfile(form({ ...complete, black_ownership_percentage: '' }), { requireProfile: true })).toMatchObject({ ok: false })
  })

  it('accepts 0% black ownership, which is a real answer', () => {
    expect(parseCompanyProfile(form({ ...complete, black_ownership_percentage: '0' }), { requireProfile: true })).toMatchObject({ ok: true })
  })

  it('lets an older company be edited without its turnover, but never with a wrong one', () => {
    const editing = { name: 'Old Co', industry: 'Widgets' }
    expect(parseCompanyProfile(form(editing), { requireProfile: false })).toMatchObject({ ok: true })
    expect(parseCompanyProfile(form({ ...editing, annual_turnover: 'lots' }), { requireProfile: false })).toMatchObject({ ok: false })
    expect(parseCompanyProfile(form({ ...editing, black_ownership_percentage: '120' }), { requireProfile: false })).toMatchObject({ ok: false })
    expect(parseCompanyProfile(form({ ...editing, financial_year_end_month: '13' }), { requireProfile: false })).toMatchObject({ ok: false })
  })

  it('checks an e-mail address only when one is given', () => {
    expect(parseCompanyProfile(form({ ...complete, email: 'not-an-email' }), { requireProfile: true })).toMatchObject({ ok: false })
    expect(parseCompanyProfile(form({ ...complete, email: 'tshepo@reap.co.za' }), { requireProfile: true })).toMatchObject({ ok: true })
  })
})
