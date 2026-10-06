import { describe, expect, it } from 'vitest'
import { decodeSupplierPayload, encodeSupplierPayload, payloadByteLength } from '../supplierPayload'
import { assessmentPayloadSchema, parseSuppliersJsonFromForm, supplierSchema } from '../assessmentServerPayload'
import { serializeSupplierRowsForAssessment, serializeSupplierRowsForSave, type SupplierFormRow } from '../supplierFormRow'
import type { ProcurementSupplierInput } from '../rows'
import {
  PLATFORM_REQUEST_LIMIT_BYTES,
  PROCUREMENT_UPLOAD_MAX_BYTES,
  SERVER_ACTION_BODY_LIMIT_BYTES,
  SUPPLIER_PAYLOAD_MAX_BYTES,
} from '../uploadLimits'
import nextConfig from '../../../../next.config'

function synthetic(i: number): SupplierFormRow {
  return {
    id: `row-${i}`,
    supplier_name: `Synthetic Supplier ${i} (Pty) Ltd`,
    supplier_code: `V${100000 + i}`,
    vat_number: `4${String(100000000 + i)}`,
    company_registration: `2010/${String(100000 + i)}/07`,
    bo_etc: '',
    fts: '',
    des: '',
    prop: '',
    supplier_type: (['EME', 'QSE', 'Generic'] as const)[i % 3],
    level: i % 10 === 0 ? '' : String((i % 8) + 1),
    value_ex_vat: 12345.67 + i,
    is_51_black_owned: i % 2 === 0,
    is_30_black_women_owned: i % 5 === 0,
    is_51_bdgs: i % 7 === 0,
    is_51_percent_flow_through: i % 11 === 0,
    expiry: i % 4 === 0 ? '2027-02-28' : '',
    empower: '',
  }
}

describe('compact supplier payload', () => {
  it('round-trips every field the save uses', () => {
    const rows = [synthetic(0), synthetic(1), { ...synthetic(2), bo_etc: 'note, with "quotes"', empower: 'x' }]
    const decoded = decodeSupplierPayload(serializeSupplierRowsForSave(rows))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const parsed = (decoded.data as unknown[]).map((row) => supplierSchema.parse(row))
    const expected = rows.map(({ id, ...rest }) => {
      void id
      return rest
    })
    expect(parsed).toEqual(expected)
  })

  it('still reads the older plain JSON array', () => {
    const legacy: ProcurementSupplierInput[] = [
      {
        supplier_name: 'Old',
        supplier_type: 'QSE',
        level: '2',
        value_ex_vat: 10,
        is_51_black_owned: true,
        is_30_black_women_owned: false,
        is_51_bdgs: false,
        is_51_percent_flow_through: false,
      },
    ]
    expect(parseSuppliersJsonFromForm(JSON.stringify(legacy))).toEqual({ ok: true, data: legacy })
  })

  it('refuses something that is neither format', () => {
    expect(decodeSupplierPayload('{"format":"other"}').ok).toBe(false)
    expect(decodeSupplierPayload('not json').ok).toBe(false)
    expect(decodeSupplierPayload('').ok).toBe(true)
  })

  it('keeps 8,000 suppliers well inside the request limit', () => {
    const rows = Array.from({ length: 8000 }, (_, i) => synthetic(i))
    const compact = serializeSupplierRowsForSave(rows)
    const legacy = serializeSupplierRowsForAssessment(rows)
    expect(payloadByteLength(compact)).toBeLessThan(SUPPLIER_PAYLOAD_MAX_BYTES / 2)
    expect(payloadByteLength(compact)).toBeLessThan(payloadByteLength(legacy) / 2)
    // The old format alone would have broken Next's 1 MB default.
    expect(payloadByteLength(legacy)).toBeGreaterThan(1024 * 1024)
    const decoded = encodeSupplierPayload([])
    expect(decodeSupplierPayload(decoded)).toEqual({ ok: true, data: [] })
  })
})

describe('saved supplier fields', () => {
  it('keep a missing level missing and drop an expiry that is not a date', () => {
    const base = {
      supplier_name: 'X',
      supplier_type: 'Generic',
      value_ex_vat: 1,
      is_51_black_owned: false,
      is_30_black_women_owned: false,
      is_51_bdgs: false,
      is_51_percent_flow_through: false,
    }
    expect(supplierSchema.parse({ ...base, level: '', expiry: '2026-02-30' })).toMatchObject({ level: '', expiry: '' })
    expect(supplierSchema.parse({ ...base, level: '3', expiry: '2026-02-28' })).toMatchObject({ level: '3', expiry: '2026-02-28' })
    expect(supplierSchema.parse({ ...base, level: '3', expiry: '31/03/2026' }).expiry).toBe('')
  })

  it('accept a full 8,000-supplier assessment', () => {
    const decoded = decodeSupplierPayload(serializeSupplierRowsForSave(Array.from({ length: 8000 }, (_, i) => synthetic(i))))
    const parsed = assessmentPayloadSchema.safeParse({
      company_id: '00000000-0000-4000-8000-000000000000',
      assessment_year: '2026',
      tmps_denominator_source: 'import_supplier_total',
      suppliers: decoded.ok ? decoded.data : [],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.suppliers).toHaveLength(8000)
  })
})

describe('request size limits', () => {
  it('next.config lets server actions take the 4 MB the procurement upload and save need', () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe('4mb')
    expect(SERVER_ACTION_BODY_LIMIT_BYTES).toBe(4 * 1024 * 1024)
  })

  it('keeps an upload under the platform limit even when base64-encoded', () => {
    expect(PROCUREMENT_UPLOAD_MAX_BYTES).toBeLessThan(SERVER_ACTION_BODY_LIMIT_BYTES)
    expect(Math.ceil((SERVER_ACTION_BODY_LIMIT_BYTES * 4) / 3)).toBeLessThan(PLATFORM_REQUEST_LIMIT_BYTES)
  })
})
