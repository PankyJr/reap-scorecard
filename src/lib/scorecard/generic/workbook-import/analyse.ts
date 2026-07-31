import { createHash } from 'node:crypto'
import { parseWorkbookFromBuffer } from '@/lib/scorecard/full/parser'
import { extractCanonicalMetrics } from '@/lib/scorecard/full/extractors'
import { importSedBeneficiaryWorkbook } from '@/lib/scorecard/calculator/elements/socio-economic-development/import'
import { importManagementControlRegisterWorkbook } from '@/lib/scorecard/calculator/elements/management-control/import'
import {
  EXPECTED_GENERIC_SHEET_COUNT,
  EXPECTED_GENERIC_WORKBOOK_SHEETS,
  matchExpectedSheet,
  type SheetImportClass,
} from './sheets'
import type {
  ElementImportDecision,
  GenericWorkbookAnalysis,
  GenericWorkbookElementPreview,
  DetectedSheetSummary,
} from './types'
import { EMPTY_FINANCIAL_INPUTS, type FinancialInputs } from '../financial'
import { EMPTY_OWNERSHIP_INPUTS, type OwnershipInputs } from '../elements/ownership'
import { EMPTY_MANAGEMENT_CONTROL_INPUTS, type ManagementControlInputs } from '../elements/management-control'
import { EMPTY_SKILLS_DEVELOPMENT_INPUTS, type SkillsDevelopmentInputs } from '../elements/skills-development'
import type { ContributionRecord } from '../elements/contributions'

export const GENERIC_WORKBOOK_IMPORT_VERSION = 'generic-workbook-import-v1'
export const MAX_GENERIC_WORKBOOK_BYTES = 8 * 1024 * 1024

export function computeWorkbookChecksum(buffer: Buffer | Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex')
}

function metricMap(metrics: { metricKey: string; numericValue: number | null; validationState: string }[]) {
  const map = new Map<string, number | null>()
  for (const metric of metrics) {
    if (metric.validationState === 'error') continue
    map.set(metric.metricKey, metric.numericValue)
  }
  return map
}

function pct(map: Map<string, number | null>, key: string): number | null {
  const value = map.get(key)
  if (value == null || !Number.isFinite(value)) return null
  // Workbook often stores 0–100; engine wants 0–1.
  return value > 1 ? value / 100 : value
}

function money(map: Map<string, number | null>, key: string): number | null {
  const value = map.get(key)
  return value != null && Number.isFinite(value) ? value : null
}

/** Prefer verified NPAT Calculation values only — never SED/ED 1% target cells. */
function resolveActualNpat(map: Map<string, number | null>): number | null {
  const fromNpatSheet = money(map, 'npat.value')
  if (fromNpatSheet != null && fromNpatSheet > 1) return fromNpatSheet
  // Tiny positive values on the NPAT sheet are treated as formula defects, not profit.
  return null
}

function isBlackRace(race: string | null | undefined): boolean {
  const key = String(race ?? '')
    .trim()
    .toLowerCase()
  return key === 'african' || key === 'coloured' || key === 'colored' || key === 'indian'
}

function isFemale(gender: string | null | undefined): boolean {
  const key = String(gender ?? '')
    .trim()
    .toLowerCase()
  return key === 'female' || key === 'f'
}

/**
 * Build privacy-safe Management Control denominators from validated register rows.
 * Names and identity numbers never leave the importer preview rows.
 */
