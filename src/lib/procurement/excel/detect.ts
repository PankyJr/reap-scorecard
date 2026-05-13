import type { ProcurementExcelMappedField } from './types'
import {
  PROCUREMENT_COLUMN_SYNONYMS,
  PROCUREMENT_HEADER_SCAN_KEYWORDS,
  PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS,
} from './constants'

export function normalizeHeaderLabel(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[%_]/g, ' ')
    .replace(/\s+/g, ' ')
}

export function normalizeSheetTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function sheetTitleMatchesHint(title: string, hint: string): boolean {
  const t = normalizeSheetTitle(title)
  const h = normalizeSheetTitle(hint)
  return t === h || t.includes(h) || h.includes(t)
}

function rowToText(row: unknown[], maxCols = 40): string {
  const parts: string[] = []
  for (let c = 0; c < Math.min(row.length, maxCols); c++) {
    const v = row[c]
    if (v == null || v === '') continue
    parts.push(normalizeHeaderLabel(v))
  }
  return parts.join(' | ')
}

export function collectKeywordHitsInSheet(rows: unknown[][], maxScanRows = 80): string[] {
  const hits = new Set<string>()
  const limit = Math.min(rows.length, maxScanRows)
  for (let r = 0; r < limit; r++) {
    const text = rowToText(rows[r] ?? [])
    if (!text) continue
    for (const kw of PROCUREMENT_HEADER_SCAN_KEYWORDS) {
      if (text.includes(kw)) hits.add(kw)
    }
  }
  return [...hits]
}

export function scoreSheetForProcurement(rows: unknown[][]): number {
  const hits = collectKeywordHitsInSheet(rows)
  let score = hits.length
  const joined = rows
    .slice(0, 60)
    .map((row) => rowToText(row))
    .join('\n')
  if (joined.includes('supplier') && joined.includes('spend')) score += 3
  if (joined.includes('vendor') && (joined.includes('amount') || joined.includes('spend')))
    score += 2
  if (joined.includes('invoice') && joined.includes('value')) score += 2
  return score
}

/** Lower index = higher priority when choosing among sheets that all have supplier headers. */
export function supplierSheetNamePriority(sheetTitle: string): number {
  for (let i = 0; i < PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS.length; i++) {
    if (sheetTitleMatchesHint(sheetTitle, PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS[i])) {
      return i
    }
  }
  return PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS.length
}

/**
 * Pick the best sheet for supplier import: must have a header row that maps both
 * supplier name and spend. Among those, prefer known supplier-register tab names,
 * then higher keyword/heuristic score.
 */
