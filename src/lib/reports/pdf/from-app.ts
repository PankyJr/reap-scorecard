/**
 * Turns what the app stores into the PDF builders' inputs. Only maps: every
 * number comes from the engine's stored or computed result, never re-derived.
 */
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { AREA_COPY, type AreaKey } from '@/lib/scorecard/generic/ux/areas'
import type { ProcurementAssessmentResult } from '@/lib/procurement/assessment'
import { RECOGNITION_BY_LEVEL, isProcurementBonusCategory, type ProcurementCategoryKey } from '@/lib/procurement/config'
import type { ProcurementPdfInput, ProcurementPdfSupplier } from './procurement'
import type { ScorecardPdfInput } from './full-scorecard'

// ---------------------------------------------------------------------------
// Full B-BBEE scorecard
// ---------------------------------------------------------------------------

export function scorecardPdfInput(args: {
  companyName: string
  assessmentName: string | null
  measurementYear: number | null
  stored: GenericScorecardCalculation | null
  needsRecalculation: boolean
  generatedAt: Date
}): ScorecardPdfInput {
  const { stored } = args
  const base = {
    companyName: args.companyName,
    assessmentName: args.assessmentName,
    financialYear: args.measurementYear == null ? null : String(args.measurementYear),
    generatedAt: args.generatedAt,
  }
  if (!stored) {
    return {
      ...base,
      calculated: false,
      notCalculatedReason: 'The scorecard has not been calculated yet. Review it in the app and press Calculate.',
      ruleSet: { name: null, version: null },
      level: { label: null, isFinal: false, notFinalReasons: [], recognitionPercent: null },
      totalPoints: null,
      bonusPoints: null,
      elements: [],
      priorityResults: [],
    }
  }

  const isFinal = stored.readiness.complete && !args.needsRecalculation
  const notFinalReasons = args.needsRecalculation
    ? ['Something changed after this was calculated. Calculate again for an up-to-date result.']
    : [...new Set(stored.readiness.reasons)]

  return {
    ...base,
    calculated: true,
    calculatedAt: stored.calculatedAt ? new Date(stored.calculatedAt) : null,
    ruleSet: { name: stored.ruleSetDisplayName ?? null, version: stored.ruleSetVersion ?? null },
    level: {
      label: stored.finalLevel.level,
      isFinal,
      notFinalReasons: isFinal ? [] : notFinalReasons,
      recognitionPercent: stored.finalLevel.recognitionPercentage / 100,
      levelBeforeDiscount: stored.discountApplied ? stored.preliminaryLevel.level : null,
    },
    totalPoints: stored.totalBasePointsAchieved,
    bonusPoints: stored.totalBonusPointsAchieved,
    availablePoints: stored.totalBasePointsAvailable,
    elements: stored.elements.map((element) => ({
      key: element.elementKey,
      name: AREA_COPY[element.elementKey as AreaKey]?.label ?? element.displayName,
      status: element.status === 'not_started' ? 'not_calculated' : 'calculated',
      points: element.basePointsAchieved,
      availablePoints: element.basePointsAvailable,
      bonusPoints: element.bonusPointsAchieved,
      note:
        element.status === 'scored'
          ? null
          : element.status === 'not_started'
            ? 'Not filled in.'
            : 'Some figures were missing, so this area could not score in full.',
      indicators: element.indicators.map((indicator) => ({
        name: indicator.displayName,
        achieved: indicator.actual == null ? null : `${(indicator.actual * 100).toFixed(2)}%`,
        target: indicator.target == null ? null : `${(indicator.target * 100).toFixed(2)}%`,
        points: indicator.basePointsAvailable > 0 ? indicator.basePointsAchieved ?? null : indicator.bonusPointsAchieved ?? null,
        availablePoints: indicator.basePointsAvailable > 0 ? indicator.basePointsAvailable : indicator.bonusPointsAvailable ?? null,
        isBonus: indicator.basePointsAvailable === 0 && (indicator.bonusPointsAvailable ?? 0) > 0,
      })),
    })),
    priorityResults: stored.prioritySubminimums.map((outcome) => ({
      name: AREA_COPY[outcome.elementKey as AreaKey]?.label ?? outcome.label,
      requirement: `At least ${outcome.thresholdPoints.toFixed(2)} of ${outcome.basisPoints} points`,
      achieved: outcome.evaluated && outcome.achievedPoints != null ? `${outcome.achievedPoints.toFixed(2)} points` : null,
      met: outcome.evaluated ? outcome.passed : null,
    })),
    levelTable: stored.ruleSet?.levelBands?.map((band) => ({
      level: band.level,
      minPoints: Number.isFinite(band.min) ? band.min : 0,
      recognitionPercent: band.recognitionPercentage / 100,
    })),
  }
}

