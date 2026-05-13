import type { ScorecardSummaryBlock } from '../types'

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

function flattenSample(rows: unknown[][], maxRows = 80, maxCols = 28): string {
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

export function parseNpatSheet(rows: unknown[][]): ScorecardSummaryBlock {
  if (rows.length === 0) return { status: 'empty_or_unclear', bullets: ['NPAT sheet is empty.'] }
  const joined = flattenSample(rows)
  const bullets: string[] = ['NPAT tab scanned.']
  const figures: { label: string; value: string }[] = []

  if (joined.includes('npat') || joined.includes('profit after tax')) {
    bullets.push('NPAT / profit-after-tax wording detected.')
  }
  if (joined.includes('ebitda') || joined.includes('net profit')) {
    bullets.push('Profit bridge wording may be present.')
  }

  const money = joined.match(/r\s?\d|\d{1,3}(?:[,\s]\d{3})+/g)
  if (money?.length) {
    figures.push({ label: 'Currency-like tokens (sample)', value: money.slice(0, 4).join(', ') })
  }

  const status = joined.includes('npat') || figures.length ? 'summary_detected' : 'partial'
  bullets.push('NPAT is typically a finance summary, not row-level staff data.')
  return { status, bullets, figures: figures.length ? figures : undefined }
}