export function pickBestSupplierSheet(
  sheetNames: string[],
  getRows: (name: string) => unknown[][],
): string | null {
  const withHeader = sheetNames.filter(
    (n) => findLikelyHeaderRowIndex(getRows(n)) != null,
  )
  if (withHeader.length === 0) return null

  withHeader.sort((a, b) => {
    const pa = supplierSheetNamePriority(a)
    const pb = supplierSheetNamePriority(b)
    if (pa !== pb) return pa - pb
    return scoreSheetForProcurement(getRows(b)) - scoreSheetForProcurement(getRows(a))
  })
  return withHeader[0]
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function headerMatchesSynonym(headerNorm: string, synonym: string): boolean {
  const s = normalizeHeaderLabel(synonym)
  if (headerNorm === s) return true

  const sHasSpace = s.includes(' ')
  if (!sHasSpace && s.length <= 4) {
    const re = new RegExp(`\\b${escapeRegExp(s)}\\b`, 'i')
    return re.test(headerNorm)
  }

  if (headerNorm.includes(s)) return true
  if (headerNorm.length >= 3 && s.includes(headerNorm)) {
    // Avoid mapping a lone "DESIGNATED" column to multi-word synonyms such as
    // "black designated group" (substring match only).
    if (headerNorm === 'designated' && s !== 'designated') return false
    return true
  }
  const hTokens = headerNorm.split(' ').filter(Boolean)
  const sTokens = s.split(' ').filter(Boolean)
  if (sTokens.length >= 2 && sTokens.every((t) => headerNorm.includes(t))) return true
  if (hTokens.length >= 2 && hTokens.every((t) => s.includes(t))) return true
  return false
}

/** Never auto-map these as the spend amount column (manual override still allowed in UI). */
export function isExcludedAutoSpendHeader(raw: string): boolean {
  const t = raw.trim().toLowerCase()
  if (/%\s*of\s*spend/i.test(t)) return true
  if (/\bof\s*spend\b/.test(t) && /%/.test(raw)) return true
  if (/\bshare\s*of\s*spend/i.test(t)) return true
  if (/\bpercent\b/.test(t) && /\bspend\b/.test(t)) return true
  return false
}

type HeaderEntry = { raw: string; norm: string }

function headerEntries(headers: string[], usedColumns: Set<string>): HeaderEntry[] {
  return headers
    .map((raw) => raw.trim())
    .filter((raw) => raw && !usedColumns.has(raw))
    .map((raw) => ({ raw, norm: normalizeHeaderLabel(raw) }))
}

/**
 * Spend column priority for generic B-BBEE / procurement registers.
 * Does not return "% of Spend" or other share-of-spend columns — those must be chosen manually.
 */
export function pickSpendColumn(
  headers: string[],
  usedColumns?: Set<string>,
): string | null {
  const used = usedColumns ?? new Set<string>()
  const list = headerEntries(headers, used).filter((e) => !isExcludedAutoSpendHeader(e.raw))

  const hasZarOrRand = list.some(
    (e) =>
      e.norm === 'zar' ||
      e.norm === 'rand' ||
      e.norm === 'rands' ||
      e.norm.includes('zar'),
  )

  const pick = (predicate: (e: HeaderEntry) => boolean): string | null => {
    const hit = list.find(predicate)
    return hit?.raw ?? null
  }

  return (
    pick((e) => e.norm === 'zar') ||
    pick((e) => e.norm === 'rand' || e.norm === 'rands') ||
    pick((e) => e.norm.includes('zar')) ||
    pick((e) => e.norm === 'amount') ||
    pick((e) => e.norm === 'spend') ||
    pick(
      (e) =>
        e.norm.includes('procurement spend') ||
        e.norm.includes('procurement value') ||
        e.norm.includes('bee spend') ||
        e.norm.includes('bbbee spend'),
    ) ||
    pick((e) => e.norm.includes('total spend')) ||
    pick((e) => e.norm.includes('invoice value') || e.norm.includes('invoice total')) ||
    pick(
      (e) =>
        e.norm.includes('value ex vat') ||
        e.norm.includes('value excluding vat') ||
        e.norm.includes('rand value'),
    ) ||
    (!hasZarOrRand &&
      pick(
        (e) =>
          e.norm === 'usd' ||
          e.norm === 'dollar' ||
          e.norm === 'dollars' ||
          e.norm.includes('usd'),
      )) ||
    null
  )
}

/**
 * Full column auto-map: synonym fields first, then dedicated {@link pickSpendColumn}.
 */
export function buildProcurementColumnAutoMap(
  headers: string[],
): Map<ProcurementExcelMappedField, string> {
  const usedColumns = new Set<string>()
  const out = new Map<ProcurementExcelMappedField, string>()
  const normalized = headers.map((h) => normalizeHeaderLabel(h))

  for (const { field, synonyms } of PROCUREMENT_COLUMN_SYNONYMS) {
    for (let i = 0; i < headers.length; i++) {
      const raw = headers[i] ?? ''
      const hn = normalized[i] ?? ''
      if (!raw.trim()) continue
      if (usedColumns.has(raw)) continue
      const match = synonyms.some((syn) => headerMatchesSynonym(hn, syn))
      if (match) {
        out.set(field, raw)
        usedColumns.add(raw)
        break
      }
    }
  }

  const spendCol = pickSpendColumn(headers, usedColumns)
  if (spendCol) {
    out.set('spend_amount', spendCol)
    usedColumns.add(spendCol)
  }

  return out
}

/** Backwards-compatible name — prefer {@link buildProcurementColumnAutoMap}. */
export function autoMapHeaders(headers: string[]): Map<ProcurementExcelMappedField, string> {
  return buildProcurementColumnAutoMap(headers)
}

/**
 * Heuristic: scorecard-style procurement tabs that mix vendor lines with B-BBEE category
 * allocation columns (QSE/EME splits, 51% BDGS, etc.).
 */
export function procurementCategoryAllocationLikely(headers: string[]): boolean {
  const rawJoined = headers.join(' ').toLowerCase()
  const norms = headers.map((h) => normalizeHeaderLabel(h))
  const normJoined = norms.join(' | ')
  let hits = 0
  if (/b[-\s]?bbee\s+suppliers|bbbee\s+suppliers/i.test(rawJoined)) hits++
  if (/\b51\s*%?\s*bdgs\b/i.test(rawJoined) || normJoined.includes('bdgs')) hits++
  if (/\b51\s*%?\s*bo\b/i.test(rawJoined)) hits++
  if (/\b30\s*%?\s*bwo\b/i.test(rawJoined)) hits++
  if (norms.includes('designated')) hits++
  if (norms.includes('local')) hits++
  if (norms.includes('qse') && norms.includes('eme')) hits++
  return hits >= 2
}

const PROCUREMENT_TMPS_CONTEXT_ROW_PHRASES: string[] = [
  'tmps',
  'total measured procurement',
  'measured procurement',
  'preferential procurement',
  'b-bbee procurement',
  'bbbee procurement',
]

/**
 * Whether the workbook plausibly relates to procurement/TMPS (for blocked-import copy only).
 * Avoids generic tokens such as “amount” or “spend” on their own so unrelated schedules
 * (for example training rosters) stay in the generic message path.
 */
export function workbookHasProcurementOrTmpsContext(
  sheetNames: string[],
  getRows: (name: string) => unknown[][],
): boolean {
  for (const name of sheetNames) {
    const nt = normalizeSheetTitle(name)
    if (nt.includes('tmps')) return true
    if (nt.includes('procurement')) return true
    if (nt.includes('preferential')) return true
    if (supplierSheetNamePriority(name) < PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS.length) {
      return true
    }
  }

  for (const name of sheetNames) {
    const rows = getRows(name)
    const limit = Math.min(rows.length, 80)
    for (let r = 0; r < limit; r++) {
      const line = rowToText(rows[r] ?? []).toLowerCase()
      if (!line) continue
      if (PROCUREMENT_TMPS_CONTEXT_ROW_PHRASES.some((p) => line.includes(p))) return true
    }
  }

  return false
}

export function findLikelyHeaderRowIndex(
  rows: unknown[][],
  maxSearch = 120,
): { index: number; headers: string[]; score: number } | null {
  let best: { index: number; headers: string[]; score: number } | null = null

  const limit = Math.min(rows.length, maxSearch)
  for (let r = 0; r < limit; r++) {
    const rawRow = rows[r] ?? []
    const headers = rawRow.map((c) => String(c ?? '').trim())
    const nonEmpty = headers.filter((h) => h.length > 0)
    if (nonEmpty.length < 2) continue

    const map = buildProcurementColumnAutoMap(headers)
    const hasSupplier = map.has('supplier_name')
    const hasSpend = map.has('spend_amount')
    let score = map.size
    if (hasSupplier) score += 5
    if (hasSpend) score += 5

    const nz = headers.map((h) => normalizeHeaderLabel(h))
    if (nz.some((h) => h === 'vendor' || h === 'supplier name' || h.includes('supplier'))) {
      score += 6
    }
    if (nz.includes('zar') || nz.includes('rand') || nz.includes('rands')) score += 14
    if (nz.some((h) => h.includes('b-bbee level') || h.includes('bee level'))) score += 3
    if (nz.some((h) => h.includes('b-bbee recognition') || h.includes('recognition'))) score += 2

    if (!hasSupplier || !hasSpend) continue

    if (
      !best ||
      score > best.score ||
      (score === best.score && r < best.index)
    ) {
      best = { index: r, headers, score }
    }
  }

  return best
}
