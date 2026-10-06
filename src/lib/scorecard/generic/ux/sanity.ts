/**
 * "Is that right?" checks shown next to a field. Plain arithmetic between the
 * figures a user typed (a part bigger than its whole, a percentage over 100),
 * never a B-BBEE rule, and never blocking: the figure is saved either way.
 * Keys are the form field names.
 */
import type { OwnershipInputs } from '../elements/ownership'
import type { ManagementControlInputs } from '../elements/management-control'
import type { SkillsDevelopmentInputs } from '../elements/skills-development'
import type { ApplicabilityInputs } from '../applicability'
import type { FinancialInputs } from '../financial'

export type FieldWarnings = Record<string, string>

const over = (part: number | null | undefined, whole: number | null | undefined) =>
  part != null && whole != null && Number.isFinite(part) && Number.isFinite(whole) && part > whole + 1e-9

const overHundredPercent = (fraction: number | null | undefined) => fraction != null && fraction > 1 + 1e-9

export function ownershipWarnings(o: OwnershipInputs): FieldWarnings {
  const w: FieldWarnings = {}
  const percentFields: Array<keyof OwnershipInputs> = [
    'blackVotingRightsPercentage',
    'blackWomenVotingRightsPercentage',
    'blackEconomicInterestPercentage',
    'blackWomenEconomicInterestPercentage',
    'designatedGroupsEconomicInterestPercentage',
    'newEntrantsEconomicInterestPercentage',
    'netValuePercentage',
  ]
  for (const field of percentFields) {
    if (overHundredPercent(o[field] as number | null)) w[field] = 'This is more than 100%. Is that right?'
  }
  if (over(o.blackWomenVotingRightsPercentage, o.blackVotingRightsPercentage)) {
    w.blackWomenVotingRightsPercentage = 'This is more than black voting rights overall. Is that right?'
  }
  if (over(o.blackWomenEconomicInterestPercentage, o.blackEconomicInterestPercentage)) {
    w.blackWomenEconomicInterestPercentage = 'This is more than black economic interest overall. Is that right?'
  }
  if (over(o.blackExercisableVotes, o.totalExercisableVotes)) w.blackExercisableVotes = 'This is more than the total votes. Is that right?'
  if (over(o.blackWomenExercisableVotes, o.blackExercisableVotes)) {
    w.blackWomenExercisableVotes = 'This is more than the votes held by black people overall. Is that right?'
  }
  return w
}

export function managementControlWarnings(m: ManagementControlInputs): FieldWarnings {
  const w: FieldWarnings = {}
  const groups: Array<[string, { total: number | null; black: number | null; blackWomen: number | null }]> = [
    ['board', m.board],
    ['execDir', m.executiveDirectors],
    ['otherExec', m.otherExecutiveManagement],
  ]
  for (const [prefix, group] of groups) {
    if (over(group.black, group.total)) w[`${prefix}Black`] = 'This is more than the total. Is that right?'
    if (over(group.blackWomen, group.black)) w[`${prefix}BlackWomen`] = 'This is more than the black people counted. Is that right?'
  }
  const bands: Array<[string, ManagementControlInputs['seniorManagement']]> = [
    ['senior', m.seniorManagement],
    ['middle', m.middleManagement],
    ['junior', m.juniorManagement],
  ]
  for (const [prefix, band] of bands) {
    const counted = Object.values(band.byDemographic ?? {}).reduce<number>((sum, n) => sum + (Number(n) || 0), 0)
    if (over(counted, band.total)) w[`${prefix}Total`] = `The groups below add up to ${counted}, more than this total. Is that right?`
  }
  if (over(m.blackEmployeesWithDisabilities, m.totalEmployees)) {
    w.blackEmployeesWithDisabilities = 'This is more than all employees. Is that right?'
  }
  return w
}

export function skillsWarnings(s: SkillsDevelopmentInputs): FieldWarnings {
  const w: FieldWarnings = {}
  const sum = (values: Record<string, number | undefined>) => Object.values(values ?? {}).reduce<number>((t, n) => t + (Number(n) || 0), 0)
  const training = sum(s.generalTrainingSpendByDemographic) + sum(s.bursarySpendByDemographic) + (s.disabilityTrainingSpend ?? 0)
  if (s.leviableAmount != null && training > 0 && over(training, s.leviableAmount)) {
    w.leviableAmount = 'Training spend is more than the whole leviable payroll. Is that right?'
  }
  if (over(s.learnersAbsorbed, s.learnersCompleted)) w.learnersAbsorbed = 'More learners were taken on than finished. Is that right?'
  return w
}

export function financialWarnings(f: FinancialInputs): FieldWarnings {
  const w: FieldWarnings = {}
  if (over(f.actualNpat, f.revenue)) w.actualNpat = 'Profit after tax is more than revenue. Is that right?'
  if (over(f.npbt, f.revenue)) w.npbt = 'Profit before tax is more than revenue. Is that right?'
  if (over(f.leviableAmount, f.revenue)) w.leviableAmount = 'The payroll is more than revenue. Is that right?'
  return w
}

export function applicabilityWarnings(a: ApplicabilityInputs): FieldWarnings {
  const w: FieldWarnings = {}
  if (overHundredPercent(a.blackOwnershipPercentage)) w.blackOwnershipPercentage = 'This is more than 100%. Is that right?'
  if (over(a.blackWomenOwnershipPercentage, a.blackOwnershipPercentage)) {
    w.blackWomenOwnershipPercentage = 'This is more than black ownership overall. Is that right?'
  }
  if (a.measurementPeriodStart && a.measurementPeriodEnd && a.measurementPeriodEnd < a.measurementPeriodStart) {
    w.measurementPeriodEnd = 'The last day is before the first day. Is that right?'
  }
  return w
}
