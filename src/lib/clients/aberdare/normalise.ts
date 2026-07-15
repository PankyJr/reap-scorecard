import { RECOGNITION_BY_LEVEL } from '@/lib/procurement/config'
import type { ComplianceStatus } from '@/lib/procurement/simulator'
import type { SupplierType } from '@/lib/procurement/rows'
import type {
  AberdareImportClassification,
  AberdareNormalisedFlag,
} from './types'

const LEVEL_KEYS = new Set(['1', '2', '3', '4', '5', '6', '7', '8'])

/** Case/whitespace-safe accreditation normaliser. Level "6" stays Level 6. */
export function normaliseAccredLevel(raw: unknown): {
  raw: string
  level: string
  complianceStatus: ComplianceStatus
} {
  const rawStr = raw == null ? '' : String(raw).trim()
  const key = rawStr.toLowerCase()

  if (!key) {
    return {
      raw: rawStr,
      level: 'Non-Compliant',
      complianceStatus: 'unknown',
    }
  }

  if (key === 'nc' || key === 'non-compliant' || key === 'non compliant') {
    return {
      raw: rawStr,
      level: 'Non-Compliant',
      complianceStatus: 'non-compliant',
    }
  }

  if (LEVEL_KEYS.has(key)) {
    return {
      raw: rawStr,
      level: key,
      complianceStatus: 'compliant',
    }
  }

  return {
    raw: rawStr,
    level: 'Non-Compliant',
    complianceStatus: 'unknown',
  }
}

/**
 * Categorical placeholder "6" → unknown / not provided.
 * Does NOT apply to Accred level (1-8), where "6" is Level 6.
 */
export function normaliseCategoricalPlaceholder(
  raw: unknown,
): { raw: string; normalised: AberdareNormalisedFlag | string } {
  if (raw == null || raw === '') {
    return { raw: '', normalised: 'not_provided' }
  }
  const rawStr = String(raw).trim()
  const lower = rawStr.toLowerCase()

  if (rawStr === '6' || raw === 6) {
    return { raw: rawStr, normalised: 'unknown' }
  }
  if (lower === 'y' || lower === 'yes') {
    return { raw: rawStr, normalised: 'yes' }
  }
  if (lower === 'n' || lower === 'no') {
    return { raw: rawStr, normalised: 'no' }
  }
  return { raw: rawStr, normalised: rawStr }
}

export function classifyImportFlag(raw: unknown): {
  raw: string
  classification: AberdareImportClassification
  isImported: boolean
} {
  if (raw == null || raw === '') {
    return {
      raw: '',
      classification: 'not_explicitly_imported',
      isImported: false,
    }
  }
  const rawStr = String(raw).trim()
  const lower = rawStr.toLowerCase()

  if (lower === 'y' || lower === 'yes') {
    return { raw: rawStr, classification: 'imported', isImported: true }
  }
  if (lower === 'n' || lower === 'no') {
    return { raw: rawStr, classification: 'local', isImported: false }
  }
  if (rawStr === '6' || raw === 6) {
    return {
      raw: rawStr,
      classification: 'not_explicitly_imported',
      isImported: false,
    }
  }
  return {
    raw: rawStr,
    classification: 'not_explicitly_imported',
    isImported: false,
  }
}

/** Parse currency/numeric cells; preserve negatives; null for malformed. */
export function parseNumericCell(
  raw: unknown,
): { value: number | null; malformed: boolean } {
  if (raw == null || raw === '') {
    return { value: null, malformed: false }
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { value: null, malformed: true }
    return { value: raw, malformed: false }
  }
  const cleaned = String(raw)
    .trim()
    .replace(/\s/g, '')
    .replace(/R/gi, '')
    .replace(/,/g, '')
  if (!cleaned) return { value: null, malformed: false }
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return { value: null, malformed: true }
  return { value: n, malformed: false }
}

/** Parse multipliers such as 135%, 100%, 0. */
export function parseMultiplierPercent(
  raw: unknown,
): { raw: string; percent: number | null } {
  if (raw == null || raw === '') {
    return { raw: '', percent: null }
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { raw: String(raw), percent: null }
    // Excel may store 1.35 or 135
    if (raw > 0 && raw <= 2) {
      return { raw: String(raw), percent: Math.round(raw * 10000) / 100 }
    }
    return { raw: String(raw), percent: raw }
  }
  const rawStr = String(raw).trim()
  const cleaned = rawStr.replace(/%/g, '').trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return { raw: rawStr, percent: null }
  return { raw: rawStr, percent: n }
}

export function expectedRecognitionPercentForLevel(level: string): number {
  const ratio =
    level in RECOGNITION_BY_LEVEL
      ? RECOGNITION_BY_LEVEL[level]!
      : RECOGNITION_BY_LEVEL['Non-Compliant']!
  return Math.round(ratio * 10000) / 100
}

export function multiplierMatchesRecognition(
  multiplierPercent: number | null,
  level: string,
): boolean {
  if (multiplierPercent == null) return true
  const expected = expectedRecognitionPercentForLevel(level)
  return Math.abs(multiplierPercent - expected) < 0.05
}

export function resolveSupplierType(args: {
  emeAmount: number | null
  qseAmount: number | null
}): SupplierType {
  if (args.emeAmount != null && args.emeAmount !== 0) return 'EME'
  if (args.qseAmount != null && args.qseAmount !== 0) return 'QSE'
  return 'Generic'
}

export function parseOwnershipPercent(raw: unknown): number | null {
  const { value, malformed } = parseNumericCell(raw)
  if (malformed || value == null) return null
  return value
}

export function flagAmountAsBoolean(amount: number | null): boolean {
  return amount != null && amount !== 0
}

export function importStatusLabel(
  classification: AberdareImportClassification,
): string {
  switch (classification) {
    case 'imported':
      return 'Imported'
    case 'local':
      return 'Local'
    case 'not_explicitly_imported':
      return 'Not explicitly imported'
  }
}
