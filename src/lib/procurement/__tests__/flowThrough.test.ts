import { describe, expect, it } from 'vitest'
import { normalizeFlowThroughValue } from '../flowThrough'
import {
  serializeSupplierRowsForAssessment,
  supplierFromDatabaseRow,
} from '../supplierFormRow'

describe('normalizeFlowThroughValue', () => {
  it.each(['Yes', ' Y ', 'TRUE', '1'])('enables %j', (raw) => {
    expect(normalizeFlowThroughValue(raw)).toMatchObject({
      value: true,
      warning: null,
    })
  })

  it.each(['No', ' N ', 'FALSE', '0', '', '   ', null, undefined])(
    'disables %j',
    (raw) => {
      expect(normalizeFlowThroughValue(raw)).toMatchObject({
        value: false,
        warning: null,
      })
    },
  )

  it('accepts boolean values', () => {
    expect(normalizeFlowThroughValue(true).value).toBe(true)
    expect(normalizeFlowThroughValue(false).value).toBe(false)
  })

  it('warns, preserves the raw value, and defaults unknown values off', () => {
    expect(normalizeFlowThroughValue(' Maybe ')).toEqual({
      value: false,
      rawValue: 'Maybe',
      warning:
        'Unrecognised Flow Through value “Maybe”; expected Yes, Y, True, 1, No, N, False, 0, or blank. Flow Through was left off.',
    })
  })
})

describe('Flow Through supplier persistence plumbing', () => {
  it('serialises the canonical boolean for server actions', () => {
    const json = serializeSupplierRowsForAssessment([
      {
        id: 'supplier-1',
        supplier_name: 'Supplier',
        supplier_type: 'Generic',
        level: '4',
        value_ex_vat: 100,
        is_51_black_owned: false,
        is_30_black_women_owned: false,
        is_51_bdgs: false,
        is_51_percent_flow_through: true,
      },
    ])

    expect(JSON.parse(json)[0].is_51_percent_flow_through).toBe(true)
  })

  it('hydrates saved and legacy rows safely', () => {
    const base = {
      id: 'supplier-1',
      supplier_name: 'Supplier',
      supplier_type: 'Generic',
      level: '4',
      value_ex_vat: 100,
    }

    expect(
      supplierFromDatabaseRow({
        ...base,
        is_51_percent_flow_through: true,
      }).is_51_percent_flow_through,
    ).toBe(true)
    expect(
      supplierFromDatabaseRow(base).is_51_percent_flow_through,
    ).toBe(false)
  })
})
