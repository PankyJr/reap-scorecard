import type { ScorecardSummaryBlock } from '../types'

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

function flattenSample(rows: unknown[][], maxRows = 80, maxCols = 30): string {
  const parts: string[] = []
  const limR = Math.min(rows.length, maxRows)
  for (let r = 0; r < limR; r++) {
    const row = rows[r] ?? []
    for (let c = 0; c < Math.min(row.length, maxCols); c++) {
      const t = cellStr(row[c])
      if (t) parts.push(t)
    }
  }
  return parts.join(' | ').toLowerCase()
}

export function parseEmploymentEquitySheet(rows: unknown[][]): ScorecardSummaryBlock {
  if (rows.length === 0) return { status: 'empty_or_unclear', bullets: ['Sheet is empty.'] }
  const joined = flattenSample(rows)
  const bullets: string[] = []
  if (joined.includes('employment equity') || joined.includes('ee ')) {
    bullets.push('Employment Equity headings detected.')
  }
  if (joined.includes('designation') || joined.includes('occupational')) {
    bullets.push('Designation / occupational level wording present.')
  }
  if (joined.includes('male') && joined.includes('female')) {
    bullets.push('Gender breakdown columns may be present.')
  }
  if (bullets.length === 0) bullets.push('EE-style labels not clearly matched; tab still listed.')
  let nonEmpty = 0
  for (let r = 1; r < Math.min(rows.length, 400); r++) {
    if ((rows[r] ?? []).some((c) => cellStr(c))) nonEmpty++
  }
  const status =
    nonEmpty >= 8 && bullets.length >= 2 ? 'row_data_detected' : nonEmpty >= 3 ? 'summary_detected' : 'partial'
  bullets.push('EE schedules are often summary + row tables; calculator-only is acceptable.')
  return { status, bullets }
}
