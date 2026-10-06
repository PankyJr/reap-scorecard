import type { FinancialInputs } from '../financial'
import type { OwnershipInputs } from '../elements/ownership'
import type { ManagementControlInputs } from '../elements/management-control'
import type { SkillsDevelopmentInputs } from '../elements/skills-development'
import type { ContributionRecord } from '../elements/contributions'
import type {
  ConfirmImportRequest,
  ElementImportDecision,
  GenericWorkbookAnalysis,
  ImportElementKey,
} from './types'

function isEmptyObject(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'object') return value == null || value === ''
  return !Object.values(value as Record<string, unknown>).some((entry) => {
    if (entry == null || entry === '') return false
    if (typeof entry === 'object') return !isEmptyObject(entry)
    return true
  })
}

function mergeMissing<T extends Record<string, unknown>>(existing: T, proposed: T): T {
  const result = { ...existing }
  for (const [key, value] of Object.entries(proposed)) {
    const current = result[key as keyof T]
    if (current == null || current === '' || (typeof current === 'object' && isEmptyObject(current))) {
      ;(result as Record<string, unknown>)[key] = value
    }
  }
  return result
}

export type AppliedWorkbookImport = {
  financial: FinancialInputs | null
  ownership: OwnershipInputs | null
  managementControl: ManagementControlInputs | null
  managementControlImportSnapshot: unknown | null
  skillsDevelopment: SkillsDevelopmentInputs | null
  enterpriseDevelopmentContributions: ContributionRecord[] | null
  supplierDevelopmentContributions: ContributionRecord[] | null
  socioEconomicDevelopmentContributions: ContributionRecord[] | null
  sedImportSnapshot: unknown | null
  appliedElements: ImportElementKey[]
  skippedElements: ImportElementKey[]
  warnings: string[]
}

/**
 * Apply per-element import decisions without mutating historical calculation runs.
 * Returns payloads the server action should persist.
 */
export function applyWorkbookImportDecisions(args: {
  request: ConfirmImportRequest
  existing: {
    financial: FinancialInputs | null
    ownership: OwnershipInputs | null
    managementControl: ManagementControlInputs | null
    managementControlImportSnapshot: unknown | null
    skillsDevelopment: SkillsDevelopmentInputs | null
    enterpriseDevelopmentContributions: ContributionRecord[]
    supplierDevelopmentContributions: ContributionRecord[]
    socioEconomicDevelopmentContributions: ContributionRecord[]
    sedImportSnapshot: unknown | null
  }
}): AppliedWorkbookImport {
  const { request, existing } = args
  if (!request.acknowledgeProcurementSeparate) {
    throw new Error('Confirm that procurement will be attached from a Formal Procurement Assessment.')
  }
  if (!request.acceptWarnings && request.analysis.elements.some((element) => element.warningCount > 0)) {
    throw new Error('Accept the import warnings before continuing, or skip the affected elements.')
  }
  if (!request.acknowledgeMissingFields) {
    throw new Error('Acknowledge that missing fields will remain incomplete until captured manually.')
  }

  const analysis = request.analysis
  const appliedElements: ImportElementKey[] = []
  const skippedElements: ImportElementKey[] = []
  const warnings: string[] = [...analysis.workbookDefects, ...analysis.demonstrationRowWarnings]

  const decide = <T,>(
    elementKey: ImportElementKey,
    proposed: T,
    current: T | null,
    isEmpty: (value: T | null) => boolean,
  ): T | null => {
    const decision: ElementImportDecision = request.decisions[elementKey] ?? 'skip'
    if (decision === 'skip' || decision === 'keep_existing') {
      skippedElements.push(elementKey)
      return null
    }
    if (decision === 'import' || decision === 'replace_existing') {
      if (!isEmpty(current) && decision === 'import') {
        // Protect existing data unless the user explicitly chose replace.
        skippedElements.push(elementKey)
        warnings.push(
          `${elementKey}: existing data was kept because Import was chosen while data already exists. Use Replace to overwrite.`,
        )
        return null
      }
      appliedElements.push(elementKey)
      return proposed
    }
    if (decision === 'merge_missing_only') {
      appliedElements.push(elementKey)
      if (current == null || isEmpty(current)) return proposed
      if (
        typeof current === 'object' &&
        current !== null &&
        typeof proposed === 'object' &&
        proposed !== null &&
        !Array.isArray(current) &&
        !Array.isArray(proposed)
      ) {
        return mergeMissing(current as Record<string, unknown>, proposed as Record<string, unknown>) as T
      }
      if (Array.isArray(current) && Array.isArray(proposed)) {
        return (current.length === 0 ? proposed : current) as T
      }
      return current
    }
    skippedElements.push(elementKey)
    return null
  }

  const financial = decide('financial', analysis.financial, existing.financial, (value) => isEmptyObject(value))
  const ownership = decide('ownership', analysis.ownership, existing.ownership, (value) => isEmptyObject(value))
  const managementControl = decide(
    'management_control',
    analysis.managementControl,
    existing.managementControl,
    (value) => isEmptyObject(value),
  )
  const skillsDevelopment = decide(
    'skills_development',
    analysis.skillsDevelopment,
    existing.skillsDevelopment,
    (value) => isEmptyObject(value),
  )

  const ed = decide(
    'enterprise_development',
    analysis.enterpriseDevelopmentContributions,
    existing.enterpriseDevelopmentContributions,
    (value) => !value || value.length === 0,
  )
  const sd = decide(
    'supplier_development',
    analysis.supplierDevelopmentContributions,
    existing.supplierDevelopmentContributions,
    (value) => !value || value.length === 0,
  )
  const sed = decide(
    'socio_economic_development',
    analysis.socioEconomicDevelopmentContributions,
    existing.socioEconomicDevelopmentContributions,
    (value) => !value || value.length === 0,
  )

  return {
    financial,
    ownership,
    managementControl,
    managementControlImportSnapshot: appliedElements.includes('management_control')
      ? analysis.managementControlImportSnapshot
      : null,
    skillsDevelopment,
    enterpriseDevelopmentContributions: ed,
    supplierDevelopmentContributions: sd,
    socioEconomicDevelopmentContributions: sed,
    sedImportSnapshot: appliedElements.includes('socio_economic_development')
      ? analysis.sedImportSnapshot
      : null,
    appliedElements,
    skippedElements,
    warnings,
  }
}

export function defaultDecisionsForAnalysis(
  analysis: GenericWorkbookAnalysis,
  existingFlags: Partial<Record<ImportElementKey, boolean>>,
): Record<ImportElementKey, ElementImportDecision> {
  const keys: ImportElementKey[] = [
    'financial',
    'ownership',
    'management_control',
    'skills_development',
    'enterprise_development',
    'supplier_development',
    'socio_economic_development',
  ]
  const decisions = {} as Record<ImportElementKey, ElementImportDecision>
  for (const key of keys) {
    const element = analysis.elements.find((candidate) => candidate.elementKey === key)
    if (!element?.willPopulate) {
      decisions[key] = 'skip'
      continue
    }
    decisions[key] = existingFlags[key] ? 'keep_existing' : 'import'
  }
  return decisions
}
