import type { ScorecardSummaryBlock } from '../types'

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

function flattenSample(rows: unknown[][], maxRows = 70, maxCols = 28): string {
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

export function parseManagementControlSheet(rows: unknown[][]): ScorecardSummaryBlock {
  const joined = flattenSample(rows)
  const bullets: string[] = []
  if (rows.length === 0) return { status: 'empty_or_unclear', bullets: ['Sheet is empty.'] }

  if (joined.includes('management control')) {
    bullets.push('Management Control block detected.')
  }
  if (joined.includes('board') || joined.includes('director')) {
    bullets.push('Board / director-related wording present.')
  }
  if (joined.includes('executive') || joined.includes('exco')) {
    bullets.push('Executive / Exco-related wording present.')
  }
  if (joined.includes('senior') && joined.includes('management')) {
    bullets.push('Senior management references present.')
  }
  if (bullets.length === 0) {
    bullets.push('Tab present; management-control summary not clearly labelled in scan range.')
  }
  const status = rows.length > 12 && bullets.length >= 2 ? 'summary_detected' : 'partial'
  bullets.push('Treated as summary / calculator output unless row lists are obvious.')
  return { status, bullets }
}

/** Board / Exco / Staff registers: row-level lists often present */
export function parseBoardMembersSheet(rows: unknown[][]): ScorecardSummaryBlock {
  return parseRowRegisterSheet(rows, 'Board members')
}

export function parseExecutiveCommitteeSheet(rows: unknown[][]): ScorecardSummaryBlock {
  return parseRowRegisterSheet(rows, 'Executive committee')
}

export function parseStaffListSheet(rows: unknown[][]): ScorecardSummaryBlock {
  return parseRowRegisterSheet(rows, 'Staff list')
}

function parseRowRegisterSheet(rows: unknown[][], label: string): ScorecardSummaryBlock {
  if (rows.length === 0) return { status: 'empty_or_unclear', bullets: ['Sheet is empty.'] }
  let nonEmpty = 0
  for (let r = 1; r < Math.min(rows.length, 500); r++) {
    const row = rows[r] ?? []
    if (row.some((c) => cellStr(c))) nonEmpty++
  }
  const bullets = [
    `${label} tab has about ${nonEmpty} non-empty data rows (excluding a shallow scan).`,
    nonEmpty >= 3
      ? 'Row-level register data likely present.'
      : 'Few rows — may be a placeholder or summary-only layout.',
  ]
  return {
    status: nonEmpty >= 5 ? 'row_data_detected' : nonEmpty >= 1 ? 'partial' : 'empty_or_unclear',
    bullets,
  }
}
