import type { EapDistribution } from '../scoring'
import type { ApplicabilityInputs } from '../applicability'
import type { FinancialInputs } from '../financial'
import type { OwnershipInputs } from '../elements/ownership'
import type { ManagementControlInputs } from '../elements/management-control'
import type { SkillsDevelopmentInputs } from '../elements/skills-development'
import type { ProcurementSnapshot } from '../elements/procurement'
import type { ContributionRecord } from '../elements/contributions'
import type { GenericScorecardInputs } from '..'

/**
 * Synthetic EAP distribution. Values mirror the shape of a national EAP set but
 * are supplied by a versioned target set at runtime, never hard-coded in the
 * engine.
 */
export const SYNTHETIC_EAP: EapDistribution = {
  african_male: 0.435,
  coloured_male: 0.046,
  indian_male: 0.017,
  african_female: 0.375,
  coloured_female: 0.042,
  indian_female: 0.01,
}

export function genericApplicability(overrides: Partial<ApplicabilityInputs> = {}): ApplicabilityInputs {
  return {
    measurementPeriodStart: '2025-03-01',
    measurementPeriodEnd: '2026-02-28',
    annualRevenue: 250_000_000,
    entityType: 'Private company',
    sector: 'Manufacturing',
    sectorCodeApplies: false,
    sectorCodeName: null,
    blackOwnershipPercentage: 0.3,
    blackWomenOwnershipPercentage: 0.12,
    isStartUp: false,
    fullScorecardElection: null,
    ...overrides,
  }
}

export function healthyFinancials(overrides: Partial<FinancialInputs> = {}): FinancialInputs {
  return {
    measurementPeriodStart: '2025-03-01',
    measurementPeriodEnd: '2026-02-28',
    revenue: 250_000_000,
    actualNpat: 20_000_000,
    npbt: 27_000_000,
    companyTax: 7_000_000,
    leviableAmount: 40_000_000,
    totalPayroll: 45_000_000,
    totalEmployees: 400,
    industryClassification: 'Manufacturing',
    industryNpatMargin: 0.0573,
    industryProfitNormSource: 'StatsSA Financial Statistics, Table 1',
    industryProfitNormPeriod: '2025 Q1–Q4',
    npatOverride: null,
    ...overrides,
  }
}

export function fullOwnership(overrides: Partial<OwnershipInputs> = {}): OwnershipInputs {
  return {
    totalExercisableVotes: 1000,
    blackExercisableVotes: 300,
    blackWomenExercisableVotes: 120,
    blackVotingRightsPercentage: null,
    blackWomenVotingRightsPercentage: null,
    blackEconomicInterestPercentage: 0.3,
    blackWomenEconomicInterestPercentage: 0.12,
    designatedGroupsEconomicInterestPercentage: 0.04,
    newEntrantsEconomicInterestPercentage: 0.03,
    netValuePercentage: 0.25,
    evidenceSource: 'Share register and auditor letter',
    practitionerNotes: 'Flow-through applied throughout.',
    measurementDate: '2026-02-28',
    modifiedFlowThroughApplied: false,
    exclusionPrincipleApplied: false,
    ...overrides,
  }
}

/** Headcounts that comfortably exceed every EAP band target. */
export function strongManagementControl(
  overrides: Partial<ManagementControlInputs> = {},
): ManagementControlInputs {
  const band = (total: number) => ({
    total,
    byDemographic: {
      african_male: Math.round(total * 0.45),
      coloured_male: Math.round(total * 0.05),
      indian_male: Math.round(total * 0.02),
      african_female: Math.round(total * 0.38),
      coloured_female: Math.round(total * 0.05),
      indian_female: Math.round(total * 0.02),
    },
  })
  return {
    board: { total: 8, black: 5, blackWomen: 3 },
    executiveDirectors: { total: 4, black: 3, blackWomen: 2 },
    otherExecutiveManagement: { total: 10, black: 7, blackWomen: 4 },
    seniorManagement: band(40),
    middleManagement: band(80),
    juniorManagement: band(120),
    blackEmployeesWithDisabilities: 10,
    totalEmployees: 400,
    eapDistribution: SYNTHETIC_EAP,
    eapTargetSetLabel: 'Synthetic EAP 2025 v1',
    ...overrides,
  }
}

