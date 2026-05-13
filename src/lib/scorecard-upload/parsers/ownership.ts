import type { ScorecardSummaryBlock } from '../types'

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

function flattenSample(rows: unknown[][], maxRows = 60, maxCols = 24): string {
  const parts: string[] = []
  const limR = Math.min(rows.length, maxRows)
  for (let r = 0; r < limR; r++) {
    const row = rows[r] ?? []
    const limC = Math.min(row.length, maxCols)
    for (let c = 0; c < limC; c++) {
      const t = cellStr(row[c])
      if (t) parts.push(t)
    }
  }
  return parts.join(' | ').toLowerCase()
}

export function parseOwnershipSheet(rows: unknown[][]): ScorecardSummaryBlock {
  if (rows.length === 0) {
    return { status: 'empty_or_unclear', bullets: ['Sheet is empty.'] }
  }

  const joined = flattenSample(rows)
  const bullets: string[] = []
  const figures: { label: string; value: string }[] = []

  const hasOwnership =
    joined.includes('ownership') ||
    joined.includes('shareholding') ||
    joined.includes('black ownership')
  const hasVoting = joined.includes('voting') || joined.includes('economic interest')

  if (joined.includes('b-bbee') || joined.includes('bbbee')) {
    bullets.push('B-BBEE ownership-related labels detected.')
  }
  if (hasOwnership) bullets.push('Ownership / equity-style headings detected.')
  if (hasVoting) bullets.push('Voting rights or economic-interest style wording detected.')

  const nums = joined.match(/\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?%?/g)
  if (nums?.length) {
    figures.push({ label: 'Numeric tokens (sample)', value: nums.slice(0, 4).join(', ') })
  }

  if (bullets.length === 0) {
    bullets.push('Tab present; no clear ownership summary labels in the scanned band.')
  }

  const status =
    rows.length > 15 && (hasOwnership || figures.length)
      ? 'summary_detected'
      : rows.length > 5
        ? 'partial'
        : 'empty_or_unclear'

  bullets.push(
    status === 'summary_detected'
      ? 'Treated as calculator / summary sheet (row-level verification not required).'
      : 'Review this tab in Excel if ownership figures look wrong.',
  )

  return { status, bullets, figures: figures.length ? figures : undefined }
}
