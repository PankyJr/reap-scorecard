import {
  aggregateCategoryTotals,
  calculateProcurementResults,
  type ProcurementAssessmentResult,
} from '@/lib/procurement/assessment'
import type { ProcurementExcelColumnMapping } from '@/lib/procurement/excel/types'
import type { ProcurementExcelParseSuccess } from '@/lib/procurement/excel/types'
import { calculateSupplierRow } from '@/lib/procurement/rows'
import type { ProcurementSupplierInput } from '@/lib/procurement/rows'
import {
  getMarketingDemoDenominator,
  getMarketingDemoProcurementResult,
  getMarketingDemoRecognisedShare,
  MARKETING_DEMO_RECOGNISED_SPEND,
  MARKETING_DEMO_SUPPLIER_SNIPPET,
} from '@/components/marketing/marketingProcurementPreviewData'
import {
  sumSupplierValueExVat,
  type ProcurementTmpsDenominatorSource,
} from '@/lib/procurement/tmpsDenominator'

export type MarketingPreviewSupplierRow = {
  name: string
  spend: number
  level: string
}

function columnIndex(
  headers: string[],
  mapping: ProcurementExcelColumnMapping,
  field: keyof ProcurementExcelColumnMapping,
): number {
  const mapped = mapping[field]
  if (!mapped) return -1
  return headers.findIndex((h) => h === mapped)
}

export function mappingFromAuto(
  auto: ProcurementExcelColumnMapping,
): ProcurementExcelColumnMapping {
  return {
    supplier_name: auto.supplier_name ?? null,
    spend_amount: auto.spend_amount ?? null,
    bbb_level: auto.bbb_level ?? null,
    black_ownership: auto.black_ownership ?? null,
    black_women_ownership: auto.black_women_ownership ?? null,
    bdgs_51: auto.bdgs_51 ?? null,
    procurement_recognition: auto.procurement_recognition ?? null,
    supplier_type: auto.supplier_type ?? null,
  }
}

export function marketingPreviewSupplierRows(args: {
  builtSuppliers: ProcurementSupplierInput[]
  parse: ProcurementExcelParseSuccess | null
  mapping: ProcurementExcelColumnMapping
  useDemoDataset: boolean
}): MarketingPreviewSupplierRow[] {
  const { builtSuppliers, parse, mapping, useDemoDataset } = args

  if (builtSuppliers.length > 0) {
    return builtSuppliers.slice(0, 4).map((s) => ({
      name: s.supplier_name || '—',
      spend: s.value_ex_vat,
      level: s.level || '—',
    }))
  }

  if (parse && !parse.supplierImportBlockedReason && parse.columnHeaders.length > 0) {
    const nameIdx = columnIndex(parse.columnHeaders, mapping, 'supplier_name')
    const spendIdx = columnIndex(parse.columnHeaders, mapping, 'spend_amount')
    const levelIdx = columnIndex(parse.columnHeaders, mapping, 'bbb_level')

    if (nameIdx >= 0 && spendIdx >= 0) {
      return parse.dataRows.slice(0, 4).map((row) => {
        const spendRaw = row[spendIdx]
        const spend =
          typeof spendRaw === 'number'
            ? spendRaw
            : Number(String(spendRaw ?? '').replace(/[^\d.-]/g, '')) || 0
        return {
          name: String(row[nameIdx] ?? '').trim() || '—',
          spend,
          level: levelIdx >= 0 ? String(row[levelIdx] ?? '').trim() || '—' : '—',
        }
      })
    }
  }

  if (useDemoDataset || !parse) {
    return MARKETING_DEMO_SUPPLIER_SNIPPET.slice(0, 4).map((r) => ({
      name: r.name,
      spend: r.spend,
      level: r.level,
    }))
  }

  return []
}

export function marketingPreviewDenominator(args: {
  tmpsSource: ProcurementTmpsDenominatorSource
  builtSuppliers: ProcurementSupplierInput[]
  parse: ProcurementExcelParseSuccess | null
  useDemoDataset: boolean
}): number {
  const { tmpsSource, builtSuppliers, parse, useDemoDataset } = args

  if (builtSuppliers.length > 0) {
    const supplierTotal = sumSupplierValueExVat(builtSuppliers)
    if (tmpsSource === 'import_supplier_total') {
      return supplierTotal
    }
    if (parse?.suggestedTmpsTotal != null && parse.suggestedTmpsTotal > 0) {
      return parse.suggestedTmpsTotal
    }
    return supplierTotal > 0 ? supplierTotal : 1
  }

  if (useDemoDataset) {
    return getMarketingDemoDenominator(tmpsSource)
  }

  return 0
}

export function marketingPreviewAssessment(args: {
  scorePreviewReady: boolean
  builtSuppliers: ProcurementSupplierInput[]
  denominator: number
  useDemoDataset: boolean
}): {
  result: ProcurementAssessmentResult
  recognisedSpend: number
  fromUploadedWorkbook: boolean
} | null {
  const { scorePreviewReady, builtSuppliers, denominator, useDemoDataset } = args
  if (!scorePreviewReady || denominator <= 0) return null

  if (builtSuppliers.length > 0) {
    const calculated = builtSuppliers.map((row) => calculateSupplierRow(row))
    const totals = aggregateCategoryTotals(calculated)
    const recognisedSpend = calculated.reduce((sum, row) => sum + row.bbbee_spend, 0)
    return {
      result: calculateProcurementResults({
        totals,
        totalMeasuredSpend: denominator,
      }),
      recognisedSpend,
      fromUploadedWorkbook: !useDemoDataset,
    }
  }

  if (useDemoDataset) {
    return {
      result: getMarketingDemoProcurementResult(denominator),
      recognisedSpend: MARKETING_DEMO_RECOGNISED_SPEND,
      fromUploadedWorkbook: false,
    }
  }

  return null
}

export function marketingPreviewBbbeeShare(
  recognisedSpend: number,
  denominator: number,
  useDemoDataset: boolean,
): number {
  if (denominator <= 0) return 0
  if (recognisedSpend > 0) return recognisedSpend / denominator
  if (useDemoDataset) return getMarketingDemoRecognisedShare(denominator)
  return 0
}
