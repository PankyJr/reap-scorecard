import type { ScorecardSummaryBlock } from '../types'

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

function flattenSample(rows: unknown[][], maxRows = 120, maxCols = 40): string {
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

export function parseFullScorecardSummarySheet(rows: unknown[][]): ScorecardSummaryBlock {
  if (rows.length === 0) return { status: 'empty_or_unclear', bullets: ['Full Scorecard sheet is empty.'] }
  const joined = flattenSample(rows)
  const bullets: string[] = ['Full Scorecard summary tab scanned.']
  const figures: { label: string; value: string }[] = []

  if (joined.includes('total') && (joined.includes('point') || joined.includes('score'))) {
    bullets.push('Total / points-style wording detected.')
  }
  if (joined.includes('generic') || joined.includes('scorecard')) {
    bullets.push('Generic scorecard wording present.')
  }

  const scoreLike = joined.match(/\b\d{1,2}(?:\.\d+)?\s*(?:\/\s*100|%\s*points?)\b/g)
  if (scoreLike?.length) {
    figures.push({ label: 'Score-like tokens', value: scoreLike.slice(0, 5).join(', ') })
  }

  const bigNums = joined.match(/\d{2,4}(?:[,\s]\d{3})*(?:\.\d+)?/g)
  if (bigNums?.length && figures.length === 0) {
    figures.push({ label: 'Large numeric tokens (sample)', value: bigNums.slice(0, 4).join(', ') })
  }

  bullets.push('This tab is normally a calculator summary, not a row register.')
  return {
    status: 'summary_detected',
    bullets,
    figures: figures.length ? figures : undefined,
  }
}
