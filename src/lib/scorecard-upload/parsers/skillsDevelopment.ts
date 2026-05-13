import type { ScorecardSummaryBlock } from '../types'

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

function flattenSample(rows: unknown[][], maxRows = 90, maxCols = 32): string {
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

export function parseSkillsDevelopmentSheet(rows: unknown[][]): ScorecardSummaryBlock {
  return parseSkillsFamilySheet(rows, 'Skills Development')
}

/** Cat A, Interns & Learners, Cat G, Learner summary — same pillar family */
export function parseLearnerPathSheet(rows: unknown[][], label: string): ScorecardSummaryBlock {
  return parseSkillsFamilySheet(rows, label)
}

export function parseEmp201Sheet(rows: unknown[][]): ScorecardSummaryBlock {
  return parseSkillsFamilySheet(rows, '13 EMP201')
}

function parseSkillsFamilySheet(rows: unknown[][], label: string): ScorecardSummaryBlock {
  if (rows.length === 0) return { status: 'empty_or_unclear', bullets: [`${label}: sheet is empty.`] }
  const joined = flattenSample(rows)
  const bullets: string[] = [`${label} tab scanned.`]
  if (joined.includes('skills development') || joined.includes('sdl') || joined.includes('levy')) {
    bullets.push('Skills / levy wording detected.')
  }
  if (joined.includes('learner') || joined.includes('intern') || joined.includes('bursar')) {
    bullets.push('Learner / intern / bursary wording detected.')
  }
  if (joined.includes('category') && joined.includes('a')) {
    bullets.push('Category-style skills wording may be present.')
  }
  let nonEmpty = 0
  for (let r = 1; r < Math.min(rows.length, 500); r++) {
    if ((rows[r] ?? []).some((c) => cellStr(c))) nonEmpty++
  }
  const status =
    nonEmpty >= 10 ? 'row_data_detected' : joined.length > 200 ? 'summary_detected' : 'partial'
  bullets.push('Summary-only skills sheets are valid; row registers improve audit depth.')
  return { status, bullets }
}
