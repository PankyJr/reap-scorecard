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

export function parseEdSdSheet(rows: unknown[][]): ScorecardSummaryBlock {
  if (rows.length === 0) return { status: 'empty_or_unclear', bullets: ['ED & SD sheet is empty.'] }
  const joined = flattenSample(rows)
  const bullets: string[] = ['ED & SD tab scanned.']
  if (joined.includes('enterprise') && joined.includes('development')) {
    bullets.push('Enterprise & supplier development wording detected.')
  }
  if (joined.includes('supplier development') || joined.includes('ed ')) {
    bullets.push('Supplier development / ED-style wording present.')
  }
  if (joined.includes('sd ') || joined.includes('skills')) {
    bullets.push('Skills development cross-links may appear on this combined tab.')
  }
  const status = joined.length > 120 ? 'summary_detected' : 'partial'
  bullets.push('Summary calculator layout is expected; no failure if row lists are absent.')
  return { status, bullets }
}
