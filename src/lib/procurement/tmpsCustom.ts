export type ProcurementTmpsCustomLine = {
  id: string
  label: string
  amount: number
}

export const TMPS_CUSTOM_LINES_MAX = 40

function nonNegativeAmount(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v) || v < 0) return 0
  return v
}

/** Normalise jsonb / API values into custom lines (caps count, drops invalid entries). */
export function parseTmpsCustomLinesFromUnknown(
  value: unknown,
): ProcurementTmpsCustomLine[] {
  if (value == null) return []
  if (!Array.isArray(value)) return []
  const out: ProcurementTmpsCustomLine[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const id =
      typeof rec.id === 'string' && rec.id.trim()
        ? rec.id.trim().slice(0, 80)
        : `line-${out.length}`
    const label =
      typeof rec.label === 'string' ? rec.label.trim().slice(0, 500) : ''
    const amount = nonNegativeAmount(rec.amount)
    if (!label && amount === 0) continue
    out.push({
      id,
      label: label || 'Custom line',
      amount,
    })
    if (out.length >= TMPS_CUSTOM_LINES_MAX) break
  }
  return out
}

export type TmpsCustomLineFormRow = {
  id: string
  label: string
  amount: string
}

export function newTmpsCustomLineFormRow(): TmpsCustomLineFormRow {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tmps-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return { id, label: '', amount: '' }
}

export function normalizeStoredCustomLinesToFormRows(
  lines: ProcurementTmpsCustomLine[] | null | undefined,
): TmpsCustomLineFormRow[] {
  if (!lines?.length) return []
  return lines.map((l) => ({
    id: l.id,
    label: l.label,
    amount: l.amount === 0 ? '' : String(l.amount),
  }))
}

/** Values posted with the form (non-empty or amount > 0). */
export function serializeTmpsCustomFormRows(
  rows: ReadonlyArray<TmpsCustomLineFormRow>,
): ProcurementTmpsCustomLine[] {
  const out: ProcurementTmpsCustomLine[] = []
  for (const r of rows) {
    const label = r.label.trim().slice(0, 500)
    const amount = Math.max(0, Number(r.amount) || 0)
    if (!label && amount === 0) continue
    out.push({
      id: r.id.slice(0, 80),
      label: label || 'Custom line',
      amount,
    })
    if (out.length >= TMPS_CUSTOM_LINES_MAX) break
  }
  return out
}
