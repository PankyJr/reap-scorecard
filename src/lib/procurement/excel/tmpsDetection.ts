import { normalizeHeaderLabel } from './detect'

/** Join normalized cell text for quick row-level heuristics. */
export function procurementRowNormalizedText(row: unknown[], maxCols = 24): string {
  const parts: string[] = []
  const limit = Math.min(row.length, maxCols)
  for (let c = 0; c < limit; c++) {
    const t = normalizeHeaderLabel(row[c])
    if (t) parts.push(t)
  }
  return parts.join(' ')
}

/**
 * Rows that look like scorecard measurement / points lines should not contribute TMPS hints
 * (avoids picking up 23 / 29 “points” style values).
 */
export function rowLooksLikeScorePointsContext(row: unknown[]): boolean {
  const t = procurementRowNormalizedText(row).toLowerCase()
  if (!t) return false
  if (/\bavailable\s+points?\b/.test(t)) return true
  if (/\bpoints?\s+achieved\b/.test(t)) return true
  if (/\bachieved\s*%/.test(t) && /\btarget\b/.test(t)) return true
  if (/\bmeasurement\s+category\b/.test(t) && /\bcriteria\b/.test(t)) return true
  if (/\bprocurement\s+score\b/.test(t)) return true
  if (/\bscorecard\b/.test(t) && /\bpoints?\b/.test(t)) return true
  return false
}

/**
 * True when this cell’s normalized text is a trustworthy TMPS / measured-spend label
 * (not generic “procurement” alone, not points/score lines).
 */
export function isTrustedTmpsSpendLabel(labelNorm: string): boolean {
  const t = labelNorm.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!t) return false

  if (/\bpoint(s)?\b/.test(t) && !/\bspend\b/.test(t) && !/\bmeasured\b/.test(t)) return false
  if (/\bscore\b/.test(t)) return false
  if (/\bachieved\b/.test(t) && /%/.test(t)) return false

  if (t.includes('total measured procurement')) return true
  if (t.includes('measured procurement spend')) return true
  if (t.includes('total measured') && t.includes('spend')) return true
  if (t.includes('tmps') && t.includes('total')) return true
  if (t.includes('total tmps')) return true
  if (t === 'tmps total' || t === 'total tmps') return true

  if (
    t.includes('total') &&
    t.includes('procurement') &&
    t.includes('spend') &&
    (t.includes('measured') || t.includes('tmps'))
  ) {
    return true
  }

  if (
    t.includes('total') &&
    t.includes('procurement') &&
    t.includes('spend') &&
    !t.includes('point') &&
    !/\bachieved\b/.test(t)
  ) {
    return true
  }

  return false
}

export function isTmpsNumericFalsePositive(n: number, row: unknown[]): boolean {
  if (!Number.isFinite(n) || n <= 0) return true
  if (n === 23 || n === 29) return true
  const t = procurementRowNormalizedText(row).toLowerCase()
  if (Number.isInteger(n) && n > 0 && n <= 40 && /\bpoints?\b/.test(t)) return true
  if (Number.isInteger(n) && n > 0 && n <= 40 && rowLooksLikeScorePointsContext(row)) return true
  return false
}

/**
 * Scan rows for a monetary TMPS / measured procurement total adjacent to a trusted label.
 * Conservative: skips score/points rows and common false-positive integers.
 */
export function tryDetectTmpsTotalFromRows(rows: unknown[][]): number | null {
  for (let r = 0; r < Math.min(rows.length, 200); r++) {
    const row = rows[r] ?? []
    if (rowLooksLikeScorePointsContext(row)) continue

    for (let c = 0; c < Math.min(row.length, 16); c++) {
      const label = normalizeHeaderLabel(row[c])
      if (!isTrustedTmpsSpendLabel(label)) continue

      for (let k = c + 1; k < Math.min(c + 8, row.length); k++) {
        const raw = row[k]
        if (raw == null || raw === '') continue
        const n =
          typeof raw === 'number' ? raw : Number(String(raw).replace(/[,\s]/g, ''))
        if (isTmpsNumericFalsePositive(n, row)) continue
        if (Number.isFinite(n) && n > 0) return n
      }
    }
  }
  return null
}