function aggregateManagementControlFromRegister(rows: {
  values: Record<string, string | number | null>
  validationStatus: string
}[]): ManagementControlInputs {
  const board = { total: 0, black: 0, blackWomen: 0 }
  const executiveDirectors = { total: 0, black: 0, blackWomen: 0 }
  const otherExecutiveManagement = { total: 0, black: 0, blackWomen: 0 }

  for (const row of rows) {
    if (row.validationStatus === 'rejected') continue
    const register = String(row.values.register ?? '').toLowerCase()
    const race = row.values.race != null ? String(row.values.race) : null
    const gender = row.values.gender != null ? String(row.values.gender) : null
    const role = String(row.values.roleCategory ?? '').toLowerCase()
    const black = isBlackRace(race)
    const blackWomen = black && isFemale(gender)

    const target =
      register === 'board'
        ? board
        : role.includes('executive director')
          ? executiveDirectors
          : register === 'executive_committee' || register.includes('executive')
            ? otherExecutiveManagement
            : null
    if (!target) continue
    target.total += 1
    if (black) target.black += 1
    if (blackWomen) target.blackWomen += 1
  }

  return {
    ...EMPTY_MANAGEMENT_CONTROL_INPUTS,
    board: board.total > 0 ? board : EMPTY_MANAGEMENT_CONTROL_INPUTS.board,
    executiveDirectors:
      executiveDirectors.total > 0
        ? executiveDirectors
        : EMPTY_MANAGEMENT_CONTROL_INPUTS.executiveDirectors,
    otherExecutiveManagement:
      otherExecutiveManagement.total > 0
        ? otherExecutiveManagement
        : EMPTY_MANAGEMENT_CONTROL_INPUTS.otherExecutiveManagement,
  }
}

function classifyDetected(
  classification: SheetImportClass,
  parseWarningCount: number,
  excelErrorCount: number,
): SheetImportClass {
  if (excelErrorCount > 0 || parseWarningCount > 0) {
    if (classification === 'ignored' || classification === 'informational_only') return classification
    return 'contains_warnings'
  }
  return classification
}

