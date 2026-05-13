/**
 * Expected tabs on the Generic / legacy full scorecard calculator workbook.
 * Matching is case-insensitive; aliases cover common typos in templates.
 */

export type ScorecardExpectedSheetDef = {
  /** Stable id for logs / tests */
  id: string
  /** Primary tab title */
  title: string
  /** Alternate titles seen in the wild */
  aliases?: string[]
}

export const FULL_SCORECARD_EXPECTED_SHEETS: ScorecardExpectedSheetDef[] = [
  { id: 'ownership', title: 'Ownership' },
  { id: 'management_control', title: 'Management Control' },
  { id: 'board_members', title: '3 Board Members' },
  {
    id: 'executive_committee',
    title: '4 Executive Committee',
    aliases: ['4 Executive Committe'],
  },
  { id: 'staff_list', title: '5 Staff List' },
  { id: 'employment_equity', title: 'Employment Equity' },
  { id: 'skills_development', title: 'Skills Development' },
  { id: 'cat_a', title: 'Cat A' },
  { id: 'interns_learners', title: 'Interns & Learners' },
  { id: 'cat_g', title: 'Cat G' },
  { id: 'learner_summary', title: 'Learner summary' },
  { id: 'emp201', title: '13 EMP201' },
  { id: 'tmps', title: 'TMPS' },
  { id: 'procurement', title: 'Procurement' },
  { id: 'ed_sd', title: 'ED & SD' },
  { id: 'sed', title: 'SED' },
  { id: 'full_scorecard', title: 'Full Scorecard' },
  { id: 'npat', title: 'NPAT' },
  { id: 'instructions', title: 'Instructions' },
]

/** Strong signal tabs — presence of all four strongly suggests a full calculator workbook */
export const FULL_SCORECARD_CORE_QUARTET_IDS = [
  'tmps',
  'procurement',
  'full_scorecard',
  'npat',
] as const

/** Minimum number of expected-tab hits (by id) to classify as full scorecard when quartet incomplete */
export const FULL_SCORECARD_MIN_TAB_HITS = 10

export const MAX_FULL_SCORECARD_UPLOAD_BYTES = 25 * 1024 * 1024