export function strongSkillsDevelopment(
  overrides: Partial<SkillsDevelopmentInputs> = {},
): SkillsDevelopmentInputs {
  const spend = (total: number) => ({
    african_male: total * 0.45,
    coloured_male: total * 0.05,
    indian_male: total * 0.02,
    african_female: total * 0.38,
    coloured_female: total * 0.05,
    indian_female: total * 0.02,
  })
  return {
    leviableAmount: 40_000_000,
    totalEmployees: 400,
    wspAtrSetaApproved: true,
    pivotalReportSubmitted: true,
    prioritySkillsProgrammeImplemented: true,
    trainingRegisterMaintained: true,
    generalTrainingSpendByDemographic: spend(1_600_000),
    bursarySpendByDemographic: spend(1_100_000),
    disabilityTrainingSpend: 130_000,
    learnerHeadcountByDemographic: {
      african_male: 10,
      coloured_male: 1,
      indian_male: 1,
      african_female: 9,
      coloured_female: 1,
      indian_female: 1,
    },
    totalSkillsDevelopmentSpend: 2_830_000,
    informalWorkplaceLearningSpend: null,
    trainingAdministrationCost: null,
    learnersCompleted: 20,
    learnersAbsorbed: 20,
    eapDistribution: SYNTHETIC_EAP,
    eapTargetSetLabel: 'Synthetic EAP 2025 v1',
    ...overrides,
  }
}

export function strongProcurementSnapshot(overrides: Partial<ProcurementSnapshot> = {}): ProcurementSnapshot {
  const tmps = 100_000_000
  return {
    sourceAssessmentId: '00000000-0000-4000-8000-000000000001',
    sourceAssessmentName: 'Synthetic procurement assessment 2026',
    measurementPeriodStart: '2025-03-01',
    measurementPeriodEnd: '2026-02-28',
    capturedAt: '2026-03-15T09:00:00.000Z',
    capturedBy: 'synthetic-user',
    totalMeasuredProcurementSpend: tmps,
    recognisedSpend: {
      'preferential_procurement.all_empowering_suppliers': tmps * 0.9,
      'preferential_procurement.qse': tmps * 0.2,
      'preferential_procurement.eme': tmps * 0.2,
      'preferential_procurement.black_owned_51': tmps * 0.55,
      'preferential_procurement.black_women_owned_30': tmps * 0.15,
      'preferential_procurement.bonus.designated_group': tmps * 0.03,
    },
    flowThroughApplied: true,
    sourceReportedBasePoints: null,
    sourceReportedBonusPoints: null,
    ...overrides,
  }
}

export function grantContribution(overrides: Partial<ContributionRecord> = {}): ContributionRecord {
  return {
    id: 'contribution-1',
    beneficiaryName: 'Synthetic Beneficiary 001',
    beneficiaryClassification: 'eme',
    beneficiaryBlackOwnershipPercentage: 1,
    wasEmeOrQseAtFirstAssistance: true,
    yearsSinceFirstAssistance: 1,
    contributionType: 'grant_contribution',
    actualValue: 100_000,
    suppliedBenefitFactor: null,
    contributionDate: '2025-09-01',
    evidenceProvided: true,
    notes: null,
    blackBeneficiaryPercentage: null,
    manualOverride: null,
    ...overrides,
  }
}

export function sedContribution(overrides: Partial<ContributionRecord> = {}): ContributionRecord {
  return grantContribution({
    id: 'sed-1',
    beneficiaryClassification: 'individual',
    beneficiaryBlackOwnershipPercentage: null,
    blackBeneficiaryPercentage: 1,
    ...overrides,
  })
}

/** A complete, comfortably compliant scorecard. Individual tests degrade it. */
export function completeScorecardInputs(
  overrides: Partial<GenericScorecardInputs> = {},
): GenericScorecardInputs {
  return {
    applicability: genericApplicability(),
    financial: healthyFinancials(),
    ownership: fullOwnership(),
    managementControl: strongManagementControl(),
    skillsDevelopment: strongSkillsDevelopment(),
    procurementSnapshot: strongProcurementSnapshot(),
    enterpriseDevelopment: {
      records: [grantContribution({ id: 'ed-1', actualValue: 300_000 })],
      bonusConfirmed: true,
      bonusEvidenceProvided: true,
    },
    supplierDevelopment: {
      records: [grantContribution({ id: 'sd-1', actualValue: 600_000 })],
      bonusConfirmed: true,
      bonusEvidenceProvided: true,
    },
    socioEconomicDevelopment: {
      records: [sedContribution({ id: 'sed-1', actualValue: 300_000 })],
    },
    ...overrides,
  }
}
