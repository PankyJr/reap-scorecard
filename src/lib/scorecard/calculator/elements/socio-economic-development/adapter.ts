import { importSedBeneficiaryWorkbook, SED_HEADER_ALIASES, sumValidRecognisedAmount } from './import'
import { calculateSedBeneficiaryScore, SED_BENEFICIARY_RULE_VERSION } from '../../rules/sed-beneficiary-v1'
import type { CalculationBreakdown, ScorecardElementAdapter } from '../../types'

export const socioEconomicDevelopmentAdapter: ScorecardElementAdapter = {
  elementKey: 'socio_economic_development',
  elementName: 'Socio-Economic Development',
  shortName: 'SED',
  acceptedSheetNames: ['SED', 'Socio Economic Development', 'Socio-Economic Development'],
  headerAliases: SED_HEADER_ALIASES,
  ruleVersion: SED_BENEFICIARY_RULE_VERSION,
  scoringReady: true,
  help: {
    summary:
      'Upload a SED beneficiary workbook. The calculator imports qualifying beneficiaries by header name and recalculates recognised totals from valid rows.',
    uploadHints: [
      'Worksheet named SED (or title containing Socio Economic Development).',
      'Headers: Qualifying Beneficiaries, Claimed (optional), Recognised Amount, Notes.',
      'Blank template rows and the Total row are ignored.',
    ],
    outstandingBusinessRules: [
      'Meaning of the Claimed column is unresolved — preserved raw, unused in scoring.',
      'SED points require measurement-year NPAT and a confirmed target % (suggested 1% from engine fixtures).',
    ],
  },
  parseWorkbook: ({ workbookBuffer, preferredSheetName }) =>
    importSedBeneficiaryWorkbook({ workbookBuffer, preferredSheetName }),
  calculate: ({ rows, contextualInputs }): CalculationBreakdown => {
    const totalRecognisedAmount = sumValidRecognisedAmount(rows)
    const scored = calculateSedBeneficiaryScore({
      totalRecognisedAmount,
      npatAmount: contextualInputs.npatAmount as number | null | undefined,
      targetPercent: contextualInputs.targetPercent as number | null | undefined,
      availablePoints: contextualInputs.availablePoints as number | null | undefined,
    })

    return {
      formulaName: 'sed_beneficiary_proportional_points',
      ruleVersion: SED_BENEFICIARY_RULE_VERSION,
      inputsUsed: scored.inputsUsed,
      target: scored.targetPercent,
      actual: scored.percentage,
      pointsAvailable: scored.pointsAvailable,
      pointsAchieved: scored.pointsAchieved,
      caps: { maxRatio: 1 },
      thresholds: { targetPercent: scored.targetPercent },
      exclusions: ['Claimed column excluded from scoring pending business confirmation'],
      warnings: scored.warnings,
      explanation: scored.explanation,
    }
  },
}