export function analyseGenericWorkbook(args: {
  filename: string
  buffer: Buffer
  fileSize?: number
}): GenericWorkbookAnalysis {
  const fileSize = args.fileSize ?? args.buffer.length
  const checksum = computeWorkbookChecksum(args.buffer)
  const parsed = parseWorkbookFromBuffer({
    filename: args.filename,
    buffer: args.buffer,
    fileSize,
  })
  const { metrics, issues } = extractCanonicalMetrics(parsed)
  const map = metricMap(
    metrics.map((m) => ({
      metricKey: m.metricKey,
      numericValue: m.numericValue,
      validationState: m.validationState,
    })),
  )

  const detectedSheets: DetectedSheetSummary[] = parsed.sheets.map((sheet) => {
    const spec = matchExpectedSheet(sheet.sheetName)
    const excelErrorCount = Object.values(sheet.cells).filter((cell) =>
      String(cell.rawValue ?? '').toString().startsWith('#'),
    ).length
    const classification = spec
      ? classifyDetected(spec.classification, sheet.parseWarnings.length, excelErrorCount)
      : ('unsupported' as const)
    return {
      sheetName: sheet.sheetName,
      sheetKey: sheet.sheetKey,
      expectedKey: spec?.key ?? null,
      canonicalName: spec?.canonicalName ?? null,
      classification,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      parseWarningCount: sheet.parseWarnings.length,
      excelErrorCount,
      elementKeys: spec?.elementKeys ? [...spec.elementKeys] : [],
      notes: spec?.notes ?? 'Unrecognised sheet. It will not be imported.',
    }
  })

  const matchedKeys = new Set(detectedSheets.map((s) => s.expectedKey).filter(Boolean))
  const missingExpected = EXPECTED_GENERIC_WORKBOOK_SHEETS.filter((spec) => !matchedKeys.has(spec.key)).map(
    (spec) => spec.canonicalName,
  )

  const sedPreview = importSedBeneficiaryWorkbook({ workbookBuffer: args.buffer })
  const mcPreview = importManagementControlRegisterWorkbook({ workbookBuffer: args.buffer })

  const ownership: OwnershipInputs = {
    ...EMPTY_OWNERSHIP_INPUTS,
    blackVotingRightsPercentage: pct(map, 'ownership.voting_rights.black_people.percentage'),
    blackWomenVotingRightsPercentage: pct(map, 'ownership.voting_rights.black_women.percentage'),
    blackEconomicInterestPercentage: pct(map, 'ownership.economic_interest.black_people.percentage'),
    blackWomenEconomicInterestPercentage: pct(map, 'ownership.economic_interest.black_women.percentage'),
    designatedGroupsEconomicInterestPercentage: pct(
      map,
      'ownership.economic_interest.designated_groups.percentage',
    ),
    newEntrantsEconomicInterestPercentage: pct(map, 'ownership.economic_interest.new_entrants.percentage'),
    netValuePercentage: pct(map, 'ownership.net_value.percentage'),
    evidenceSource: `Full Generic Workbook · ${args.filename}`,
    practitionerNotes:
      'Imported from Ownership sheet as verified result values. Transaction/debt/graduation mechanism is not modelled from the workbook.',
    measurementDate: null,
  }

  const financial: FinancialInputs = {
    ...EMPTY_FINANCIAL_INPUTS,
    actualNpat: resolveActualNpat(map),
    leviableAmount: money(map, 'skills_development.leviable_amount'),
    revenue: null,
    industryNpatMargin: null,
    industryProfitNormSource: null,
    industryProfitNormPeriod: null,
  }

  const skillsSpend = money(map, 'skills_development.total_training_spend')
  const skills: SkillsDevelopmentInputs = {
    ...EMPTY_SKILLS_DEVELOPMENT_INPUTS,
    leviableAmount: financial.leviableAmount,
    totalSkillsDevelopmentSpend: skillsSpend,
    // Demographic spend and eligibility gates remain confirmation items after import.
  }

  const managementControl = aggregateManagementControlFromRegister(mcPreview.rows)

  const sedRecords: ContributionRecord[] = sedPreview.rows
    .filter((row) => row.validationStatus !== 'rejected')
    .map((row, index) => ({
      id: `sed-import-${index + 1}`,
      beneficiaryName: String(row.values.beneficiary ?? 'Unnamed beneficiary'),
      beneficiaryClassification: 'individual',
      beneficiaryBlackOwnershipPercentage: null,
      wasEmeOrQseAtFirstAssistance: null,
      yearsSinceFirstAssistance: null,
      contributionType: 'grant_contribution',
      actualValue: typeof row.values.recognisedAmount === 'number' ? row.values.recognisedAmount : null,
      suppliedBenefitFactor: null,
      contributionDate: null,
      evidenceProvided: false,
      notes: typeof row.values.notes === 'string' ? row.values.notes : null,
      blackBeneficiaryPercentage: 1,
      claimedRaw: row.values.claimed != null ? String(row.values.claimed) : null,
      manualOverride: null,
      sourceSheet: sedPreview.sheetName,
      sourceRowNumber: row.sourceRowNumber,
    }))

  const edAmount = money(map, 'enterprise_development.annual_value.amount')
  const sdAmount = money(map, 'supplier_development.annual_value.amount')

  const edRecords: ContributionRecord[] =
    edAmount != null && edAmount > 0
      ? [
          {
            id: 'ed-import-1',
            beneficiaryName: 'Imported ED total (workbook summary)',
            beneficiaryClassification: null,
            beneficiaryBlackOwnershipPercentage: null,
            wasEmeOrQseAtFirstAssistance: null,
            yearsSinceFirstAssistance: null,
            contributionType: 'grant_contribution',
            actualValue: edAmount,
            suppliedBenefitFactor: null,
            contributionDate: null,
            evidenceProvided: false,
            notes: 'Summary amount from ED & SD. Beneficiary eligibility requires confirmation.',
            blackBeneficiaryPercentage: null,
            claimedRaw: null,
            manualOverride: null,
            sourceSheet: 'ED & SD',
            sourceRowNumber: null,
          },
        ]
      : []

  const sdRecords: ContributionRecord[] =
    sdAmount != null && sdAmount > 0
      ? [
          {
            id: 'sd-import-1',
            beneficiaryName: 'Imported Supplier Development total (workbook summary)',
            beneficiaryClassification: null,
            beneficiaryBlackOwnershipPercentage: null,
            wasEmeOrQseAtFirstAssistance: null,
            yearsSinceFirstAssistance: null,
            contributionType: 'grant_contribution',
            actualValue: sdAmount,
            suppliedBenefitFactor: null,
            contributionDate: null,
            evidenceProvided: false,
            notes: 'Summary amount from ED & SD. Supplier eligibility requires confirmation.',
            blackBeneficiaryPercentage: null,
            claimedRaw: null,
            manualOverride: null,
            sourceSheet: 'ED & SD',
            sourceRowNumber: null,
          },
        ]
      : []

  const workbookDefects = [
    ...issues.map((issue) => issue.message),
    'Workbook Full Scorecard totals and B-BBEE level are ignored.',
    'Workbook Preferential Procurement scores are ignored — attach a Formal Procurement Assessment.',
    'Broken NPAT Calculation result formula is not trusted; applicable NPAT requires confirmation.',
    'Cached Excel errors (#DIV/0!, #REF!, …) are treated as inert and never scored.',
  ]

  const demonstrationWarnings: string[] = []
  if (/demo|sample|example|acme|test/i.test(args.filename)) {
    demonstrationWarnings.push('Filename suggests demonstration data. Confirm before importing as client data.')
  }

  const elements: GenericWorkbookElementPreview[] = [
    {
      elementKey: 'financial',
      displayName: 'Financial inputs',
      willPopulate: financial.actualNpat != null || financial.leviableAmount != null,
      validRows: financial.actualNpat != null || financial.leviableAmount != null ? 1 : 0,
      warningRows: 1,
      rejectedRows: 0,
      missingInputs: [
        financial.revenue == null ? 'Revenue' : null,
        financial.actualNpat == null ? 'Actual NPAT' : null,
        financial.leviableAmount == null ? 'Leviable amount' : null,
        'Industry profit norm (for deemed NPAT)',
      ].filter(Boolean) as string[],
      warnings: [
        'Actual and deemed NPAT are not auto-selected from the broken workbook result formula.',
        'Authorised confirmation may be required for the applicable NPAT denominator.',
      ],
      proposedFinancial: financial,
      summary: {
        actualNpat: financial.actualNpat,
        leviableAmount: financial.leviableAmount,
        deemedNpat: null,
        applicableDenominatorCandidate: financial.actualNpat,
      },
    },
    {
      elementKey: 'ownership',
      displayName: 'Ownership',
      willPopulate: ownership.netValuePercentage != null || ownership.blackVotingRightsPercentage != null,
      validRows: [
        ownership.blackVotingRightsPercentage,
        ownership.blackEconomicInterestPercentage,
        ownership.netValuePercentage,
      ].filter((v) => v != null).length,
      warningRows: 0,
      rejectedRows: 0,
      missingInputs: [
        ownership.measurementDate == null ? 'Measurement date' : null,
        ownership.netValuePercentage == null ? 'Net Value' : null,
      ].filter(Boolean) as string[],
      warnings: ['Ownership transaction, acquisition debt and graduation are not modelled from the workbook.'],
      proposedOwnership: ownership,
      summary: {
        blackVotingRightsPercentage: ownership.blackVotingRightsPercentage,
        blackWomenVotingRightsPercentage: ownership.blackWomenVotingRightsPercentage,
        blackEconomicInterestPercentage: ownership.blackEconomicInterestPercentage,
        blackWomenEconomicInterestPercentage: ownership.blackWomenEconomicInterestPercentage,
        designatedGroupsEconomicInterestPercentage: ownership.designatedGroupsEconomicInterestPercentage,
        newEntrantsEconomicInterestPercentage: ownership.newEntrantsEconomicInterestPercentage,
        netValuePercentage: ownership.netValuePercentage,
      },
    },
    {
      elementKey: 'management_control',
      displayName: 'Management Control',
      willPopulate:
        (managementControl.board.total ?? 0) > 0 ||
        (managementControl.executiveDirectors.total ?? 0) > 0 ||
        (managementControl.otherExecutiveManagement.total ?? 0) > 0,
      validRows: mcPreview.validRowCount,
      warningRows: mcPreview.warningCount,
      rejectedRows: mcPreview.rejectedRowCount,
      missingInputs: [
        'EAP target set',
        'Senior / middle / junior occupational-level denominators',
        'Staff-list occupational aggregates where required',
      ],
      warnings: [
        ...mcPreview.notes,
        'Names and identity numbers are not exposed in the generic workspace.',
        'An active EAP target set is required before Management Control can score.',
      ],
      proposedManagementControl: managementControl,
      managementControlImport: {
        sheetName: mcPreview.sheetName,
        validRowCount: mcPreview.validRowCount,
        warningCount: mcPreview.warningCount,
        rejectedRowCount: mcPreview.rejectedRowCount,
        importVersion: mcPreview.importVersion ?? 'management-control-register-import-v1',
      },
      summary: {
        boardMemberCount: managementControl.board.total,
        executiveDirectorCount: managementControl.executiveDirectors.total,
        otherExecutiveCount: managementControl.otherExecutiveManagement.total,
        boardBlack: managementControl.board.black,
        boardBlackWomen: managementControl.board.blackWomen,
        validRows: mcPreview.validRowCount,
        warningRows: mcPreview.warningCount,
        rejectedRows: mcPreview.rejectedRowCount,
      },
    },
    {
      elementKey: 'skills_development',
      displayName: 'Skills Development',
      willPopulate: skills.leviableAmount != null || skills.totalSkillsDevelopmentSpend != null,
      validRows: skills.totalSkillsDevelopmentSpend != null || skills.leviableAmount != null ? 1 : 0,
      warningRows: 1,
      rejectedRows: 0,
      missingInputs: [
        'SETA WSP/ATR confirmation',
        'Pivotal report confirmation',
        'Absorption confirmation',
        'EAP demographic spend disaggregation',
      ],
      warnings: [
        'Skills eligibility gates remain Confirmation required after import.',
        `Leviable amount candidate: ${skills.leviableAmount ?? '—'}`,
        `Total training spend candidate: ${skills.totalSkillsDevelopmentSpend ?? '—'}`,
      ],
      proposedSkills: skills,
      summary: {
        leviableAmount: skills.leviableAmount,
        totalTrainingSpend: skills.totalSkillsDevelopmentSpend,
        bursaries: null,
        disabilityExpenditure: null,
        learnerHeadcounts: null,
        absorptionInputs: null,
        eligibilityConfirmations: 'Confirmation required',
      },
    },
    {
      elementKey: 'enterprise_development',
      displayName: 'Enterprise Development',
      willPopulate: edRecords.length > 0,
      validRows: edRecords.length,
      warningRows: edRecords.length > 0 ? 1 : 0,
      rejectedRows: 0,
      missingInputs: edRecords.length
        ? ['Beneficiary classification', 'Black ownership %', 'Evidence']
        : [
            'ED contribution line items (ED & SD sheet appears to be a scorecard summary, not a contribution register)',
          ],
      warnings: edRecords.length
        ? ['Workbook ED summary imported as a single contribution requiring eligibility confirmation.']
        : [
            'No ED contribution amounts were extracted. Enter ED contributions manually or supply a contribution register.',
          ],
      proposedContributions: edRecords,
      summary: { contributionCount: edRecords.length, actualValue: edAmount, recognisedValue: null },
    },
    {
      elementKey: 'supplier_development',
      displayName: 'Supplier Development',
      willPopulate: sdRecords.length > 0,
      validRows: sdRecords.length,
      warningRows: sdRecords.length > 0 ? 1 : 0,
      rejectedRows: 0,
      missingInputs: sdRecords.length
        ? ['Supplier eligibility', 'Black ownership %', 'Evidence']
        : [
            'Supplier Development contribution line items (kept separate from Skills Development; use key supplier_development)',
          ],
      warnings: sdRecords.length
        ? [
            'Supplier Development is kept separate from Skills Development.',
            'Summary amount requires supplier eligibility confirmation.',
          ]
        : [
            'No Supplier Development contribution amounts were extracted from ED & SD.',
            'Supplier Development remains separate from Skills Development (internal key: supplier_development).',
          ],
      proposedContributions: sdRecords,
      summary: { contributionCount: sdRecords.length, actualValue: sdAmount, recognisedValue: null },
    },
    {
      elementKey: 'socio_economic_development',
      displayName: 'Socio-Economic Development',
      willPopulate: sedRecords.length > 0,
      validRows: sedPreview.validRowCount,
      warningRows: sedPreview.warningCount,
      rejectedRows: sedPreview.rejectedRowCount,
      missingInputs:
        sedRecords.length === 0
          ? [
              'SED beneficiary register rows (Generic SED sheet is often a scorecard summary; Book1-style beneficiary rows are required for line-item import)',
            ]
          : [],
      warnings: [
        ...sedPreview.notes,
        'Claimed column is preserved as raw optional input and never scored.',
        `Platform recognised total: R${sedPreview.platformTotalRecognised ?? 0}`,
        ...(sedRecords.length === 0
          ? ['No SED beneficiary rows imported from this workbook — enter SED manually or use a beneficiary register.']
          : []),
      ],
      proposedContributions: sedRecords,
      sedImport: {
        sheetName: sedPreview.sheetName,
        validRowCount: sedPreview.validRowCount,
        warningCount: sedPreview.warningCount,
        rejectedRowCount: sedPreview.rejectedRowCount,
        platformTotalRecognised: sedPreview.platformTotalRecognised,
        workbookDisplayedTotal: sedPreview.workbookDisplayedTotal,
      },
      summary: {
        contributionCount: sedRecords.length,
        platformTotalRecognised: sedPreview.platformTotalRecognised,
        claimedRawPreserved: true,
      },
    },
    {
      elementKey: 'preferential_procurement',
      displayName: 'Preferential Procurement',
      willPopulate: false,
      validRows: 0,
      warningRows: 0,
      rejectedRows: 0,
      missingInputs: ['Completed Formal Procurement Assessment'],
      warnings: [
        'Procurement data was detected in the workbook, but procurement must be sourced from a completed Formal Procurement Assessment.',
        'Workbook procurement points, TMPS and supplier demonstration rows are not imported.',
      ],
      summary: { imported: false },
    },
  ]

  return {
    importVersion: GENERIC_WORKBOOK_IMPORT_VERSION,
    filename: args.filename,
    fileSize,
    checksumSha256: checksum,
    analysedAt: new Date().toISOString(),
    expectedSheetCount: EXPECTED_GENERIC_SHEET_COUNT,
    detectedSheetCount: detectedSheets.length,
    detectedSheets,
    missingExpectedSheets: missingExpected,
    recognisedSheetCount: detectedSheets.filter((s) => s.expectedKey).length,
    unsupportedSheetCount: detectedSheets.filter((s) => s.classification === 'unsupported').length,
    elements,
    workbookDefects,
    demonstrationWarnings,
    metricsExtracted: metrics.length,
    extractionIssueCount: issues.length,
    defaultDecisions: defaultImportDecisions(elements),
  }
}

export function defaultImportDecisions(
  elements: GenericWorkbookElementPreview[],
): Record<string, ElementImportDecision> {
  const decisions: Record<string, ElementImportDecision> = {}
  for (const element of elements) {
    if (element.elementKey === 'preferential_procurement') {
      decisions[element.elementKey] = 'skip'
      continue
    }
    decisions[element.elementKey] = element.willPopulate ? 'import' : 'skip'
  }
  return decisions
}

export function assertSafeWorkbookFile(args: { filename: string; size: number }) {
  const lower = args.filename.toLowerCase()
  // .xls is not safely supported by the current OpenXML parser path.
  if (!lower.endsWith('.xlsx')) {
    throw new Error('Only .xlsx workbooks are accepted for the Generic Scorecard upload.')
  }
  if (args.size > MAX_GENERIC_WORKBOOK_BYTES) {
    throw new Error('Workbook exceeds the 8 MB limit.')
  }
}
