import type { ProcurementSupplierInput } from '@/lib/procurement/rows'
import { encodeSupplierPayload } from '@/lib/procurement/supplierPayload'

export interface SupplierFormRow extends ProcurementSupplierInput {
  id: string
  is_51_percent_flow_through: boolean
}

/** JSON payload for procurement server actions — matches SuppliersTable sync logic. */
export function serializeSupplierRowsForAssessment(
  rows: SupplierFormRow[],
): string {
  return JSON.stringify(supplierRowsToInputs(rows))
}

/**
 * The supplier list as the form sends it to the save actions: the compact
 * format of supplierPayload.ts, about a third of the size, so 8,000 suppliers
 * fit the request limit. The actions read both formats.
 */
export function serializeSupplierRowsForSave(rows: SupplierFormRow[]): string {
  return encodeSupplierPayload(supplierRowsToInputs(rows))
}

/** A missing level ('') stays missing. */
export function supplierRowsToInputs(rows: SupplierFormRow[]): ProcurementSupplierInput[] {
  return rows.map((row) => ({
    supplier_name: row.supplier_name ?? '',
    supplier_code: row.supplier_code,
    vat_number: row.vat_number,
    company_registration: row.company_registration,
    bo_etc: row.bo_etc,
    fts: row.fts,
    des: row.des,
    prop: row.prop,
    supplier_type: row.supplier_type ?? 'Generic',
    level: row.level ?? 'Non-Compliant',
    value_ex_vat: Number(row.value_ex_vat) || 0,
    is_51_black_owned: !!row.is_51_black_owned,
    is_30_black_women_owned: !!row.is_30_black_women_owned,
    is_51_bdgs: !!row.is_51_bdgs,
    is_51_percent_flow_through: !!row.is_51_percent_flow_through,
    expiry: row.expiry,
    empower: row.empower,
  }))
}

/** Map a saved `procurement_suppliers` row into editable table state (server- or client-safe). */
export function supplierFromDatabaseRow(row: {
  id: string
  supplier_name: string
  supplier_code?: string | null
  vat_number?: string | null
  company_registration?: string | null
  bo_etc?: string | null
  fts?: string | null
  des?: string | null
  prop?: string | null
  supplier_type: string
  level: string
  value_ex_vat: number | string | null
  is_51_black_owned?: boolean | null
  is_30_black_women_owned?: boolean | null
  is_51_bdgs?: boolean | null
  is_51_percent_flow_through?: boolean | null
  expiry?: string | null
  empower?: string | null
}): SupplierFormRow {
  const st =
    row.supplier_type === 'EME' || row.supplier_type === 'QSE'
      ? row.supplier_type
      : 'Generic'
  const rawLevel = (row.level ?? 'Non-Compliant').trim()
  const levelMatch = /^Level\s+(\d)$/i.exec(rawLevel)
  const digitOrRaw = levelMatch ? levelMatch[1] : rawLevel
  // A level saved blank (or anything unrecognised) stays missing, so it is
  // shown under Needs attention instead of silently becoming Non-compliant.
  const normalizedLevel = /^[1-8]$/.test(digitOrRaw)
    ? digitOrRaw
    : rawLevel.toLowerCase() === 'non-compliant'
      ? 'Non-Compliant'
      : ''
  let expiryStr = ''
  if (row.expiry) {
    const s = String(row.expiry)
    expiryStr = s.length >= 10 ? s.slice(0, 10) : s
  }
  return {
    id: row.id,
    supplier_name: row.supplier_name ?? '',
    supplier_code: row.supplier_code ?? '',
    vat_number: row.vat_number ?? '',
    company_registration: row.company_registration ?? '',
    bo_etc: row.bo_etc ?? '',
    fts: row.fts ?? '',
    des: row.des ?? '',
    prop: row.prop ?? '',
    supplier_type: st,
    level: normalizedLevel,
    value_ex_vat: Number(row.value_ex_vat ?? 0),
    is_51_black_owned: !!row.is_51_black_owned,
    is_30_black_women_owned: !!row.is_30_black_women_owned,
    is_51_bdgs: !!row.is_51_bdgs,
    is_51_percent_flow_through: !!row.is_51_percent_flow_through,
    expiry: expiryStr,
    empower: row.empower ?? '',
  }
}
