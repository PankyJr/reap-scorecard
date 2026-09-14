/**
 * Full Generic Scorecard workbook import — sheet catalog and classification.
 * The reference workbook has 22 sheets (including trailing/leading spaces).
 */

export type SheetClassification =
  | 'recognised_importable'
  | 'recognised_requires_confirmation'
  | 'informational_only'
  | 'ignored'
  | 'contains_warnings'
  | 'unsupported'

export type ExpectedSheetSpec = {
  /** Canonical display name (without padding quirks). */
  canonicalName: string
  /** Normalised aliases the detector accepts. */
  aliases: readonly string[]
  classification: SheetClassification
  /** Element or section this sheet feeds. */
  populates:
    | 'financial'
    | 'ownership'
    | 'management_control'
    | 'skills_development'
    | 'enterprise_development'
    | 'supplier_development'
    | 'socio_economic_development'
    | 'procurement_notice'
    | 'informational'
    | 'none'
  notes?: string
}

export const GENERIC_WORKBOOK_IMPORT_VERSION = 'generic-workbook-import-v1'

export const EXPECTED_GENERIC_SHEETS: readonly ExpectedSheetSpec[] = [
  {
    canonicalName: 'Summary',
    aliases: ['summary'],
    classification: 'informational_only',
    populates: 'informational',
    notes: 'Workbook totals and levels are ignored; the generic engine recalculates.',
  },
  {
    canonicalName: 'Ownership',
    aliases: ['ownership'],
    classification: 'recognised_importable',
    populates: 'ownership',
  },
  {
    canonicalName: 'Management Control',
    aliases: ['management control'],
    classification: 'recognised_requires_confirmation',
    populates: 'management_control',
    notes: 'Register sheets are preferred for scoring-ready denominators.',
  },
  {
    canonicalName: '3 Board Members',
    aliases: ['3 board members', 'board members'],
    classification: 'recognised_importable',
    populates: 'management_control',
  },
  {
    canonicalName: '4 Executive Committe',
    aliases: ['4 executive committe', '4 executive committee', 'executive committe', 'executive committee'],
    classification: 'recognised_importable',
    populates: 'management_control',
    notes: 'Workbook spelling "Committe" is accepted.',
  },
  {
    canonicalName: '5 Staff List',
    aliases: ['5 staff list', 'staff list'],
    classification: 'recognised_importable',
    populates: 'management_control',
  },
  {
    canonicalName: 'Employment Equity',
    aliases: ['employment equity'],
    classification: 'informational_only',
    populates: 'informational',
  },
  {
    canonicalName: 'Skills Development',
    aliases: ['skills development'],
    classification: 'recognised_requires_confirmation',
    populates: 'skills_development',
  },
  {
    canonicalName: 'Category A',
    aliases: ['category a', 'cat a'],
    classification: 'recognised_importable',
    populates: 'skills_development',
  },
  {
    canonicalName: 'Category BCDE',
    aliases: ['category bcde', 'cat bcde'],
    classification: 'recognised_importable',
    populates: 'skills_development',
  },
  {
    canonicalName: 'Category BCD(Hcount)',
    aliases: ['category bcd(hcount)', 'category bcd (hcount)', 'category bcdhcount'],
    classification: 'recognised_importable',
    populates: 'skills_development',
  },
  {
    canonicalName: 'Learner summary',
    aliases: ['learner summary', 'interns & learners', 'interns and learners'],
    classification: 'recognised_importable',
    populates: 'skills_development',
  },
  {
    canonicalName: 'Category F&G',
    aliases: ['category f&g', 'category f and g', 'cat g', 'category fg'],
    classification: 'recognised_importable',
    populates: 'skills_development',
  },
  {
    canonicalName: '13 EMP201',
    aliases: ['13 emp201', 'emp201'],
    classification: 'recognised_importable',
    populates: 'financial',
  },
  {
    canonicalName: '7 TMPS',
    aliases: ['7 tmps', 'tmps'],
    classification: 'informational_only',
    populates: 'procurement_notice',
    notes: 'TMPS feeds Formal Procurement Assessments, not the generic workbook score.',
  },
  {
    canonicalName: 'Procurement Scorecard',
    aliases: ['procurement scorecard', 'procurement'],
    classification: 'ignored',
    populates: 'procurement_notice',
    notes: 'Procurement points must come from a completed Formal Procurement Assessment.',
  },
  {
    canonicalName: 'Imports',
    aliases: ['imports'],
    classification: 'informational_only',
    populates: 'informational',
  },
  {
    canonicalName: 'ED & SD',
    aliases: ['ed & sd', 'ed and sd'],
    classification: 'recognised_requires_confirmation',
    populates: 'enterprise_development',
    notes: 'Also feeds Supplier Development as a separate element.',
  },
  {
    canonicalName: 'SED',
    aliases: ['sed'],
    classification: 'recognised_importable',
    populates: 'socio_economic_development',
  },
  {
    canonicalName: 'Full Scorecard',
    aliases: ['full scorecard'],
    classification: 'ignored',
    populates: 'none',
    notes: 'Workbook score and level are never trusted.',
  },
  {
    canonicalName: 'NPAT Calculation',
    aliases: ['npat calculation', 'npat'],
    classification: 'recognised_requires_confirmation',
    populates: 'financial',
  },
  {
    canonicalName: 'Yes Targets Calc',
    aliases: ['yes targets calc'],
    classification: 'informational_only',
    populates: 'informational',
  },
] as const

export function normalizeSheetLabel(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
}

export function matchExpectedSheet(sheetName: string): ExpectedSheetSpec | null {
  const normalized = normalizeSheetLabel(sheetName)
  for (const spec of EXPECTED_GENERIC_SHEETS) {
    if (spec.aliases.some((alias) => normalizeSheetLabel(alias) === normalized)) {
      return spec
    }
    // Tolerate minor punctuation differences such as BCD(Hcount)
    const compact = normalized.replace(/[^a-z0-9]/g, '')
    if (spec.aliases.some((alias) => normalizeSheetLabel(alias).replace(/[^a-z0-9]/g, '') === compact)) {
      return spec
    }
  }
  return null
}
