import * as XLSX from 'xlsx'

/**
 * Some workbooks ship with a `!ref` that does not cover all stored cell addresses
 * (template saves, partial exports). `decode_range(!ref)` would then omit supplier
 * rows entirely. Union `!ref` with the bounding box of every cell key and merges.
 */
export function expandWorksheetRefToUsedBounds(worksheet: XLSX.WorkSheet): void {
  let minR = Infinity
  let minC = Infinity
  let maxR = 0
  let maxC = 0

  const bump = (r: number, c: number) => {
    if (r < minR) minR = r
    if (c < minC) minC = c
    if (r > maxR) maxR = r
    if (c > maxC) maxC = c
  }

  for (const key of Object.keys(worksheet)) {
    if (key[0] === '!') continue
    try {
      const { r, c } = XLSX.utils.decode_cell(key)
      bump(r, c)
    } catch {
      continue
    }
  }

  for (const m of worksheet['!merges'] ?? []) {
    bump(m.s.r, m.s.c)
    bump(m.e.r, m.e.c)
  }

  if (minR === Infinity) return

  if (worksheet['!ref']) {
    try {
      const d = XLSX.utils.decode_range(worksheet['!ref'])
      minR = Math.min(minR, d.s.r)
      minC = Math.min(minC, d.s.c)
      maxR = Math.max(maxR, d.e.r)
      maxC = Math.max(maxC, d.e.c)
    } catch {
      // replace with cell-derived bounds below
    }
  }

  worksheet['!ref'] = XLSX.utils.encode_range({
    s: { r: minR, c: minC },
    e: { r: maxR, c: maxC },
  })
}

/** Prefer cached value, then formatted text (currency / strings). */
function cellToValue(cell: XLSX.CellObject | undefined): unknown {
  if (!cell) return null
  const v = cell.v
  if (v != null && v !== '') return v
  const w = cell.w
  if (w != null && String(w).trim() !== '') return String(w).trim()
  return null
}

/**
 * Reads the sheet as a **dense** rectangular AoA using `!ref`, so column indexes
 * line up with Excel columns even when `sheet_to_json` would return ragged rows.
 * Then applies `!merges` so merged cells (common on scorecard templates) inherit
 * the top-left value into every covered cell.
 */
export function readSheetDenseAoAWithMerges(worksheet: XLSX.WorkSheet): unknown[][] {
  expandWorksheetRefToUsedBounds(worksheet)

  if (!worksheet['!ref']) {
    return XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    }) as unknown[][]
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'])
  const grid: unknown[][] = []

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: unknown[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      row.push(cellToValue(worksheet[addr] as XLSX.CellObject | undefined))
    }
    grid.push(row)
  }

  const merges = worksheet['!merges']
  if (merges?.length) {
    for (const m of merges) {
      const { s, e } = m
      const base = grid[s.r]?.[s.c]
      if (base == null || base === '') continue
      for (let r = s.r; r <= e.r; r++) {
        const rowG = grid[r]
        if (!rowG) continue
        for (let c = s.c; c <= e.c; c++) {
          const cur = rowG[c]
          if (cur == null || cur === '') rowG[c] = base
        }
      }
    }
  }

  return grid
}
