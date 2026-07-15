import type { SimulatorBaselineMeta, SimulatorSupplier } from './types'
import { complianceFromLevel } from './resolveEffectiveLevel'

const FEATURED_SUPPLIERS: Omit<SimulatorSupplier, 'id'>[] = [
  {
    supplier_name: 'Thabo Maseko Industrial Supplies',
    supplier_code: 'SAP-100214',
    supplier_type: 'QSE',
    level: '1',
    value_ex_vat: 18_450_000,
    is_51_black_owned: true,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    is_imported: false,
    compliance_status: 'compliant',
    expiry: '2027-03-15',
  },
  {
    supplier_name: 'Durban Bay Engineering Components',
    supplier_code: 'SAP-100387',
    supplier_type: 'Generic',
    level: '3',
    value_ex_vat: 6_820_000,
    is_51_black_owned: false,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    is_imported: false,
    compliance_status: 'compliant',
    expiry: '2026-11-30',
  },
  {
    supplier_name: 'Gauteng Precision Metals',
    supplier_code: 'SAP-100512',
    supplier_type: 'QSE',
    level: '4',
    value_ex_vat: 4_275_000,
    is_51_black_owned: true,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    is_imported: false,
    compliance_status: 'compliant',
    expiry: '2027-01-20',
  },
  {
    supplier_name: 'Northern Cape Logistics Partners',
    supplier_code: 'SAP-100891',
    supplier_type: 'Generic',
    level: 'Non-Compliant',
    value_ex_vat: 3_960_000,
    is_51_black_owned: false,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    is_imported: false,
    compliance_status: 'non-compliant',
  },
  {
    supplier_name: 'Atlantic Drum & Container Imports',
    supplier_code: 'SAP-101044',
    supplier_type: 'Generic',
    level: '2',
    value_ex_vat: 2_890_000,
    is_51_black_owned: false,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    is_imported: true,
    compliance_status: 'compliant',
    expiry: '2026-09-10',
  },
  {
    supplier_name: 'Karoo Mining Services',
    supplier_code: 'SAP-101203',
    supplier_type: 'EME',
    level: '5',
    value_ex_vat: 1_540_000,
    is_51_black_owned: true,
    is_30_black_women_owned: true,
    is_51_bdgs: false,
    is_imported: false,
    compliance_status: 'unknown',
  },
  {
    supplier_name: 'Limpopo Agricultural Co-operative',
    supplier_code: 'SAP-101318',
    supplier_type: 'EME',
    level: '5',
    value_ex_vat: 980_000,
    is_51_black_owned: true,
    is_30_black_women_owned: false,
    is_51_bdgs: true,
    is_imported: false,
    compliance_status: 'expired',
    expiry: '2025-08-01',
  },
]

const PREFIXES = [
  'Eastern',
  'Western',
  'Southern',
  'Northern',
  'Central',
  'Coastal',
  'Highveld',
  'Lowveld',
  'Karoo',
  'Metro',
]

const SUFFIXES = [
  'Industrial',
  'Engineering',
  'Trading',
  'Supplies',
  'Services',
  'Manufacturing',
  'Logistics',
  'Components',
  'Solutions',
  'Holdings',
]

const TYPES = ['EME', 'QSE', 'Generic'] as const
const LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', 'Non-Compliant'] as const

/** Deterministic pseudo-random in [0, 1). */
function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12_989.9898 + seed * 78_233) * 43_758.5453
  return x - Math.floor(x)
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seededUnit(seed) * items.length)]!
}

function generateSupplier(index: number): SimulatorSupplier {
  if (index < FEATURED_SUPPLIERS.length) {
    return { id: `mbeki-sup-${String(index + 1).padStart(4, '0')}`, ...FEATURED_SUPPLIERS[index]! }
  }

  const seed = index + 1
  const prefix = pick(PREFIXES, seed * 3)
  const suffix = pick(SUFFIXES, seed * 7)
  const name = `${prefix} ${suffix} ${String.fromCharCode(65 + (index % 26))}${index}`
  const supplier_type = pick(TYPES, seed * 11)
  const level = pick(LEVELS, seed * 13)
  const spendBase = 25_000 + Math.floor(seededUnit(seed * 17) * 850_000)
  const is_imported = seededUnit(seed * 19) < 0.08
  const is_51_black_owned = seededUnit(seed * 23) < 0.42
  const is_30_black_women_owned =
    is_51_black_owned && seededUnit(seed * 29) < 0.35
  const is_51_bdgs = seededUnit(seed * 31) < 0.06

  let compliance_status = complianceFromLevel(level)
  if (seededUnit(seed * 37) < 0.02) compliance_status = 'unknown'
  if (seededUnit(seed * 41) < 0.015) compliance_status = 'expired'

  const effectiveLevel =
    compliance_status === 'non-compliant' ||
    compliance_status === 'unknown' ||
    compliance_status === 'expired'
      ? 'Non-Compliant'
      : level

  return {
    id: `mbeki-sup-${String(index + 1).padStart(4, '0')}`,
    supplier_name: name,
    supplier_code: `SAP-${String(102000 + index).padStart(6, '0')}`,
    supplier_type,
    level: effectiveLevel,
    value_ex_vat: spendBase,
    is_51_black_owned,
    is_30_black_women_owned,
    is_51_bdgs,
    is_imported,
    compliance_status,
    expiry:
      compliance_status === 'expired'
        ? '2025-06-30'
        : compliance_status === 'unknown'
          ? undefined
          : `2026-${String((index % 12) + 1).padStart(2, '0')}-28`,
  }
}

/** Generates deterministic fictional supplier rows for performance testing. */
export function generateMbekiSimulatorSuppliers(
  count = 900,
): SimulatorSupplier[] {
  const safeCount = Math.max(1, Math.min(count, 10_000))
  return Array.from({ length: safeCount }, (_, i) => generateSupplier(i))
}

export const MBEKI_SIMULATOR_META: SimulatorBaselineMeta = {
  companyName: 'Mbeki Industrial Holdings (Pty) Ltd',
  reportingPeriod: 'March 2026 (monthly SAP extract)',
  lastUploadDate: '2026-03-31',
  uploadLabel: 'Mbeki_Industrial_Supplier_Register_2026.xlsx',
}

export const DEFAULT_SIMULATOR_SUPPLIER_COUNT = 900
