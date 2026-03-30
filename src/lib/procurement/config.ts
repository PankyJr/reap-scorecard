export const RECOGNITION_BY_LEVEL: Record<string, number> = {
  '1': 1.35,
  '2': 1.25,
  '3': 1.1,
  '4': 1.0,
  '5': 0.8,
  '6': 0.6,
  '7': 0.5,
  '8': 0.1,
  'Non-Compliant': 0,
}

export type ProcurementCategoryKey =
  | 'all_bbbee_suppliers'
  | 'all_qses'
  | 'all_emes'
  | 'black_owned_51'
  | 'black_women_30'
  | 'bdgs_51'

export interface ProcurementCategoryDefinition {
  key: ProcurementCategoryKey
  name: string
  targetPercent: number
  availablePoints: number
}

export const PROCUREMENT_CATEGORIES: ProcurementCategoryDefinition[] = [
  {
    key: 'all_bbbee_suppliers',
    name: 'All B-BBEE Suppliers',
    targetPercent: 0.8,
    availablePoints: 5,
  },
  {
    key: 'all_qses',
    name: 'All QSEs',
    targetPercent: 0.15,
    availablePoints: 3,
  },
  {
    key: 'all_emes',
    name: 'All EMEs',
    targetPercent: 0.15,
    availablePoints: 4,
  },
  {
    key: 'black_owned_51',
    name: '51% Black Owned',
    targetPercent: 0.5,
    availablePoints: 11,
  },
  {
    key: 'black_women_30',
    name: '30% Black Women Owned',
    targetPercent: 0.12,
    availablePoints: 4,
  },
  {
    key: 'bdgs_51',
    name: '51% Black Designated Groups',
    targetPercent: 0.02,
    availablePoints: 2,
  },
]

