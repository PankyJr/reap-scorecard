/**
 * Expected Generic Scorecard Calculator worksheets and import classifications.
 * Sheet matching is whitespace- and misspelling-tolerant.
 */

export type SheetImportClass =
  | 'recognised_importable'
  | 'recognised_requires_confirmation'
  | 'informational_only'
  | 'ignored'
  | 'contains_warnings'
  | 'unsupported'

export type ExpectedSheetSpec = {
  key: string
  canonicalName: string
  aliases: readonly string[]
  classification: SheetImportClass
  elementKeys: readonly string[]
  notes: string
}

function n(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export const EXPECTED_GENERIC_WORKBOOK_SHEETS: readonly ExpectedSheetSpec[] = [
  {
    key: 'summary',
    canonicalName: 'Summary',
    aliases: ['summary'],
    classification: 'informational_only',
    elementKeys: [],
    notes: 'Workbook summary / display totals. Not used for scoring.',
  },
  {
    key: 'ownership',
    canonicalName: 'Ownership',
    aliases: ['ownership'],
    classification: 'recognised_importable',
    elementKeys: ['ownership'],
    notes: 'Verified ownership result values.',
  },
  {
    key: 'management_control',
    canonicalName: 'Management Control',
    aliases: ['management control'],
    classification: 'recognised_requires_confirmation',
    elementKeys: ['management_control'],
    notes: 'Scorecard display; registers are the preferred source.',
  },
  {
    key: 'board_members',
    canonicalName: '3 Board Members',
    aliases: ['3 board members', 'board members'],
    classification: 'recognised_importable',
    elementKeys: ['management_control'],
    notes: 'Board register for Management Control.',
  },
  {
    key: 'executive_committee',
    canonicalName: '4 Executive Committe',
    aliases: ['4 executive committe', '4 executive committee', 'executive committe', 'executive committee'],
    classification: 'recognised_importable',
    elementKeys: ['management_control'],
    notes: 'Known misspelling "Committe" is accepted.',
  },
  {
    key: 'staff_list',
    canonicalName: '5 Staff List',
    aliases: ['5 staff list', 'staff list'],
    classification: 'recognised_importable',
    elementKeys: ['management_control', 'skills_development'],
    notes: 'Staff register; privacy-safe aggregates only.',
  },
  {
    key: 'employment_equity',
    canonicalName: 'Employment Equity',
    aliases: ['employment equity'],
    classification: 'recognised_requires_confirmation',
    elementKeys: ['management_control'],
    notes: 'EE demographics; EAP target set still required.',
  },
  {
    key: 'skills_development',
    canonicalName: 'Skills Development',
    aliases: ['skills development'],
    classification: 'recognised_importable',
    elementKeys: ['skills_development'],
    notes: 'Skills scorecard inputs and spend summaries.',
  },
  {
    key: 'category_a',
    canonicalName: 'Category A',
    aliases: ['category a', 'cat a'],
    classification: 'recognised_importable',
    elementKeys: ['skills_development'],
    notes: 'Learning Programme Matrix Category A.',
  },
  {
    key: 'category_bcde',
    canonicalName: 'Category BCDE',
    aliases: ['category bcde', 'cat bcde'],
    classification: 'recognised_importable',
    elementKeys: ['skills_development'],
    notes: 'Learning Programme Matrix Categories B–E.',
  },
  {
    key: 'category_bcd_hcount',
    canonicalName: 'Category BCD(Hcount)',
    aliases: ['category bcd(hcount)', 'category bcd hcount', 'category bcd(h count)'],
    classification: 'recognised_importable',
    elementKeys: ['skills_development'],
    notes: 'Learner headcount sheet.',
  },
  {
    key: 'learner_summary',
    canonicalName: 'Learner summary',
    aliases: ['learner summary', 'learners summary', 'interns & learners', 'interns and learners'],
    classification: 'recognised_importable',
    elementKeys: ['skills_development'],
    notes: 'Absorption and learner totals.',
  },
  {
    key: 'category_fg',
    canonicalName: 'Category F&G',
    aliases: ['category f&g', 'category f & g', 'cat g', 'category fg'],
    classification: 'recognised_importable',
    elementKeys: ['skills_development'],
    notes: 'Category F and G expenditure (capped in engine).',
  },
  {
    key: 'emp201',
    canonicalName: '13 EMP201',
    aliases: ['13 emp201', 'emp201'],
    classification: 'recognised_requires_confirmation',
    elementKeys: ['skills_development', 'financial'],
    notes: 'Payroll / leviable amount source.',
  },
  {
    key: 'tmps',
    canonicalName: '7 TMPS',
    aliases: ['7 tmps', 'tmps'],
    classification: 'informational_only',
    elementKeys: ['preferential_procurement'],
    notes: 'TMPS from the workbook is informational. Formal Procurement Assessment is required.',
  },
  {
    key: 'procurement_scorecard',
    canonicalName: 'Procurement Scorecard',
    aliases: ['procurement scorecard', 'procurement', 'preferential procurement'],
    classification: 'ignored',
    elementKeys: ['preferential_procurement'],
    notes: 'Workbook procurement scores are never imported. Attach a Formal Procurement Assessment.',
  },
  {
    key: 'imports',
    canonicalName: 'Imports',
    aliases: ['imports'],
    classification: 'informational_only',
    elementKeys: [],
    notes: 'Import helper sheet.',
  },
  {
    key: 'ed_sd',
    canonicalName: 'ED & SD',
    aliases: ['ed & sd', 'ed&sd', 'ed and sd'],
    classification: 'recognised_importable',
    elementKeys: ['enterprise_development', 'supplier_development'],
    notes: 'Enterprise Development and Supplier Development contributions.',
  },
  {
    key: 'sed',
    canonicalName: 'SED',
    aliases: ['sed', 'socio-economic development', 'socio economic development'],
    classification: 'recognised_importable',
    elementKeys: ['socio_economic_development'],
    notes: 'SED beneficiary line items.',
  },
  {
    key: 'full_scorecard',
    canonicalName: 'Full Scorecard',
    aliases: ['full scorecard'],
    classification: 'ignored',
    elementKeys: [],
    notes: 'Workbook totals and levels are ignored. The generic engine recalculates.',
  },
  {
    key: 'npat_calculation',
    canonicalName: 'NPAT Calculation',
    aliases: ['npat calculation', 'npat'],
    classification: 'recognised_requires_confirmation',
    elementKeys: ['financial'],
    notes: 'Actual / deemed NPAT candidates. Broken workbook result formula is not trusted.',
  },
  {
    key: 'yes_targets_calc',
    canonicalName: 'Yes Targets Calc',
    aliases: ['yes targets calc', 'yes targets', 'eap targets'],
    classification: 'informational_only',
    elementKeys: ['management_control', 'skills_development'],
    notes: 'Hardcoded EAP values are informational. Use a versioned EAP target set.',
  },
]

export function matchExpectedSheet(sheetName: string): ExpectedSheetSpec | null {
  const normalized = n(sheetName)
  for (const spec of EXPECTED_GENERIC_WORKBOOK_SHEETS) {
    if (spec.aliases.some((alias) => n(alias) === normalized)) return spec
    if (n(spec.canonicalName) === normalized) return spec
  }
  // Soft contains for numbered prefixes / trailing spaces already normalised
  for (const spec of EXPECTED_GENERIC_WORKBOOK_SHEETS) {
    if (spec.aliases.some((alias) => normalized.includes(n(alias)) || n(alias).includes(normalized))) {
      if (normalized.length >= 3) return spec
    }
  }
  return null
}

export const EXPECTED_GENERIC_SHEET_COUNT = EXPECTED_GENERIC_WORKBOOK_SHEETS.length
