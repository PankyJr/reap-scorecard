/**
 * Reads a certificate expiry date from a spreadsheet cell into YYYY-MM-DD.
 *
 * South African registers write dates day first (31/03/2026). Excel stores a
 * date cell as a serial day number. Anything that is not clearly a real date
 * returns null: a wrong expiry date would silently change which suppliers
 * count, so it is better left blank and shown.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
}

function iso(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function fullYear(raw: string): number {
  const n = Number(raw)
  return raw.length === 2 ? 2000 + n : n
}

/** Excel serial day numbers from 1990 to 2100. */
function fromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 32874 || serial > 73415) return null
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000)
  return iso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function parseExpiryDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : iso(raw.getUTCFullYear(), raw.getUTCMonth() + 1, raw.getUTCDate())
  }
  if (typeof raw === 'number') return fromExcelSerial(raw)

  const text = String(raw).trim().replace(/\s+/g, ' ')
  if (!text) return null
  if (/^\d{5}(\.\d+)?$/.test(text)) return fromExcelSerial(Number(text))

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(text)
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]))

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/.exec(text)
  if (m) return iso(fullYear(m[3]), Number(m[2]), Number(m[1]))

  m = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)\.?,? (\d{4})$/i.exec(text)
  if (m && MONTHS[m[2].toLowerCase()]) return iso(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]))

  m = /^(\d{1,2})[- ]([a-z]{3,9})[- ](\d{4}|\d{2})$/i.exec(text)
  if (m && MONTHS[m[2].toLowerCase()]) return iso(fullYear(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]))

  m = /^([a-z]+)\.? (\d{1,2}),? (\d{4})$/i.exec(text)
  if (m && MONTHS[m[1].toLowerCase()]) return iso(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]))

  return null
}
