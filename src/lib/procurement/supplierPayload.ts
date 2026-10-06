import type { ProcurementSupplierInput, SupplierType } from './rows'

/**
 * The supplier list as sent from the browser to the save action.
 *
 * Each supplier is a short array instead of an object with 17 named keys, and
 * empty trailing fields are dropped. 8,000 suppliers encode to about 1 MB
 * instead of about 3 MB, comfortably inside the request limit
 * (see uploadLimits.ts). Nothing is lost: decoding gives back exactly the
 * fields the save uses.
 */

export const SUPPLIER_PAYLOAD_FORMAT = 'suppliers-v2'

type CompactRow = [
  name: string,
  value: number,
  type: 'E' | 'Q' | 'G',
  level: string,
  flags: number,
  expiry?: string,
  vat?: string,
  registration?: string,
  code?: string,
  boEtc?: string,
  fts?: string,
  des?: string,
  prop?: string,
  empower?: string,
]

const FLAG_BLACK_OWNED = 1
const FLAG_BLACK_WOMEN = 2
const FLAG_DESIGNATED = 4
const FLAG_FLOW_THROUGH = 8

const TYPE_CODE: Record<SupplierType, 'E' | 'Q' | 'G'> = { EME: 'E', QSE: 'Q', Generic: 'G' }
const TYPE_FROM_CODE: Record<string, SupplierType> = { E: 'EME', Q: 'QSE', G: 'Generic' }

function text(value: string | undefined | null): string {
  return value == null ? '' : String(value)
}

export function encodeSupplierPayload(rows: readonly ProcurementSupplierInput[]): string {
  const compact = rows.map((row) => {
    const flags =
      (row.is_51_black_owned ? FLAG_BLACK_OWNED : 0) |
      (row.is_30_black_women_owned ? FLAG_BLACK_WOMEN : 0) |
      (row.is_51_bdgs ? FLAG_DESIGNATED : 0) |
      (row.is_51_percent_flow_through ? FLAG_FLOW_THROUGH : 0)
    const value = Number(row.value_ex_vat)
    const out: (string | number)[] = [
      text(row.supplier_name),
      Number.isFinite(value) ? value : 0,
      TYPE_CODE[row.supplier_type] ?? 'G',
      text(row.level),
      flags,
      text(row.expiry),
      text(row.vat_number),
      text(row.company_registration),
      text(row.supplier_code),
      text(row.bo_etc),
      text(row.fts),
      text(row.des),
      text(row.prop),
      text(row.empower),
    ]
    while (out.length > 5 && out[out.length - 1] === '') out.pop()
    return out
  })
  return JSON.stringify({ format: SUPPLIER_PAYLOAD_FORMAT, rows: compact })
}

function decodeRow(row: unknown): unknown {
  if (!Array.isArray(row)) return row
  const [name, value, type, level, flags, expiry, vat, registration, code, boEtc, fts, des, prop, empower] =
    row as Partial<CompactRow>
  const bits = typeof flags === 'number' ? flags : 0
  return {
    supplier_name: name,
    value_ex_vat: value,
    supplier_type: TYPE_FROM_CODE[String(type)] ?? type,
    level,
    is_51_black_owned: (bits & FLAG_BLACK_OWNED) !== 0,
    is_30_black_women_owned: (bits & FLAG_BLACK_WOMEN) !== 0,
    is_51_bdgs: (bits & FLAG_DESIGNATED) !== 0,
    is_51_percent_flow_through: (bits & FLAG_FLOW_THROUGH) !== 0,
    expiry: expiry ?? '',
    vat_number: vat ?? '',
    company_registration: registration ?? '',
    supplier_code: code ?? '',
    bo_etc: boEtc ?? '',
    fts: fts ?? '',
    des: des ?? '',
    prop: prop ?? '',
    empower: empower ?? '',
  }
}

/**
 * Reads the supplier list from the form: the compact format above, or the
 * older plain array of supplier objects. The result is still untrusted and is
 * validated by the payload schema.
 */
export function decodeSupplierPayload(raw: string | null | undefined): { ok: true; data: unknown } | { ok: false } {
  if (!raw) return { ok: true, data: [] }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return { ok: true, data: parsed }
    if (parsed && typeof parsed === 'object' && (parsed as { format?: unknown }).format === SUPPLIER_PAYLOAD_FORMAT) {
      const rows = (parsed as { rows?: unknown }).rows
      if (!Array.isArray(rows)) return { ok: false }
      return { ok: true, data: rows.map(decodeRow) }
    }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}

export function payloadByteLength(payload: string): number {
  return new TextEncoder().encode(payload).length
}
