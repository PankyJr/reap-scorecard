/**
 * Normalizes Excel / locale-specific money strings for procurement spend import.
 */

export function unwrapCellValue(raw: unknown): unknown {
  if (raw == null || raw === '') return raw
  if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'string') {
    return raw
  }
  if (raw instanceof Date) return raw.getTime()
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const o = raw as { v?: unknown; w?: unknown }
    if (o.v != null && o.v !== '') return o.v
    if (o.w != null && String(o.w).trim() !== '') return o.w
  }
  return raw
}

/**
 * Parses a spend / money cell into a finite number, or NaN if not usable.
 * Supports ZAR-style strings, thousands separators (including spaced groupings),
 * optional negatives in parentheses.
 */
export function parseSpend(raw: unknown): number {
  const u = unwrapCellValue(raw)
  if (u == null || u === '') return NaN
  if (typeof u === 'number') return Number.isFinite(u) ? u : NaN
  if (typeof u === 'boolean') return u ? 1 : NaN

  let t = String(u)
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')

  const compactNil = t.replace(/\s/g, '').toLowerCase()
  if (
    compactNil === '' ||
    compactNil === '-' ||
    compactNil === 'n/a' ||
    compactNil === 'na' ||
    compactNil === '—' ||
    compactNil === '–'
  ) {
    return NaN
  }

  let negative = false
  const c0 = t.replace(/\s/g, '')
  if (c0.startsWith('(') && c0.endsWith(')') && c0.length > 2) {
    negative = true
    t = c0.slice(1, -1).trim()
  } else if (c0.startsWith('-')) {
    negative = true
    t = t.replace(/^\s*-\s*/, '').trim()
  }

  t = t
    .replace(/^(zar|rands?|usd)\s+/i, '')
    .replace(/^\s*R\s*/i, '')

  let prev = ''
  while (prev !== t) {
    prev = t
    t = t.replace(/(\d)\s+(?=\d)/g, '$1')
  }

  t = t.replace(/\s/g, '')

  const hasComma = t.includes(',')
  const hasDot = t.includes('.')

  if (hasComma && hasDot) {
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) {
      t = t.replace(/\./g, '').replace(',', '.')
    } else {
      t = t.replace(/,/g, '')
    }
  } else if (hasComma && !hasDot) {
    const parts = t.split(',')
    if (
      parts.length === 2 &&
      /^\d+$/.test(parts[0]) &&
      /^\d+$/.test(parts[1]) &&
      parts[1].length <= 2
    ) {
      t = `${parts[0]}.${parts[1]}`
    } else {
      t = t.replace(/,/g, '')
    }
  } else if (!hasComma && hasDot) {
    const parts = t.split('.')
    if (parts.length > 2 && parts.every((p) => /^\d+$/.test(p))) {
      t = `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`
    }
  } else {
    t = t.replace(/,/g, '')
  }

  t = t.replace(/%/g, '')
  if (t === '' || t === '-') return NaN

  const n = Number(t)
  if (!Number.isFinite(n)) return NaN
  return negative ? -n : n
}
