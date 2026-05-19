import { calculateProcurementResults } from '@/lib/procurement/assessment'
import type { ProcurementCategoryTotals } from '@/lib/procurement/assessment'
import type { ProcurementTmpsDenominatorSource } from '@/lib/procurement/tmpsDenominator'

/** Static sample category totals for marketing previews only — not live client data. */
export const MARKETING_DEMO_TOTALS: ProcurementCategoryTotals = {
  all_bbbee_suppliers: 556_000,
  all_qses: 104_250,
  all_emes: 83_400,
  black_owned_51: 382_250,
  black_women_30: 83_400,
  bdgs_51: 13_900,
}

export const MARKETING_DEMO_TMPS_CALCULATED = 695_000
export const MARKETING_DEMO_TMPS_SUPPLIER_TOTAL = 662_000
export const MARKETING_DEMO_RECOGNISED_SPEND = 625_500

/** Sample supplier rows for marketing UI previews only. */
export const MARKETING_DEMO_SUPPLIER_SNIPPET = [
  { name: 'Ubuntu Logistics (Pty) Ltd', spend: 148_500, level: 'Level 2' },
  { name: 'Khanya IT Solutions', spend: 92_400, level: 'Level 1' },
  { name: 'Mvelo Construction Supplies', spend: 76_800, level: 'Level 3' },
  { name: 'Sizwe Stationery CC', spend: 41_200, level: 'EME' },
  { name: 'Rea Chemicals', spend: 118_600, level: 'Level 2' },
] as const

export function getMarketingDemoDenominator(
  source: ProcurementTmpsDenominatorSource,
): number {
  return source === 'import_supplier_total'
    ? MARKETING_DEMO_TMPS_SUPPLIER_TOTAL
    : MARKETING_DEMO_TMPS_CALCULATED
}

export function getMarketingDemoProcurementResult(denominator: number) {
  return calculateProcurementResults({
    totals: MARKETING_DEMO_TOTALS,
    totalMeasuredSpend: denominator,
  })
}

export function getMarketingDemoRecognisedShare(denominator: number) {
  if (denominator <= 0) return 0
  return MARKETING_DEMO_RECOGNISED_SPEND / denominator
}

/** @deprecated Use getMarketingDemoProcurementResult — kept for any stale imports */
export const MARKETING_DEMO_TMPS = MARKETING_DEMO_TMPS_CALCULATED
export const MARKETING_DEMO_PROCUREMENT_RESULT = getMarketingDemoProcurementResult(
  MARKETING_DEMO_TMPS_CALCULATED,
)
export const MARKETING_DEMO_BBBEE_SHARE_OF_TMPS = getMarketingDemoRecognisedShare(
  MARKETING_DEMO_TMPS_CALCULATED,
)
