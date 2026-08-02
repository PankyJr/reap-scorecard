import { createHash } from 'node:crypto'
import { parseWorkbookFromBuffer } from '@/lib/scorecard/full/parser'
import { extractOwnershipSheetMetrics } from '@/lib/scorecard/full/extractors/ownership-sheet'
import { extractNpatMetrics } from '@/lib/scorecard/full/extractors/npat'
import { extractSkillsDevelopmentSheetMetrics } from '@/lib/scorecard/full/extractors/skills-development-sheets'
import { extractEnterpriseDevelopmentSheetMetrics } from '@/lib/scorecard/full/extractors/enterprise-development-sheet'
import { extractSupplierDevelopmentSheetMetrics } from '@/lib/scorecard/full/extractors/supplier-development-sheet'
import { importManagementControlRegisterWorkbook } from '@/lib/scorecard/calculator/elements/management-control/import'
import {
  importSedBeneficiaryWorkbook,
  sumValidRecognisedAmount,
} from '@/lib/scorecard/calculator/elements/socio-economic-development/import'
import {
  EMPTY_FINANCIAL_INPUTS,
  resolveNpatDenominator,
  type FinancialInputs,
} from '../financial'
import { EMPTY_OWNERSHIP_INPUTS, type OwnershipInputs } from '../elements/ownership'
import {
  EMPTY_MANAGEMENT_CONTROL_INPUTS,
  type ManagementControlInputs,
} from '../elements/management-control'
import {
  EMPTY_SKILLS_DEVELOPMENT_INPUTS,
  type SkillsDevelopmentInputs,
} from '../elements/skills-development'
import type { ContributionRecord } from '../elements/contributions'
import { typed } from '../ux/display-values'
import {
  EXPECTED_GENERIC_SHEETS,
  GENERIC_WORKBOOK_IMPORT_VERSION,
  matchExpectedSheet,
} from './sheet-catalog'
import type {
  DetectedSheetPreview,
  ElementImportPreview,
  GenericWorkbookAnalysis,
  ImportElementKey,
} from './types'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

function metricMap(metrics: { metricKey: string; numericValue: number | null; validationState?: string }[]) {
  const map = new Map<string, number | null>()
  for (const metric of metrics) {
    if (metric.validationState === 'error') continue
    map.set(metric.metricKey, metric.numericValue)
  }
  return map
}

function num(map: Map<string, number | null>, key: string): number | null {
  const value = map.get(key)
  return value == null || !Number.isFinite(value) ? null : value
}

function contributionFromAmount(args: {
  id: string
  element: 'enterprise_development' | 'supplier_development' | 'socio_economic_development'
  amount: number | null
  label: string
}): ContributionRecord[] {
  if (args.amount == null || args.amount <= 0) return []
  return [
    {
      id: args.id,
      beneficiaryName: `${args.label} (workbook aggregate)`,
      beneficiaryClassification: args.element === 'socio_economic_development' ? 'individual' : 'eme',
      beneficiaryBlackOwnershipPercentage: args.element === 'socio_economic_development' ? null : 1,
      wasEmeOrQseAtFirstAssistance: true,
      yearsSinceFirstAssistance: 1,
      contributionType: 'grant_contribution',
      actualValue: args.amount,
      suppliedBenefitFactor: null,
      contributionDate: null,
      evidenceProvided: false,
      notes: 'Imported as an aggregate workbook amount. Confirm benefit factor, eligibility and evidence.',
      blackBeneficiaryPercentage: args.element === 'socio_economic_development' ? 1 : null,
      manualOverride: null,
    },
  ]
}

function mapOwnership(map: Map<string, number | null>): OwnershipInputs {
  return {
    ...EMPTY_OWNERSHIP_INPUTS,
    blackVotingRightsPercentage: num(map, 'ownership.voting_rights.black_people.percentage'),
    blackWomenVotingRightsPercentage: num(map, 'ownership.voting_rights.black_women.percentage'),
    blackEconomicInterestPercentage: num(map, 'ownership.economic_interest.black_people.percentage'),
    blackWomenEconomicInterestPercentage: num(map, 'ownership.economic_interest.black_women.percentage'),
    designatedGroupsEconomicInterestPercentage: num(
      map,
      'ownership.economic_interest.designated_groups.percentage',
    ),
    newEntrantsEconomicInterestPercentage: num(
      map,
      'ownership.economic_interest.new_entrants.percentage',
    ),
    netValuePercentage: num(map, 'ownership.net_value.percentage'),
    evidenceSource: 'Full Generic Scorecard workbook — Ownership sheet',
    practitionerNotes: 'Imported verified result values. Transaction/debt modelling was not performed.',
  }
}

