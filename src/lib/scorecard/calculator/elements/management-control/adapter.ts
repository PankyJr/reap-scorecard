import type {
  CalculationBreakdown,
  HeaderAliasMap,
  ScorecardElementAdapter,
} from '../../types'
import { MC_EAP_BAND_KEYS, MC_EAP_DEMOGRAPHIC_KEYS } from '../../eap/demographics'
import { importManagementControlRegisterWorkbook } from './import'

/**
 * Management Control adapter — data-driven path.
 * Scoring from workbook demographic %/target/points already exists in the full engine.
 * This calculator path supports privacy-safe Book2 register import and EAP target
 * binding. It deliberately does not calculate points from person-register rows.
 */

const MC_HEADER_ALIASES: HeaderAliasMap = {
  personName: ['board member name and surname', 'name and surname'],
  roleCategory: [
    'executive/ non executive/ independent non executive',
    'executive director / executive manager',
  ],
  gender: ['gender'],
  race: ['race'],
  nationality: ['nationality'],
  position: ['position', 'position/ designation'],
}

export const managementControlAdapter: ScorecardElementAdapter = {
  elementKey: 'management_control',
  elementName: 'Management Control',
  shortName: 'MC',
  acceptedSheetNames: [
    'Management Control',
    '3 Board Members',
    '4 Executive Committe',
    'Employment Equity',
  ],
  headerAliases: MC_HEADER_ALIASES,
  ruleVersion: 'management-control-scaffold-v0',
  scoringReady: false,
  help: {
    summary:
      'Upload the confirmed Board and Executive Committee register workbook. The importer validates demographic records without storing names or identity numbers. Annual EAP percentages are never hardcoded.',
    uploadHints: [
      'Confirmed register sheets: 3 Board Members and 4 Executive Committe (trailing spaces are accepted).',
      'Names, identity numbers, exact positions and resignation dates are excluded from the persisted preview.',
      'The importer validates register structure and demographic fields only; it does not calculate points.',
    ],
    outstandingBusinessRules: [
      'Verified Management Control calculation rules are still required before points can be produced.',
      'Book2 confirms Board and Executive Committee person-register layouts, but does not supply verified target, weighting or scoring rows.',
      'Management Control scoring remains disabled in the modular calculator; use the verified full-scorecard engine path where applicable.',
      `Verified bands: ${MC_EAP_BAND_KEYS.join(', ')}.`,
      `Verified demographics: ${MC_EAP_DEMOGRAPHIC_KEYS.join(', ')}.`,
    ],
  },
  parseWorkbook: ({ workbookBuffer }) =>
    importManagementControlRegisterWorkbook({ workbookBuffer }),
  calculate: (): CalculationBreakdown => ({
    formulaName: 'management_control_scaffold',
    ruleVersion: 'management-control-scaffold-v0',
    inputsUsed: {},
    target: null,
    actual: null,
    pointsAvailable: null,
    pointsAchieved: null,
    caps: {},
    thresholds: {},
    exclusions: [],
    warnings: [
      'Management Control points are not fabricated in the modular calculator without verified mapped metrics. Use EAP target sets for editable targets; score via full engine when uploading standard MC sheets.',
    ],
    explanation:
      'MC architecture, EAP versioning, and upload scaffolding are in place. Element scoringReady=false until a dedicated verified MC calculator mapping ships.',
  }),
}
