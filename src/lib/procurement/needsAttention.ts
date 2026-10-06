import { RECOGNITION_BY_LEVEL } from './config'
import { resolveEffectiveLevel } from './simulator/resolveEffectiveLevel'

/**
 * The "Needs attention" list for a supplier list, and its one-click fixes.
 *
 * Nothing here scores anything or changes a supplier silently. Each check
 * names the suppliers it found; each fix is a pure function the person
 * presses a button for, and the result is visible in the supplier list.
 *
 * Order shown to people: expired certificates first, then missing levels,
 * duplicates and odd amounts.
 */

export const NON_COMPLIANT_LEVEL = 'Non-Compliant'

/** A supplier row as the checks need it. */
export type AttentionRow = {
  id: string
  supplier_name: string
  value_ex_vat: number
  level: string
  expiry?: string | null
  vat_number?: string | null
  company_registration?: string | null
  supplier_code?: string | null
}

export type ExpiredCertificateItem = { rowId: string; name: string; expiry: string; level: string; spend: number }
export type MissingLevelItem = { rowId: string; name: string; spend: number }
export type DuplicateReason = 'name' | 'vat' | 'registration'
export type DuplicateGroup = {
  /** Stable across saves: the matching value, e.g. "vat:4123456789". */
  key: string
  reasons: DuplicateReason[]
  rowIds: string[]
  names: string[]
  totalSpend: number
  /** True when the rows disagree on level; merging keeps the first row's details. */
  levelsDiffer: boolean
}
export type OddAmountReason = 'zero' | 'negative' | 'above_total'
export type OddAmountItem = { rowId: string; name: string; value: number; reason: OddAmountReason }

