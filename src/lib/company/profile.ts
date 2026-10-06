import { parsePercent, parseRand } from './industries'

export type CompanyProfileValues = {
  name: string
  industry: string
  financial_year_end_month: number | null
  annual_turnover: number | null
  black_ownership_percentage: number | null
  contact_person: string
  email: string
  phone: string
  notes: string
}

export type ParsedCompanyProfile = { ok: true; values: CompanyProfileValues } | { ok: false; error: string }

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim()

/**
 * The company form's values, checked on the server with one plain message for
 * the first problem. Adding a company asks for the five details that matter
 * for B-BBEE (`requireProfile`); editing an older company only insists on its
 * name and industry, so a missing turnover never blocks fixing a phone number.
 */
export function parseCompanyProfile(form: FormData, opts: { requireProfile: boolean }): ParsedCompanyProfile {
  const name = text(form, 'name')
  const industry = text(form, 'industry')
  const monthRaw = text(form, 'financial_year_end_month')
  const turnoverRaw = text(form, 'annual_turnover')
  const ownershipRaw = text(form, 'black_ownership_percentage')
  const email = text(form, 'email')

  if (!name) return { ok: false, error: 'Enter the company name.' }
  if (name.length > 200) return { ok: false, error: 'The company name is too long (200 characters at most).' }
  if (!industry) return { ok: false, error: 'Choose the industry the company works in.' }
  if (industry.length > 120) return { ok: false, error: 'The industry is too long (120 characters at most).' }

  const month = monthRaw === '' ? null : Number(monthRaw)
  if (month != null && !(Number.isInteger(month) && month >= 1 && month <= 12)) {
    return { ok: false, error: 'Choose the month the financial year ends.' }
  }
  const turnover = parseRand(turnoverRaw)
  if (turnoverRaw !== '' && turnover == null) {
    return { ok: false, error: 'Enter the annual turnover as an amount in rand, like 30 000 000.' }
  }
  const ownership = parsePercent(ownershipRaw)
  if (ownershipRaw !== '' && ownership == null) {
    return { ok: false, error: 'Enter black ownership as a percentage from 0 to 100, like 51.' }
  }

  if (opts.requireProfile) {
    if (month == null) return { ok: false, error: 'Choose the month the financial year ends.' }
    if (turnover == null) return { ok: false, error: 'Enter the annual turnover, like 30 000 000.' }
    if (ownership == null) return { ok: false, error: 'Enter black ownership as a percentage, like 51. Enter 0 if there is none.' }
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address, like name@company.co.za.' }
  }

  const contact = text(form, 'contact_person')
  const phone = text(form, 'phone')
  const notes = text(form, 'notes')
  if (contact.length > 120) return { ok: false, error: 'The contact name is too long (120 characters at most).' }
  if (phone.length > 50) return { ok: false, error: 'The phone number is too long.' }
  if (notes.length > 2000) return { ok: false, error: 'The notes are too long (2,000 characters at most).' }

  return {
    ok: true,
    values: {
      name,
      industry,
      financial_year_end_month: month,
      annual_turnover: turnover,
      black_ownership_percentage: ownership,
      contact_person: contact,
      email,
      phone,
      notes,
    },
  }
}