// ---------------------------------------------------------------------------
// Procurement
// ---------------------------------------------------------------------------

/** Who to spend more with, per scoring line, for the recommendations. */
const SUPPLIER_GROUP: Record<ProcurementCategoryKey, string> = {
  all_bbbee_suppliers: 'B-BBEE compliant suppliers',
  all_qses: 'QSE suppliers',
  all_emes: 'EME suppliers',
  black_owned_51: 'suppliers that are at least 51% black owned',
  black_women_30: 'suppliers that are at least 30% black women owned',
  bdgs_51: 'suppliers that are at least 51% owned by black designated groups',
}

type SupplierRow = {
  supplier_name?: string | null
  level?: string | number | null
  supplier_type?: string | null
  value_ex_vat?: number | string | null
  bbbee_spend?: number | string | null
  is_51_black_owned?: boolean | null
  is_30_black_women_owned?: boolean | null
  expiry?: string | null
  vat_number?: string | null
  company_registration?: string | null
}

const num = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function procurementPdfSuppliers(rows: SupplierRow[]): ProcurementPdfSupplier[] {
  return rows.map((row) => ({
    name: row.supplier_name ?? null,
    level: row.level == null || row.level === '' ? null : String(row.level),
    size: row.supplier_type ?? null,
    spend: num(row.value_ex_vat),
    recognisedSpend: num(row.bbbee_spend),
    blackOwned51: row.is_51_black_owned ?? null,
    blackWomenOwned30: row.is_30_black_women_owned ?? null,
    certificateExpiry: row.expiry ?? null,
    vatNumber: row.vat_number ?? null,
    registrationNumber: row.company_registration ?? null,
  }))
}

export function procurementPdfInput(args: {
  companyName: string
  assessmentName: string | null
  assessmentYear: number | string | null
  generatedAt: Date
  result: ProcurementAssessmentResult | null
  suppliers: SupplierRow[]
  totalMeasuredSpend: number | null
  tmps: {
    inclusions: Array<{ label: string; amount: number | null }>
    exclusions: Array<{ label: string; amount: number | null }>
    inclusionsTotal: number | null
    exclusionsTotal: number | null
  } | null
  tmpsBasis?: string | null
}): ProcurementPdfInput {
  return {
    companyName: args.companyName,
    assessmentName: args.assessmentName,
    financialYear: args.assessmentYear == null ? null : String(args.assessmentYear),
    generatedAt: args.generatedAt,
    indicators: (args.result?.categories ?? []).map((category) => ({
      key: category.key,
      name: category.name,
      supplierGroup: SUPPLIER_GROUP[category.key] ?? null,
      targetPercent: category.targetPercent,
      achievedPercent: category.achievedPercent,
      availablePoints: category.availablePoints,
      pointsAchieved: category.pointsAchieved,
      recognisedSpend: category.numeratorValue,
      // The engine's bonus-only indicator, as on every screen.
      isBonus: isProcurementBonusCategory(category.key),
    })),
    tmps: {
      total: args.totalMeasuredSpend,
      inclusions: args.tmps?.inclusions ?? [],
      exclusions: args.tmps?.exclusions ?? [],
      inclusionsTotal: args.tmps?.inclusionsTotal ?? null,
      exclusionsTotal: args.tmps?.exclusionsTotal ?? null,
      basis: args.tmpsBasis ?? null,
    },
    suppliers: procurementPdfSuppliers(args.suppliers),
    method: {
      recognitionLevels: Object.entries(RECOGNITION_BY_LEVEL).map(([level, recognition]) => ({
        level: /^\d$/.test(level) ? `Level ${level}` : 'Non-compliant',
        recognition,
      })),
    },
  }
}
