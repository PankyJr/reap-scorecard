import * as XLSX from 'xlsx'

/**
 * When `sheet_to_json` returns a **shorter** row than the header row (common with
 * merged cells / sparse layouts), left-to-right non-empty values often align to
 * left-to-right non-empty **headers** in order. Re-expand into `headers.length`
 * slots so mapped column indexes (Vendor, ZAR, …) read the correct cells.
 *
 * If counts do not match or the row is already wide enough, returns `rawRow` unchanged.
 */
export function packSparseDataRowToHeaderColumns(
  rawRow: unknown[],
  headers: string[],
): unknown[] {
  if (rawRow.length >= headers.length) return rawRow

  const nonemptyHeaderIdx: number[] = []
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i] ?? '').trim() !== '') nonemptyHeaderIdx.push(i)
  }

  const vals: unknown[] = []
  for (let c = 0; c < rawRow.length; c++) {
    const v = rawRow[c]
    if (v != null && String(v).trim() !== '') vals.push(v)
  }

  if (vals.length !== nonemptyHeaderIdx.length) return rawRow

  const out: unknown[] = new Array(headers.length).fill(null)
  for (let k = 0; k < nonemptyHeaderIdx.length; k++) {
    out[nonemptyHeaderIdx[k]] = vals[k]
  }
  return out
}

/** Right-most 1-based column count from `!ref`, or `fallback`. */
export function usedRangeColumnCount(
  worksheet: XLSX.WorkSheet | undefined,
  fallback: number,
): number {
  if (!worksheet) return fallback
  const ref = worksheet['!ref']
  if (!ref) return fallback
  try {
    const d = XLSX.utils.decode_range(ref)
    return Math.max(fallback, d.e.c + 1)
  } catch {
    return fallback
  }
}