function mapFinancial(map: Map<string, number | null>): FinancialInputs {
  return {
    ...EMPTY_FINANCIAL_INPUTS,
    actualNpat: num(map, 'npat.value') ?? num(map, 'npat.target_base_value'),
    revenue: num(map, 'npat.revenue') ?? num(map, 'npat.turnover'),
    leviableAmount: num(map, 'skills_development.leviable_amount'),
    industryNpatMargin: num(map, 'npat.industry_margin') ?? num(map, 'npat.industry_npat_margin'),
  }
}

function mapSkills(map: Map<string, number | null>): SkillsDevelopmentInputs {
  const leviable = num(map, 'skills_development.leviable_amount')
  const totalSpend = num(map, 'skills_development.total_training_spend')
  const absorptionPct = num(map, 'skills_development.bonus.absorption.percentage')
  return {
    ...EMPTY_SKILLS_DEVELOPMENT_INPUTS,
    leviableAmount: leviable,
    totalSkillsDevelopmentSpend: totalSpend,
    // Percentages alone are not rand spend. Keep demographics empty until confirmed.
    generalTrainingSpendByDemographic: {},
    bursarySpendByDemographic: {},
    disabilityTrainingSpend: null,
    learnerHeadcountByDemographic: {},
    learnersAbsorbed: absorptionPct != null && absorptionPct > 0 ? 1 : null,
    learnersCompleted: absorptionPct != null ? 1 : null,
    wspAtrSetaApproved: null,
    pivotalReportSubmitted: null,
    prioritySkillsProgrammeImplemented: null,
    trainingRegisterMaintained: null,
  }
}

function privacySafeMcSnapshot(preview: ReturnType<typeof importManagementControlRegisterWorkbook>) {
  return {
    sheetName: preview.sheetName,
    validRowCount: preview.validRowCount,
    warningCount: preview.warningCount,
    rejectedRowCount: preview.rejectedRowCount,
    notes: preview.notes,
    importVersion: preview.importVersion,
    // Drop raw personal values; keep only validation status counts by sheet.
    rows: preview.rows.map((row) => ({
      sourceSheet: row.sourceSheet,
      sourceRowNumber: row.sourceRowNumber,
      validationStatus: row.validationStatus,
      validationMessages: row.validationMessages,
      register: row.values.register ?? null,
      roleCategory: row.values.roleCategory ?? null,
      race: row.values.race ?? null,
      gender: row.values.gender ?? null,
      nationality: row.values.nationality ?? null,
    })),
  }
}

/**
 * Analyse a Generic Scorecard Calculator workbook without writing assessment data.
 */
