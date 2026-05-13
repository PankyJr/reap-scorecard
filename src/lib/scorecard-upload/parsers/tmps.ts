import { tryDetectTmpsTotalFromRows } from '../../procurement/excel/tmpsDetection'
import type { ScorecardTmpsPreview } from '../types'

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

export function parseTmpsSheet(rows: unknown[][], sheetName: string | null): ScorecardTmpsPreview {
  const bullets: string[] = []
  if (rows.length === 0) {
    return {
      sheetName,
      suggestedTotal: null,
      suggestedTotalDisplay: null,
      bullets: ['TMPS sheet appears empty.'],
    }
  }

  const suggested = tryDetectTmpsTotalFromRows(rows)
  if (suggested != null) {
    return {
      sheetName,
      suggestedTotal: suggested,
      suggestedTotalDisplay: suggested.toLocaleString('en-ZA', {
        maximumFractionDigits: 2,
      }),
      bullets: [
        'A TMPS-style total cell was detected (conservative label match).',
        'Confirm against your finance workbook before using this figure in assessments.',
      ],
    }
  }

  const joined = rows
    .slice(0, 40)
    .map((row) => (row ?? []).map(cellStr).filter(Boolean).join(' '))
    .join(' | ')
    .toLowerCase()
  if (joined.includes('tmps') || joined.includes('measured procurement')) {
    bullets.push('TMPS / measured procurement wording found, but no confident total cell.')
  } else {
    bullets.push('No TMPS total heuristic match in the scanned rows.')
  }

  return {
    sheetName,
    suggestedTotal: null,
    suggestedTotalDisplay: null,
    bullets,
  }
}