export type NeedsAttention = {
  expired: ExpiredCertificateItem[]
  missingLevel: MissingLevelItem[]
  duplicates: DuplicateGroup[]
  oddAmounts: OddAmountItem[]
  /** Open problems in total. While this is above zero the score is incomplete. */
  count: number
  /** Zero or negative amounts: these must be fixed before the list can be saved. */
  blockingCount: number
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function isIsoDate(value: string | null | undefined): value is string {
  if (!value) return false
  const m = ISO_DATE.exec(value)
  if (!m) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/**
 * The date a certificate must still be valid on: the end of the measurement
 * year (31 December), or today if that date has not come yet.
 */
export function certificateReferenceDate(assessmentYear: number | null | undefined, now: Date = new Date()): string {
  const today = todayIso(now)
  if (assessmentYear == null || !Number.isFinite(assessmentYear)) return today
  const yearEnd = `${Math.trunc(assessmentYear)}-12-31`
  return yearEnd < today ? yearEnd : today
}

export function isCertificateExpired(expiry: string | null | undefined, referenceDate: string): boolean {
  return isIsoDate(expiry) && expiry < referenceDate
}

/** A level the engine knows (1 to 8, or Non-compliant). Anything else is missing. */
export function hasKnownLevel(level: string | null | undefined): boolean {
  return typeof level === 'string' && level in RECOGNITION_BY_LEVEL
}

const LEGAL_FORM_SUFFIX = /(\s+(pty|proprietary|ltd|limited|cc|inc|incorporated|co|soc|npc|rf))+$/

/** Lower case, no punctuation, "&" read as "and", legal form (Pty Ltd, CC…) dropped. */
export function normaliseSupplierName(name: string | null | undefined): string {
  const base = String(name ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return base.replace(LEGAL_FORM_SUFFIX, '').trim()
}

/** VAT numbers compare on digits only; fewer than 6 digits is not a usable number. */
export function normaliseVatNumber(vat: string | null | undefined): string {
  const digits = String(vat ?? '').replace(/\D+/g, '')
  return digits.length >= 6 ? digits : ''
}

/** Registration numbers compare on letters and digits only (2001/123456/07 = 200112345607). */
export function normaliseRegistration(reg: string | null | undefined): string {
  const compact = String(reg ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
  return compact.length >= 6 ? compact : ''
}

/** Rows that look like the same supplier: same name, same VAT number or same registration. */
export function findDuplicateGroups(rows: AttentionRow[], keptKeys: ReadonlySet<string> = new Set()): DuplicateGroup[] {
  const parent = rows.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb)
  }

  const firstByKey = new Map<string, number>()
  const keysByRow: string[][] = rows.map(() => [])
  rows.forEach((row, index) => {
    const keys: string[] = []
    const name = normaliseSupplierName(row.supplier_name)
    if (name) keys.push(`name:${name}`)
    const vat = normaliseVatNumber(row.vat_number)
    if (vat) keys.push(`vat:${vat}`)
    const reg = normaliseRegistration(row.company_registration)
    if (reg) keys.push(`registration:${reg}`)
    keysByRow[index] = keys
    for (const key of keys) {
      const first = firstByKey.get(key)
      if (first === undefined) firstByKey.set(key, index)
      else union(first, index)
    }
  })

  // Keys shared by at least two rows are the ones that caused a match.
  const keyCounts = new Map<string, number>()
  for (const keys of keysByRow) for (const key of keys) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1)

  const groups = new Map<number, number[]>()
  rows.forEach((_, index) => {
    const root = find(index)
    const list = groups.get(root)
    if (list) list.push(index)
    else groups.set(root, [index])
  })

  const out: DuplicateGroup[] = []
  for (const members of groups.values()) {
    if (members.length < 2) continue
    const matching = new Set<string>()
    for (const index of members) for (const key of keysByRow[index]) if ((keyCounts.get(key) ?? 0) > 1) matching.add(key)
    const sortedKeys = [...matching].sort()
    const key = sortedKeys[0] ?? `rows:${members.map((i) => rows[i].id).join(',')}`
    if (sortedKeys.some((k) => keptKeys.has(k))) continue
    const reasons = new Set<DuplicateReason>()
    for (const k of sortedKeys) reasons.add(k.slice(0, k.indexOf(':')) as DuplicateReason)
    const levels = new Set(members.map((i) => rows[i].level))
    out.push({
      key,
      reasons: (['name', 'vat', 'registration'] as DuplicateReason[]).filter((r) => reasons.has(r)),
      rowIds: members.map((i) => rows[i].id),
      names: members.map((i) => rows[i].supplier_name),
      totalSpend: members.reduce((sum, i) => sum + (Number(rows[i].value_ex_vat) || 0), 0),
      levelsDiffer: levels.size > 1,
    })
  }
  return out
}

export function analyseNeedsAttention(
  rows: AttentionRow[],
  options: {
    referenceDate: string
    /** Total measured procurement spend, when it is known. */
    totalMeasuredSpend?: number | null
    /** Duplicate groups the person chose to keep as separate suppliers. */
    keptDuplicateKeys?: ReadonlySet<string>
  },
): NeedsAttention {
  const expired: ExpiredCertificateItem[] = []
  const missingLevel: MissingLevelItem[] = []
  const oddAmounts: OddAmountItem[] = []
  const tmps = options.totalMeasuredSpend != null && options.totalMeasuredSpend > 0 ? options.totalMeasuredSpend : null

  for (const row of rows) {
    const value = Number(row.value_ex_vat)
    const spend = Number.isFinite(value) ? value : 0
    const known = hasKnownLevel(row.level)
    if (!known) {
      missingLevel.push({ rowId: row.id, name: row.supplier_name, spend })
    } else if (row.level !== NON_COMPLIANT_LEVEL && isCertificateExpired(row.expiry, options.referenceDate)) {
      expired.push({ rowId: row.id, name: row.supplier_name, expiry: row.expiry as string, level: row.level, spend })
    }
    if (!Number.isFinite(value) || value === 0) {
      oddAmounts.push({ rowId: row.id, name: row.supplier_name, value: spend, reason: 'zero' })
    } else if (value < 0) {
      oddAmounts.push({ rowId: row.id, name: row.supplier_name, value, reason: 'negative' })
    } else if (tmps != null && value > tmps) {
      oddAmounts.push({ rowId: row.id, name: row.supplier_name, value, reason: 'above_total' })
    }
  }

  const duplicates = findDuplicateGroups(rows, options.keptDuplicateKeys)
  const blockingCount = oddAmounts.filter((item) => item.reason !== 'above_total').length
  return {
    expired,
    missingLevel,
    duplicates,
    oddAmounts,
    count: expired.length + missingLevel.length + duplicates.length + oddAmounts.length,
    blockingCount,
  }
}

/**
 * Suppliers that score nothing because their certificate expired and they are
 * marked Non-compliant (the fix for an expired certificate).
 */
export function expiredAndNotCounting(rows: AttentionRow[], referenceDate: string): { count: number; spend: number } {
  let count = 0
  let spend = 0
  for (const row of rows) {
    if (row.level === NON_COMPLIANT_LEVEL && isCertificateExpired(row.expiry, referenceDate)) {
      count++
      spend += Number(row.value_ex_vat) || 0
    }
  }
  return { count, spend }
}

// ---------------------------------------------------------------------------
// One-click fixes. Each returns a new array; rows not named are unchanged.
// ---------------------------------------------------------------------------

/** Expired certificate or missing level: the supplier is Non-compliant (counts nothing). */
export function markNonCompliant<T extends AttentionRow>(rows: T[], rowIds: readonly string[]): T[] {
  const ids = new Set(rowIds)
  return rows.map((row) =>
    ids.has(row.id)
      ? { ...row, level: resolveEffectiveLevel(row.level, hasKnownLevel(row.level) ? 'expired' : 'unknown') }
      : row,
  )
}

export function removeRows<T extends AttentionRow>(rows: T[], rowIds: readonly string[]): T[] {
  const ids = new Set(rowIds)
  return rows.filter((row) => !ids.has(row.id))
}

/**
 * Merge a duplicate group into its first row: the spend is added together; the
 * first row's level and ownership are kept, and blank identifiers are filled
 * from the other rows.
 */
export function mergeDuplicateRows<T extends AttentionRow>(rows: T[], rowIds: readonly string[]): T[] {
  const ids = new Set(rowIds)
  const members = rows.filter((row) => ids.has(row.id))
  if (members.length < 2) return rows
  const [first, ...rest] = members
  const merged: T = { ...first, value_ex_vat: members.reduce((sum, row) => sum + (Number(row.value_ex_vat) || 0), 0) }
  for (const field of ['vat_number', 'company_registration', 'supplier_code', 'expiry'] as const) {
    if (!merged[field]) {
      const donor = rest.find((row) => row[field])
      if (donor) (merged as AttentionRow)[field] = donor[field]
    }
  }
  const out: T[] = []
  for (const row of rows) {
    if (row.id === first.id) out.push(merged)
    else if (!ids.has(row.id)) out.push(row)
  }
  return out
}