export function analyseGenericScorecardWorkbook(args: {
  filename: string
  buffer: Buffer
  fileSize?: number
}): GenericWorkbookAnalysis {
  const fileSize = args.fileSize ?? args.buffer.byteLength
  if (fileSize > MAX_UPLOAD_BYTES) {
    throw new Error(`Workbook exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit.`)
  }
  const lower = args.filename.toLowerCase()
  if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
    throw new Error('Only .xlsx (and safely supported .xls) workbooks are accepted.')
  }

  const checksumSha256 = createHash('sha256').update(args.buffer).digest('hex')
  const parsed = parseWorkbookFromBuffer({
    filename: args.filename,
    buffer: args.buffer,
    fileSize,
  })

  const sheets: DetectedSheetPreview[] = parsed.sheets.map((sheet) => {
    const matched = matchExpectedSheet(sheet.sheetName)
    const excelErrorCount = Object.values(sheet.cells).filter((cell) =>
      String(cell.rawValue ?? '').startsWith('#'),
    ).length
    return {
      detectedName: sheet.sheetName,
      canonicalName: matched?.canonicalName ?? null,
      classification: matched?.classification ?? 'unsupported',
      populates: matched?.populates ?? 'none',
      notes: matched?.notes ?? null,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      warningCount: sheet.parseWarnings.length,
      excelErrorCount,
    }
  })

  const unsupportedSheets = sheets
    .filter((sheet) => sheet.classification === 'unsupported')
    .map((sheet) => sheet.detectedName)

  const workbookDefects: string[] = [
    'Workbook B-BBEE level and total score are ignored.',
    'Cached Excel errors (#DIV/0!, #REF!, …) are never used as numeric inputs.',
    'Procurement Scorecard points are not imported — attach a Formal Procurement Assessment.',
  ]
  const totalExcelErrors = sheets.reduce((sum, sheet) => sum + sheet.excelErrorCount, 0)
  if (totalExcelErrors > 0) {
    workbookDefects.push(`${totalExcelErrors} cached Excel error cell(s) detected across sheets.`)
  }

  const ownershipExtraction = extractOwnershipSheetMetrics(parsed)
  const npatExtraction = extractNpatMetrics(parsed)
  const skillsExtraction = extractSkillsDevelopmentSheetMetrics(parsed)
  const edExtraction = extractEnterpriseDevelopmentSheetMetrics(parsed)
  const sdExtraction = extractSupplierDevelopmentSheetMetrics(parsed)

  const ownershipMap = metricMap(ownershipExtraction.metrics)
  const npatMap = metricMap(npatExtraction.metrics)
  const skillsMap = metricMap([
    ...skillsExtraction.metrics,
    // leviable often comes via skills or EMP201-linked keys
  ])
  const edMap = metricMap(edExtraction.metrics)
  const sdMap = metricMap(sdExtraction.metrics)

  const financial = mapFinancial(new Map([...npatMap, ...skillsMap]))
  const npatResolution = resolveNpatDenominator(financial)
  const ownership = mapOwnership(ownershipMap)
  const skillsDevelopment = mapSkills(skillsMap)

  let managementControlImportSnapshot: unknown | null = null
  let managementControl: ManagementControlInputs = { ...EMPTY_MANAGEMENT_CONTROL_INPUTS }
  const mcWarnings: string[] = []
  try {
    const mcPreview = importManagementControlRegisterWorkbook({ workbookBuffer: args.buffer })
    managementControlImportSnapshot = privacySafeMcSnapshot(mcPreview)
    managementControl = {
      ...EMPTY_MANAGEMENT_CONTROL_INPUTS,
      // Counts are summarised for review; detailed denominators still need EAP confirmation.
    }
    if (mcPreview.validRowCount === 0) {
      mcWarnings.push('Management Control registers were found but no valid rows were imported.')
    }
  } catch (error) {
    mcWarnings.push(
      error instanceof Error
        ? `Management Control register import: ${error.message}`
        : 'Management Control register import failed.',
    )
  }

  const enterpriseDevelopmentContributions = contributionFromAmount({
    id: 'workbook-ed-1',
    element: 'enterprise_development',
    amount: num(edMap, 'enterprise_development.annual_value.amount'),
    label: 'Enterprise Development',
  })
  const supplierDevelopmentContributions = contributionFromAmount({
    id: 'workbook-sd-1',
    element: 'supplier_development',
    amount: num(sdMap, 'supplier_development.annual_value.amount'),
    label: 'Supplier Development',
  })

  let sedImportSnapshot: unknown | null = null
  let socioEconomicDevelopmentContributions: ContributionRecord[] = []
  const sedWarnings: string[] = []
  try {
    const sedPreview = importSedBeneficiaryWorkbook({ workbookBuffer: args.buffer })
    sedImportSnapshot = {
      sheetName: sedPreview.sheetName,
      validRowCount: sedPreview.validRowCount,
      warningCount: sedPreview.warningCount,
      rejectedRowCount: sedPreview.rejectedRowCount,
      platformTotalRecognised: sedPreview.platformTotalRecognised,
      workbookDisplayedTotal: sedPreview.workbookDisplayedTotal,
      totalsMatch: sedPreview.totalsMatch,
      notes: sedPreview.notes,
      rows: sedPreview.rows.map((row) => ({
        sourceRowNumber: row.sourceRowNumber,
        validationStatus: row.validationStatus,
        validationMessages: row.validationMessages,
        beneficiary: row.values.beneficiary ?? null,
        claimed_raw: row.values.claimed ?? null,
        recognised: row.values.recognisedAmount ?? null,
        notes: row.values.notes ?? null,
      })),
    }
    const total = sumValidRecognisedAmount(sedPreview.rows)
    socioEconomicDevelopmentContributions = sedPreview.rows
      .filter((row) => row.validationStatus !== 'rejected')
      .map((row, index) => {
        const recognised = Number(row.values.recognisedAmount ?? 0)
        return {
          id: `workbook-sed-${index + 1}`,
          beneficiaryName: String(row.values.beneficiary ?? `SED beneficiary ${index + 1}`),
          beneficiaryClassification: 'individual' as const,
          beneficiaryBlackOwnershipPercentage: null,
          wasEmeOrQseAtFirstAssistance: null,
          yearsSinceFirstAssistance: null,
          contributionType: 'grant_contribution',
          actualValue: Number.isFinite(recognised) ? recognised : 0,
          suppliedBenefitFactor: null,
          contributionDate: null,
          evidenceProvided: false,
          notes: 'Imported from SED workbook sheet. Claimed column preserved separately where present.',
          blackBeneficiaryPercentage: 1,
          manualOverride: null,
        }
      })
    // Attach claimed_raw via notes when present for review (DB column set on persist).
    void sedPreview.rows
    if (total <= 0 && socioEconomicDevelopmentContributions.length === 0) {
      sedWarnings.push('SED sheet was detected but no recognised beneficiary amounts were found.')
    }
  } catch (error) {
    sedWarnings.push(
      error instanceof Error ? `SED import: ${error.message}` : 'SED import failed.',
    )
  }

  const demonstrationRowWarnings: string[] = []
  if (/generic.?scorecard.?calculator/i.test(args.filename)) {
    demonstrationRowWarnings.push(
      'Confirm that demonstration or sample workbook rows are excluded before treating this as client data.',
    )
  }

  const elements: ElementImportPreview[] = [
    {
      elementKey: 'financial',
      displayName: 'Financial inputs',
      willPopulate: financial.actualNpat != null || financial.revenue != null || financial.leviableAmount != null,
      validRowCount: [financial.actualNpat, financial.revenue, financial.leviableAmount].filter((v) => v != null)
        .length,
      warningCount: financial.actualNpat == null ? 1 : 0,
      rejectedRowCount: 0,
      missingInputs: [
        financial.actualNpat == null ? 'Actual NPAT' : null,
        financial.revenue == null ? 'Revenue' : null,
        financial.leviableAmount == null ? 'Leviable amount' : null,
        financial.industryNpatMargin == null ? 'Industry profit norm (for deemed NPAT)' : null,
      ].filter(Boolean) as string[],
      warnings: [
        'Actual and deemed NPAT are shown separately. Authorised confirmation is required when the denominator is disputed.',
        ...npatResolution.warnings,
      ],
      summary: [
        typed('revenue', 'Revenue', 'currency', financial.revenue),
        typed('actualNpat', 'Actual NPAT', 'currency', financial.actualNpat),
        typed('deemedNpat', 'Deemed NPAT', 'currency', npatResolution.deemedNpat),
        typed(
          'applicableDenominatorCandidate',
          'Applicable denominator candidate',
          'currency',
          npatResolution.applicableNpat,
        ),
        typed('leviableAmount', 'Leviable amount', 'currency', financial.leviableAmount),
        typed('totalEmployees', 'Total employees', 'count', financial.totalEmployees, 'employees'),
        typed('industryNpatMargin', 'Industry NPAT margin', 'percentage', financial.industryNpatMargin),
        typed('npatSelection', 'NPAT selection', 'text', npatResolution.selection),
      ],
      proposed: financial,
    },
    {
      elementKey: 'ownership',
      displayName: 'Ownership',
      willPopulate: ownership.netValuePercentage != null || ownership.blackVotingRightsPercentage != null,
      validRowCount: Object.values(ownership).filter((value) => typeof value === 'number').length,
      warningCount: ownershipExtraction.issues.length,
      rejectedRowCount: 0,
      missingInputs: ownership.netValuePercentage == null ? ['Net Value'] : [],
      warnings: ownershipExtraction.issues.map((issue) => issue.message).slice(0, 8),
      summary: [
        typed('blackVotingRightsPercentage', 'Black voting rights', 'percentage', ownership.blackVotingRightsPercentage),
        typed(
          'blackWomenVotingRightsPercentage',
          'Black women voting rights',
          'percentage',
          ownership.blackWomenVotingRightsPercentage,
        ),
        typed(
          'blackEconomicInterestPercentage',
          'Black economic interest',
          'percentage',
          ownership.blackEconomicInterestPercentage,
        ),
        typed(
          'blackWomenEconomicInterestPercentage',
          'Black women economic interest',
          'percentage',
          ownership.blackWomenEconomicInterestPercentage,
        ),
        typed(
          'designatedGroupsEconomicInterestPercentage',
          'Designated groups economic interest',
          'percentage',
          ownership.designatedGroupsEconomicInterestPercentage,
        ),
        typed(
          'newEntrantsEconomicInterestPercentage',
          'New entrants economic interest',
          'percentage',
          ownership.newEntrantsEconomicInterestPercentage,
        ),
        typed('netValuePercentage', 'Net value', 'percentage', ownership.netValuePercentage),
      ],
      proposed: ownership,
    },
    {
      elementKey: 'management_control',
      displayName: 'Management Control',
      willPopulate: managementControlImportSnapshot != null,
      validRowCount:
        (managementControlImportSnapshot as { validRowCount?: number } | null)?.validRowCount ?? 0,
      warningCount: mcWarnings.length,
      rejectedRowCount:
        (managementControlImportSnapshot as { rejectedRowCount?: number } | null)?.rejectedRowCount ?? 0,
      missingInputs: ['EAP target set (required before MC scoring)'],
      warnings: mcWarnings,
      summary: [
        typed(
          'validRows',
          'Valid board/employee rows',
          'count',
          (managementControlImportSnapshot as { validRowCount?: number } | null)?.validRowCount ?? 0,
          'rows',
        ),
        typed(
          'warningRows',
          'Rows with warnings',
          'count',
          (managementControlImportSnapshot as { warningCount?: number } | null)?.warningCount ?? 0,
          'rows',
        ),
      ],
      proposed: { inputs: managementControl, importSnapshot: managementControlImportSnapshot },
    },
    {
      elementKey: 'skills_development',
      displayName: 'Skills Development',
      willPopulate: Object.values(skillsDevelopment).some((value) => typeof value === 'number'),
      validRowCount: Object.values(skillsDevelopment).filter((value) => typeof value === 'number').length,
      warningCount: skillsExtraction.issues.length + 1,
      rejectedRowCount: 0,
      missingInputs: [
        'SETA WSP/ATR confirmation',
        'Pivotal report confirmation',
        'Priority skills programme confirmation',
        'Trainee register confirmation',
      ],
      warnings: [
        'Skills eligibility gates require confirmation before points are awarded.',
        ...skillsExtraction.issues.map((issue) => issue.message).slice(0, 6),
      ],
      summary: [
        typed('leviableAmount', 'Leviable amount', 'currency', skillsDevelopment.leviableAmount),
        typed(
          'totalSkillsDevelopmentSpend',
          'Total skills development spend',
          'currency',
          skillsDevelopment.totalSkillsDevelopmentSpend,
        ),
        typed('learnersAbsorbed', 'Learners absorbed', 'count', skillsDevelopment.learnersAbsorbed, 'learners'),
      ],
      proposed: skillsDevelopment,
    },
    {
      elementKey: 'enterprise_development',
      displayName: 'Enterprise Development',
      willPopulate: enterpriseDevelopmentContributions.length > 0,
      validRowCount: enterpriseDevelopmentContributions.length,
      warningCount: edExtraction.issues.length + (enterpriseDevelopmentContributions.length ? 1 : 0),
      rejectedRowCount: 0,
      missingInputs: enterpriseDevelopmentContributions.length
        ? ['Benefit-factor mapping confirmation', 'Beneficiary eligibility evidence']
        : ['ED contribution amount'],
      warnings: [
        'Aggregate ED amounts are imported as grant contributions pending benefit-factor confirmation.',
        ...edExtraction.issues.map((issue) => issue.message).slice(0, 5),
      ],
      summary: [
        typed(
          'contributionCount',
          'Contributions found',
          'count',
          enterpriseDevelopmentContributions.length,
          'contributions',
        ),
        typed(
          'actualValue',
          'First contribution value',
          'currency',
          enterpriseDevelopmentContributions[0]?.actualValue ?? null,
        ),
      ],
      proposed: enterpriseDevelopmentContributions,
    },
    {
      elementKey: 'supplier_development',
      displayName: 'Supplier Development',
      willPopulate: supplierDevelopmentContributions.length > 0,
      validRowCount: supplierDevelopmentContributions.length,
      warningCount: sdExtraction.issues.length + (supplierDevelopmentContributions.length ? 1 : 0),
      rejectedRowCount: 0,
      missingInputs: supplierDevelopmentContributions.length
        ? ['Supplier eligibility confirmation', 'Benefit-factor mapping confirmation']
        : ['Supplier Development contribution amount'],
      warnings: [
        'Supplier Development is kept separate from Skills Development.',
        ...sdExtraction.issues.map((issue) => issue.message).slice(0, 5),
      ],
      summary: [
        typed(
          'contributionCount',
          'Contributions found',
          'count',
          supplierDevelopmentContributions.length,
          'contributions',
        ),
        typed(
          'actualValue',
          'First contribution value',
          'currency',
          supplierDevelopmentContributions[0]?.actualValue ?? null,
        ),
      ],
      proposed: supplierDevelopmentContributions,
    },
    {
      elementKey: 'socio_economic_development',
      displayName: 'Socio-Economic Development',
      willPopulate: socioEconomicDevelopmentContributions.length > 0,
      validRowCount: socioEconomicDevelopmentContributions.length,
      warningCount: sedWarnings.length,
      rejectedRowCount: (sedImportSnapshot as { rejectedRowCount?: number } | null)?.rejectedRowCount ?? 0,
      missingInputs: socioEconomicDevelopmentContributions.length ? [] : ['SED beneficiary rows'],
      warnings: [
        ...sedWarnings,
        'Claimed column is preserved as raw optional input and never scored.',
      ],
      summary: [
        typed(
          'contributionCount',
          'Beneficiary contributions',
          'count',
          socioEconomicDevelopmentContributions.length,
          'contributions',
        ),
        typed(
          'platformTotalRecognised',
          'Recognised total',
          'currency',
          (sedImportSnapshot as { platformTotalRecognised?: number | null } | null)?.platformTotalRecognised ??
            null,
        ),
      ],
      proposed: socioEconomicDevelopmentContributions,
    },
  ]

  return {
    importVersion: GENERIC_WORKBOOK_IMPORT_VERSION,
    filename: args.filename,
    fileSize,
    checksumSha256,
    analysedAt: new Date().toISOString(),
    sheetCount: sheets.length,
    sheets,
    expectedSheetCount: EXPECTED_GENERIC_SHEETS.length,
    recognisedSheetCount: sheets.filter((sheet) => sheet.canonicalName != null).length,
    unsupportedSheets,
    workbookDefects,
    demonstrationRowWarnings,
    procurementNotice:
      'Procurement data was detected in the workbook, but procurement must be sourced from a completed Formal Procurement Assessment.',
    elements,
    financial,
    ownership,
    managementControl,
    skillsDevelopment,
    enterpriseDevelopmentContributions,
    supplierDevelopmentContributions,
    socioEconomicDevelopmentContributions,
    managementControlImportSnapshot,
    sedImportSnapshot,
  }
}

function hasMeaningfulObjectValues(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value as Record<string, unknown>).some((entry) => entry != null && entry !== '')
}

export function hasExistingElementData(args: {
  elementKey: ImportElementKey
  financial?: unknown
  ownership?: unknown
  skills?: unknown
  contributionsByElement?: Record<string, number>
  hasMcImport?: boolean
  hasSkills?: boolean
}): boolean {
  switch (args.elementKey) {
    case 'financial':
      return hasMeaningfulObjectValues(args.financial)
    case 'ownership':
      return hasMeaningfulObjectValues(args.ownership)
    case 'management_control':
      return Boolean(args.hasMcImport)
    case 'skills_development':
      if (args.skills !== undefined) return hasMeaningfulObjectValues(args.skills)
      // Empty `{}` rows are created at assessment start — do not treat as existing data.
      if (args.hasSkills === true) return true
      return false
    case 'enterprise_development':
    case 'supplier_development':
    case 'socio_economic_development':
      return (args.contributionsByElement?.[args.elementKey] ?? 0) > 0
    default:
      return false
  }
}

export { MAX_UPLOAD_BYTES }
