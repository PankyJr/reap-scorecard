import type { FinancialInputs } from '../financial'
import type { OwnershipInputs } from '../elements/ownership'
import type { ManagementControlInputs } from '../elements/management-control'
import type { SkillsDevelopmentInputs } from '../elements/skills-development'
import type { ContributionRecord } from '../elements/contributions'
import type {
  AppliedWorkbookImport,
  ElementImportDecision,
  GenericWorkbookAnalysis,
  GenericWorkbookElementPreview,
} from './types'

function findElement(analysis: GenericWorkbookAnalysis, key: string): GenericWorkbookElementPreview | null {
  return analysis.elements.find((element) => element.elementKey === key) ?? null
}

function mergeMissingObject<T extends Record<string, unknown>>(existing: T, proposed: T): T {
  const result = { ...existing }
  for (const [key, value] of Object.entries(proposed)) {
    const current = existing[key]
    if (current == null || current === '') {
      ;(result as Record<string, unknown>)[key] = value
    }
  }
  return result
}

function hasExistingObject(value: unknown): boolean {
  if (value == null) return false
  if (typeof value !== 'object') return value !== ''
  if (Array.isArray(value)) return value.length > 0
  return Object.values(value as Record<string, unknown>).some((entry) => hasExistingObject(entry))
}

/**
 * Resolve confirmed import decisions into payloads that the server action writes.
 * Never mutates historical calculation runs. Does not write until the caller persists.
 */
export function applyWorkbookImportDecisions(args: {
  analysis: GenericWorkbookAnalysis
  decisions: Record<string, ElementImportDecision>
  existing: {
    financial: FinancialInputs | null
    ownership: OwnershipInputs | null
    managementControl: ManagementControlInputs | null
    skillsDevelopment: SkillsDevelopmentInputs | null
    enterpriseDevelopmentRecords: ContributionRecord[]
    supplierDevelopmentRecords: ContributionRecord[]
    socioEconomicDevelopmentRecords: ContributionRecord[]
  }
  warningsAccepted: boolean
}): AppliedWorkbookImport {
  const { analysis, decisions, existing, warningsAccepted } = args

  const resolveObject = <T extends Record<string, unknown>>(
    key: string,
    proposed: T | undefined,
    current: T | null,
  ): T | null => {
    const decision = decisions[key] ?? 'skip'
    if (decision === 'skip' || decision === 'keep_existing') return null
    if (!proposed) return null
    if (decision === 'replace_existing') return proposed
    if (decision === 'merge_missing') {
      if (current && hasExistingObject(current)) return mergeMissingObject(current, proposed)
      return proposed
    }
    // decision === 'import' — never overwrite populated existing data
    if (current && hasExistingObject(current)) return null
    return proposed
  }

  const resolveContributions = (
    key: string,
    proposed: ContributionRecord[] | undefined,
    current: ContributionRecord[],
  ): ContributionRecord[] | null => {
    const decision = decisions[key] ?? 'skip'
    if (decision === 'skip' || decision === 'keep_existing') return null
    if (!proposed || proposed.length === 0) return null
    if (decision === 'replace_existing') return proposed
    if (decision === 'merge_missing') return current.length === 0 ? proposed : null
    if (current.length > 0) return null
    return proposed
  }

  const financialEl = findElement(analysis, 'financial')
  const ownershipEl = findElement(analysis, 'ownership')
  const mcEl = findElement(analysis, 'management_control')
  const skillsEl = findElement(analysis, 'skills_development')
  const edEl = findElement(analysis, 'enterprise_development')
  const sdEl = findElement(analysis, 'supplier_development')
  const sedEl = findElement(analysis, 'socio_economic_development')

  return {
    financial: resolveObject('financial', financialEl?.proposedFinancial, existing.financial),
    ownership: resolveObject('ownership', ownershipEl?.proposedOwnership, existing.ownership),
    managementControl: resolveObject(
      'management_control',
      mcEl?.proposedManagementControl,
      existing.managementControl,
    ),
    skillsDevelopment: resolveObject('skills_development', skillsEl?.proposedSkills, existing.skillsDevelopment),
    enterpriseDevelopmentRecords: resolveContributions(
      'enterprise_development',
      edEl?.proposedContributions,
      existing.enterpriseDevelopmentRecords,
    ),
    supplierDevelopmentRecords: resolveContributions(
      'supplier_development',
      sdEl?.proposedContributions,
      existing.supplierDevelopmentRecords,
    ),
    socioEconomicDevelopmentRecords: resolveContributions(
      'socio_economic_development',
      sedEl?.proposedContributions,
      existing.socioEconomicDevelopmentRecords,
    ),
    decisions,
    warningsAccepted,
    procurementNote:
      'Procurement data was detected in the workbook, but procurement must be sourced from a completed Formal Procurement Assessment.',
  }
}

export function elementHasExistingData(args: {
  elementKey: string
  financial: FinancialInputs | null
  ownership: OwnershipInputs | null
  managementControl: ManagementControlInputs | null
  skillsDevelopment: SkillsDevelopmentInputs | null
  contributionCounts: Record<string, number>
}): boolean {
  switch (args.elementKey) {
    case 'financial':
      return hasExistingObject(args.financial)
    case 'ownership':
      return hasExistingObject(args.ownership)
    case 'management_control':
      return hasExistingObject(args.managementControl)
    case 'skills_development':
      return hasExistingObject(args.skillsDevelopment)
    case 'enterprise_development':
    case 'supplier_development':
    case 'socio_economic_development':
      return (args.contributionCounts[args.elementKey] ?? 0) > 0
    default:
      return false
  }
}
