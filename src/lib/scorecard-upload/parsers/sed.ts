import type { ScorecardSummaryBlock } from '../types'

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

function flattenSample(rows: unknown[][], maxRows = 70, maxCols = 30): string {
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

export function parseSedSheet(rows: unknown[][]): ScorecardSummaryBlock {
  if (rows.length === 0) return { status: 'empty_or_unclear', bullets: ['SED sheet is empty.'] }
  const joined = flattenSample(rows)
  const bullets: string[] = ['Socio-economic development (SED) tab scanned.']
  if (joined.includes('sed') || joined.includes('socio-economic')) {
    bullets.push('SED / socio-economic wording detected.')
  }
  if (joined.includes('npat') || joined.includes('profit after tax')) {
    bullets.push('NPAT-based SED references may be present.')
  }
  const status = joined.length > 100 ? 'summary_detected' : 'partial'
  bullets.push('SED is often summary-only; that is acceptable for this import preview.')
  return { status, bullets }
}
