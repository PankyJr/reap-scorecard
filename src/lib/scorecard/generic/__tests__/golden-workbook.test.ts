import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyseGenericScorecardWorkbook } from '../workbook-import'
import { calculateGenericScorecard, EMPTY_MANAGEMENT_CONTROL_INPUTS, EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '..'
import { genericApplicability, SYNTHETIC_EAP } from './fixtures'
import { formatElementPoints } from '../ux/display-values'
import {
  EXPECTED_APPLICABLE_NPAT,
  EXPECTED_CONTRIBUTION_TARGETS,
  EXPECTED_DEEMED_NPAT,
  EXPECTED_ED_POINTS_AS_IMPORTED,
  EXPECTED_ED_POINTS_WITH_EVIDENCE,
  EXPECTED_ED_ROWS,
  EXPECTED_ED_TOTAL,
  EXPECTED_FAILED_PRIORITY_KEYS,
  EXPECTED_DISCOUNT_APPLIED,
  EXPECTED_FINANCIAL,
  EXPECTED_NET_VALUE_SUBMINIMUM,
  EXPECTED_NPAT_SELECTION,
  EXPECTED_OWNERSHIP_BASE_AVAILABLE,
  EXPECTED_OWNERSHIP_BASE_TOTAL,
  EXPECTED_OWNERSHIP_INPUTS,
  EXPECTED_OWNERSHIP_POINTS,
  EXPECTED_OWNERSHIP_STATUS,
  EXPECTED_PRELIMINARY_LEVEL,
  EXPECTED_RAW_TOTAL_POINTS,
  EXPECTED_RAW_TOTAL_WITH_EVIDENCE,
  EXPECTED_READINESS_COMPLETE,
  EXPECTED_RECOGNITION_PERCENTAGE,
  EXPECTED_SED_POINTS_AS_IMPORTED,
  EXPECTED_SED_POINTS_WITH_EVIDENCE,
  EXPECTED_SED_RECOGNISED_TOTAL,
  EXPECTED_SED_ROWS,
  EXPECTED_MC_BASE_AVAILABLE,
  EXPECTED_MC_BASE_TOTAL_NO_EAP,
  EXPECTED_MC_BASE_TOTAL_WITH_EAP,
  EXPECTED_MC_INPUTS,
  EXPECTED_MC_POINTS_WITH_EAP,
  EXPECTED_WORKBOOK_EAP,
  EXPECTED_RAW_TOTAL_WITH_MC,
  EXPECTED_LEVEL_WITH_MC,
  EXPECTED_SKILLS_BASE_TOTAL_WITH_GATES,
  EXPECTED_SKILLS_INPUTS,
  EXPECTED_SKILLS_POINTS_AS_IMPORTED,
  EXPECTED_SKILLS_POINTS_WITH_GATES,
  EXPECTED_SKILLS_SUBMINIMUM,
  EXPECTED_RAW_TOTAL_ALL_CONFIRMED,
  EXPECTED_LEVEL_ALL_CONFIRMED,
  EXPECTED_RECOGNITION_ALL_CONFIRMED,
  EXPECTED_SD_POINTS_AS_IMPORTED,
  EXPECTED_SD_POINTS_WITH_EVIDENCE,
  EXPECTED_SD_ROWS,
  EXPECTED_SD_TOTAL,
  EXPECTED_TOTAL_BASE_AVAILABLE,
  EXPECTED_TOTAL_BONUS_AVAILABLE,
} from './golden-expected'

/**
 * Golden-file regression: a real-shaped POPULATED workbook in, exact scores out.
 *
 * Every other numeric test in the suite uses hand-built synthetic fixtures, so
 * nothing proved the real import path end to end. That gap is what let the NPAT
 * sheet-name miss and the ownership column transposition survive a green suite.
 *
 * Expectations live in golden-expected.ts and were computed by hand from the
 * workbook cells and the rule set — never by copying engine output.
 */

const GOLDEN = resolve(process.cwd(), 'test-fixtures/golden/golden-populated-workbook.xlsx')
const hasGolden = existsSync(GOLDEN)

describe.skipIf(!hasGolden)('golden populated workbook', () => {
  const buffer = readFileSync(GOLDEN)
  // The REAL import path, not a shortcut.
  const analysis = analyseGenericScorecardWorkbook({
    filename: 'golden-populated-workbook.xlsx',
    buffer,
    fileSize: buffer.length,
  })

  const calculation = calculateGenericScorecard({
    applicability: genericApplicability(),
    financial: analysis.financial,
    ownership: analysis.ownership,
    managementControl: { ...EMPTY_MANAGEMENT_CONTROL_INPUTS },
    skillsDevelopment: { ...EMPTY_SKILLS_DEVELOPMENT_INPUTS },
    procurementSnapshot: null,
    enterpriseDevelopment: { records: analysis.enterpriseDevelopmentContributions },
    supplierDevelopment: { records: analysis.supplierDevelopmentContributions },
    socioEconomicDevelopment: { records: analysis.socioEconomicDevelopmentContributions },
  })

  /** Everything a consultant would confirm: evidence on contributions, skills gates. */
  const confirmAll = (records: typeof analysis.socioEconomicDevelopmentContributions) =>
    records.map((c) => ({ ...c, evidenceProvided: true }))
  const withGates = calculateGenericScorecard({
    applicability: genericApplicability(),
    financial: analysis.financial,
    ownership: analysis.ownership,
    managementControl: { ...EMPTY_MANAGEMENT_CONTROL_INPUTS },
    skillsDevelopment: {
      ...analysis.skillsDevelopment,
      eapDistribution: SYNTHETIC_EAP,
      eapTargetSetLabel: 'Synthetic EAP 2025 v1',
      wspAtrSetaApproved: true,
      pivotalReportSubmitted: true,
      prioritySkillsProgrammeImplemented: true,
      trainingRegisterMaintained: true,
    },
    procurementSnapshot: null,
    enterpriseDevelopment: { records: confirmAll(analysis.enterpriseDevelopmentContributions) },
    supplierDevelopment: { records: confirmAll(analysis.supplierDevelopmentContributions) },
    socioEconomicDevelopment: { records: confirmAll(analysis.socioEconomicDevelopmentContributions) },
  })

  /** As withGates, but with Management Control fed an EAP target set too. */
  const withEverything = calculateGenericScorecard({
    applicability: genericApplicability(),
    financial: analysis.financial,
    ownership: analysis.ownership,
    managementControl: {
      ...analysis.managementControl,
      eapDistribution: SYNTHETIC_EAP,
      eapTargetSetLabel: 'Synthetic EAP 2025 v1',
    },
    skillsDevelopment: {
      ...analysis.skillsDevelopment,
      eapDistribution: SYNTHETIC_EAP,
      eapTargetSetLabel: 'Synthetic EAP 2025 v1',
      wspAtrSetaApproved: true,
      pivotalReportSubmitted: true,
      prioritySkillsProgrammeImplemented: true,
      trainingRegisterMaintained: true,
    },
    procurementSnapshot: null,
    enterpriseDevelopment: { records: confirmAll(analysis.enterpriseDevelopmentContributions) },
    supplierDevelopment: { records: confirmAll(analysis.supplierDevelopmentContributions) },
    socioEconomicDevelopment: { records: confirmAll(analysis.socioEconomicDevelopmentContributions) },
  })

  /** MC inputs imported but no EAP target set selected. */
  const mcNoEap = calculateGenericScorecard({
    applicability: genericApplicability(),
    financial: analysis.financial,
    ownership: analysis.ownership,
    managementControl: { ...analysis.managementControl },
    skillsDevelopment: { ...EMPTY_SKILLS_DEVELOPMENT_INPUTS },
    procurementSnapshot: null,
    enterpriseDevelopment: { records: [] },
    supplierDevelopment: { records: [] },
    socioEconomicDevelopment: { records: [] },
  })

  const ownership = calculation.elements.find((e) => e.elementKey === 'ownership')!
  const indicatorPoints = (key: string) =>
    ownership.indicators.find((i) => i.indicatorKey === key)?.basePointsAchieved ?? null

  // -------------------------------------------------------------------------
  // Fixture integrity — the file must remain the real template's shape
  // -------------------------------------------------------------------------
  it('is the real reference workbook shape, padded sheet names intact', () => {
    expect(analysis.sheetCount).toBe(22)
    expect(analysis.recognisedSheetCount).toBe(22)
    const detected = analysis.sheets.map((s) => s.detectedName)
    expect(detected).toContain('Skills Development ')
    expect(detected).toContain(' Yes Targets Calc')
    expect(detected).toContain('NPAT Calculation')
    expect(detected.filter((n) => n !== n.trim())).toHaveLength(9)
  })

  // -------------------------------------------------------------------------
  // Extracted values
  // -------------------------------------------------------------------------
  it('extracts every ownership indicator exactly', () => {
    expect(analysis.ownership.blackVotingRightsPercentage).toBe(
      EXPECTED_OWNERSHIP_INPUTS.blackVotingRightsPercentage,
    )
    expect(analysis.ownership.blackWomenVotingRightsPercentage).toBe(
      EXPECTED_OWNERSHIP_INPUTS.blackWomenVotingRightsPercentage,
    )
    expect(analysis.ownership.blackEconomicInterestPercentage).toBe(
      EXPECTED_OWNERSHIP_INPUTS.blackEconomicInterestPercentage,
    )
    expect(analysis.ownership.blackWomenEconomicInterestPercentage).toBe(
      EXPECTED_OWNERSHIP_INPUTS.blackWomenEconomicInterestPercentage,
    )
    expect(analysis.ownership.designatedGroupsEconomicInterestPercentage).toBe(
      EXPECTED_OWNERSHIP_INPUTS.designatedGroupsEconomicInterestPercentage,
    )
    expect(analysis.ownership.netValuePercentage).toBe(EXPECTED_OWNERSHIP_INPUTS.netValuePercentage)
  })

  it('never reads a weighting point as an ownership percentage', () => {
    // Weightings on this sheet are 4, 2, 4, 2, 3, 2, 8. None may appear as a
    // percentage, and every percentage must stay under 1.
    const weightings = new Set([4, 2, 3, 8])
    for (const value of [
      analysis.ownership.blackVotingRightsPercentage,
      analysis.ownership.blackWomenVotingRightsPercentage,
      analysis.ownership.blackEconomicInterestPercentage,
      analysis.ownership.blackWomenEconomicInterestPercentage,
      analysis.ownership.designatedGroupsEconomicInterestPercentage,
      analysis.ownership.netValuePercentage,
    ]) {
      expect(value).not.toBeNull()
      expect(weightings.has(value as number)).toBe(false)
      expect(value as number).toBeLessThan(1)
    }
  })

  it('extracts the financial block from NPAT Calculation', () => {
    expect(analysis.financial.revenue).toBe(EXPECTED_FINANCIAL.revenue)
    expect(analysis.financial.actualNpat).toBe(EXPECTED_FINANCIAL.actualNpat)
    expect(analysis.financial.industryNpatMargin).toBe(EXPECTED_FINANCIAL.industryNpatMargin)
    expect(analysis.financial.leviableAmount).toBe(EXPECTED_FINANCIAL.leviableAmount)
  })

  it('extracts every SED beneficiary row with its recognised amount', () => {
    const rows = analysis.socioEconomicDevelopmentContributions
    expect(rows).toHaveLength(EXPECTED_SED_ROWS.length)
    EXPECTED_SED_ROWS.forEach((expectedRow, index) => {
      expect(rows[index].beneficiaryName).toBe(expectedRow.name)
      expect(rows[index].actualValue).toBe(expectedRow.recognised)
    })
    const total = rows.reduce((sum, r) => sum + (r.actualValue ?? 0), 0)
    expect(total).toBe(EXPECTED_SED_RECOGNISED_TOTAL)
  })

  // -------------------------------------------------------------------------
  // NPAT denominator — the greater-of rule, pinned in a known direction
  // -------------------------------------------------------------------------
  it('resolves the denominator to actual NPAT because it exceeds deemed', () => {
    expect(calculation.npat.deemedNpat).toBeCloseTo(EXPECTED_DEEMED_NPAT, 6)
    expect(calculation.npat.actualNpat).toBe(EXPECTED_FINANCIAL.actualNpat)
    expect(calculation.npat.applicableNpat).toBe(EXPECTED_APPLICABLE_NPAT)
    expect(calculation.npat.selection).toBe(EXPECTED_NPAT_SELECTION)
    expect(calculation.npat.requiresAuthorisedConfirmation).toBe(false)
    // The direction must be unambiguous, not a near-tie.
    expect(calculation.npat.actualNpat!).toBeGreaterThan(calculation.npat.deemedNpat!)
  })

  it('derives the ED, SD and SED contribution targets from that denominator', () => {
    expect(calculation.contributionTargets.enterpriseDevelopment).toBe(
      EXPECTED_CONTRIBUTION_TARGETS.enterpriseDevelopment,
    )
    expect(calculation.contributionTargets.supplierDevelopment).toBe(
      EXPECTED_CONTRIBUTION_TARGETS.supplierDevelopment,
    )
    expect(calculation.contributionTargets.socioEconomicDevelopment).toBe(
      EXPECTED_CONTRIBUTION_TARGETS.socioEconomicDevelopment,
    )
  })

  // -------------------------------------------------------------------------
  // Scored values
  // -------------------------------------------------------------------------
  it('scores every ownership indicator to its hand-computed point value', () => {
    for (const [key, points] of Object.entries(EXPECTED_OWNERSHIP_POINTS)) {
      expect(indicatorPoints(key), `${key} points`).toBe(points)
    }
  })

  it('gives each ownership indicator a distinct score, so a swap cannot hide', () => {
    const scores = Object.values(EXPECTED_OWNERSHIP_POINTS).map((p) => p)
    expect(new Set(scores).size).toBe(scores.length)
    const actual = Object.keys(EXPECTED_OWNERSHIP_POINTS).map((k) => indicatorPoints(k))
    expect(new Set(actual).size).toBe(actual.length)
  })

  it('totals ownership to 16.10 of 25, partial only for the missing measurement date', () => {
    expect(ownership.basePointsAchieved).toBe(EXPECTED_OWNERSHIP_BASE_TOTAL)
    expect(ownership.basePointsAvailable).toBe(EXPECTED_OWNERSHIP_BASE_AVAILABLE)
    expect(ownership.status).toBe(EXPECTED_OWNERSHIP_STATUS)
  })

  it('passes the ownership net-value priority sub-minimum', () => {
    const sub = calculation.prioritySubminimums.find((s) => s.key === EXPECTED_NET_VALUE_SUBMINIMUM.key)!
    expect(sub.basisPoints).toBe(EXPECTED_NET_VALUE_SUBMINIMUM.basisPoints)
    expect(sub.thresholdPoints).toBe(EXPECTED_NET_VALUE_SUBMINIMUM.thresholdPoints)
    expect(sub.achievedPoints).toBe(EXPECTED_NET_VALUE_SUBMINIMUM.achievedPoints)
    expect(sub.evaluated).toBe(EXPECTED_NET_VALUE_SUBMINIMUM.evaluated)
    expect(sub.passed).toBe(EXPECTED_NET_VALUE_SUBMINIMUM.passed)
  })

  it('scores SED at zero as imported, because evidence is unconfirmed', () => {
    const sed = calculation.elements.find((e) => e.elementKey === 'socio_economic_development')!
    expect(sed.basePointsAchieved).toBe(EXPECTED_SED_POINTS_AS_IMPORTED)
    expect(analysis.socioEconomicDevelopmentContributions.every((c) => c.evidenceProvided === false)).toBe(true)
  })

  it('extracts every ED beneficiary row with true cell provenance', () => {
    const rows = analysis.enterpriseDevelopmentContributions
    expect(rows).toHaveLength(EXPECTED_ED_ROWS.length)
    EXPECTED_ED_ROWS.forEach((expectedRow, index) => {
      expect(rows[index].beneficiaryName).toBe(expectedRow.name)
      expect(rows[index].actualValue).toBe(expectedRow.amount)
      expect(rows[index].sourceRowNumber).toBe(expectedRow.sourceRowNumber)
      expect(rows[index].notes).toContain(expectedRow.sourceCell)
    })
    expect(rows.reduce((s, r) => s + (r.actualValue ?? 0), 0)).toBe(EXPECTED_ED_TOTAL)
  })

  it('extracts every SD beneficiary row with true cell provenance', () => {
    const rows = analysis.supplierDevelopmentContributions
    expect(rows).toHaveLength(EXPECTED_SD_ROWS.length)
    EXPECTED_SD_ROWS.forEach((expectedRow, index) => {
      expect(rows[index].beneficiaryName).toBe(expectedRow.name)
      expect(rows[index].actualValue).toBe(expectedRow.amount)
      expect(rows[index].sourceRowNumber).toBe(expectedRow.sourceRowNumber)
    })
    expect(rows.reduce((s, r) => s + (r.actualValue ?? 0), 0)).toBe(EXPECTED_SD_TOTAL)
  })

  it('keeps ED and SD beneficiaries in their own elements', () => {
    expect(analysis.enterpriseDevelopmentContributions.every((c) => c.beneficiaryName!.includes('ED'))).toBe(true)
    expect(analysis.supplierDevelopmentContributions.every((c) => c.beneficiaryName!.includes('SD'))).toBe(true)
  })

  it('scores ED and SD at zero as imported, because evidence is unconfirmed', () => {
    const ed = calculation.elements.find((e) => e.elementKey === 'enterprise_development')!
    const sd = calculation.elements.find((e) => e.elementKey === 'supplier_development')!
    expect(ed.basePointsAchieved).toBe(EXPECTED_ED_POINTS_AS_IMPORTED)
    expect(sd.basePointsAchieved).toBe(EXPECTED_SD_POINTS_AS_IMPORTED)
    expect(analysis.enterpriseDevelopmentContributions.every((c) => c.evidenceProvided === false)).toBe(true)
    expect(analysis.supplierDevelopmentContributions.every((c) => c.evidenceProvided === false)).toBe(true)
  })

  it('scores SED 3.00, ED 3.625 and SD 7.25 once evidence is confirmed', () => {
    const confirm = (records: typeof analysis.socioEconomicDevelopmentContributions) =>
      records.map((c) => ({ ...c, evidenceProvided: true }))
    const withEvidence = calculateGenericScorecard({
      applicability: genericApplicability(),
      financial: analysis.financial,
      ownership: analysis.ownership,
      managementControl: { ...EMPTY_MANAGEMENT_CONTROL_INPUTS },
      skillsDevelopment: { ...EMPTY_SKILLS_DEVELOPMENT_INPUTS },
      procurementSnapshot: null,
      enterpriseDevelopment: { records: confirm(analysis.enterpriseDevelopmentContributions) },
      supplierDevelopment: { records: confirm(analysis.supplierDevelopmentContributions) },
      socioEconomicDevelopment: { records: confirm(analysis.socioEconomicDevelopmentContributions) },
    })
    const points = (key: string) =>
      withEvidence.elements.find((e) => e.elementKey === key)!.basePointsAchieved

    expect(points('socio_economic_development')).toBe(EXPECTED_SED_POINTS_WITH_EVIDENCE)
    expect(points('enterprise_development')).toBe(EXPECTED_ED_POINTS_WITH_EVIDENCE)
    expect(points('supplier_development')).toBe(EXPECTED_SD_POINTS_WITH_EVIDENCE)
    // ED and SD sit at the same 72.5% of target but different points, so a
    // swap between the two elements cannot pass unnoticed.
    expect(points('enterprise_development')).not.toBe(points('supplier_development'))
    expect(withEvidence.rawTotalPoints).toBe(EXPECTED_RAW_TOTAL_WITH_EVIDENCE)
  })

  // -------------------------------------------------------------------------
  // Whole-scorecard outcome
  // -------------------------------------------------------------------------
  it('produces the hand-computed total, level and readiness', () => {
    expect(calculation.totalBasePointsAvailable).toBe(EXPECTED_TOTAL_BASE_AVAILABLE)
    expect(calculation.totalBonusPointsAvailable).toBe(EXPECTED_TOTAL_BONUS_AVAILABLE)
    expect(calculation.rawTotalPoints).toBe(EXPECTED_RAW_TOTAL_POINTS)
    expect(calculation.preliminaryLevel.level).toBe(EXPECTED_PRELIMINARY_LEVEL)
    expect(calculation.preliminaryLevel.recognitionPercentage).toBe(EXPECTED_RECOGNITION_PERCENTAGE)
    expect(calculation.discountApplied).toBe(EXPECTED_DISCOUNT_APPLIED)
    // Importing ED/SD beneficiaries makes both elements evaluable, and with
    // evidence unconfirmed they score 0 against 2.00 / 4.00 thresholds.
    expect([...calculation.failedPriorityKeys].sort()).toEqual([...EXPECTED_FAILED_PRIORITY_KEYS].sort())
    expect(calculation.finalLevel.level).toBe(EXPECTED_PRELIMINARY_LEVEL)
    expect(calculation.readiness.complete).toBe(EXPECTED_READINESS_COMPLETE)
  })

  // -------------------------------------------------------------------------
  // Things that MUST be absent
  // -------------------------------------------------------------------------
  it('does not import procurement, and blocks a final level without it', () => {
    const importedElements = analysis.elements.map((e) => e.elementKey)
    expect(importedElements).not.toContain('preferential_procurement')
    expect(analysis.procurementNotice).toMatch(/Formal Procurement Assessment/)

    const procurement = calculation.elements.find((e) => e.elementKey === 'preferential_procurement')!
    expect(procurement.status).toBe('not_started')
    expect(procurement.basePointsAchieved).toBe(0)
    expect(calculation.readiness.reasons.some((r) => /procurement/i.test(r))).toBe(true)
  })

  it('ignores the workbook Procurement Scorecard sheet entirely', () => {
    const sheet = analysis.sheets.find((s) => s.detectedName === 'Procurement Scorecard')!
    expect(sheet.classification).toBe('ignored')
    expect(analysis.workbookDefects.some((d) => /Procurement Scorecard points are not imported/i.test(d))).toBe(
      true,
    )
  })

  it('imports new entrants — the last blind ownership line', () => {
    // Ownership!D10 = K22, the shareholder block's new-entrant column.
    expect(analysis.ownership.newEntrantsEconomicInterestPercentage).toBe(
      EXPECTED_OWNERSHIP_INPUTS.newEntrantsEconomicInterestPercentage,
    )
    const points = ownership.indicators.find((i) => i.indicatorKey === 'ownership.new_entrants')
    expect(points?.basePointsAchieved).toBe(1.3)
    expect(points?.status).toBe('scored')
  })

  it('ignores the workbook Full Scorecard score and level', () => {
    const full = analysis.sheets.find((s) => s.detectedName === 'Full Scorecard')!
    expect(full.classification).toBe('ignored')
    expect(calculation.ruleSetKey).toBe('generic-codes-2019-v1')
  })

  // -------------------------------------------------------------------------
  // Skills Development
  // -------------------------------------------------------------------------
  it('reads every skills input from the sheet\'s input rows', () => {
    const sk = analysis.skillsDevelopment
    expect(sk.leviableAmount).toBe(EXPECTED_SKILLS_INPUTS.leviableAmount)
    expect(sk.totalEmployees).toBe(EXPECTED_SKILLS_INPUTS.totalEmployees)
    expect(sk.generalTrainingSpendByDemographic).toEqual(EXPECTED_SKILLS_INPUTS.generalTrainingSpend)
    expect(sk.bursarySpendByDemographic).toEqual(EXPECTED_SKILLS_INPUTS.bursarySpend)
    expect(sk.learnerHeadcountByDemographic).toEqual(EXPECTED_SKILLS_INPUTS.learnerHeadcount)
    expect(sk.disabilityTrainingSpend).toBe(EXPECTED_SKILLS_INPUTS.disabilityTrainingSpend)
    expect(sk.learnersCompleted).toBe(EXPECTED_SKILLS_INPUTS.learnersCompleted)
    expect(sk.learnersAbsorbed).toBe(EXPECTED_SKILLS_INPUTS.learnersAbsorbed)
  })

  it('never confuses the general, bursary and learnership blocks', () => {
    const sk = analysis.skillsDevelopment
    expect(sk.generalTrainingSpendByDemographic.african_male).toBe(120_000)
    expect(sk.bursarySpendByDemographic.african_male).toBe(60_000)
    expect(sk.learnerHeadcountByDemographic.african_male).toBe(30)
  })

  it('scores skills at zero as imported, because the gates are unconfirmed', () => {
    const skills = calculation.elements.find((e) => e.elementKey === 'skills_development')!
    expect(skills.basePointsAchieved).toBe(EXPECTED_SKILLS_POINTS_AS_IMPORTED)
    expect(analysis.skillsDevelopment.wspAtrSetaApproved).toBeNull()
  })

  it('scores every skills indicator to its hand-computed value once gates are confirmed', () => {
    const skills = withGates.elements.find((e) => e.elementKey === 'skills_development')!
    for (const [key, points] of Object.entries(EXPECTED_SKILLS_POINTS_WITH_GATES)) {
      const indicator = skills.indicators.find((i) => i.indicatorKey === key)
      expect(indicator?.basePointsAchieved, key).toBe(points)
    }
    expect(skills.basePointsAchieved).toBe(EXPECTED_SKILLS_BASE_TOTAL_WITH_GATES)
    // Absorbed learners are absent from the workbook, so the bonus cannot score.
    expect(skills.bonusPointsAchieved).toBe(0)
  })

  it('passes the skills priority sub-minimum once gates are confirmed', () => {
    const sub = withGates.prioritySubminimums.find((s) => s.key === EXPECTED_SKILLS_SUBMINIMUM.key)!
    expect(sub.basisPoints).toBe(EXPECTED_SKILLS_SUBMINIMUM.basisPoints)
    expect(sub.thresholdPoints).toBe(EXPECTED_SKILLS_SUBMINIMUM.thresholdPoints)
    expect(sub.achievedPoints).toBe(EXPECTED_SKILLS_SUBMINIMUM.achievedPointsWithGates)
    expect(sub.passed).toBe(EXPECTED_SKILLS_SUBMINIMUM.passedWithGates)
  })

  it('clears the 40-point floor once everything is confirmed', () => {
    expect(withGates.rawTotalPoints).toBe(EXPECTED_RAW_TOTAL_ALL_CONFIRMED)
    expect(withGates.preliminaryLevel.level).toBe(EXPECTED_LEVEL_ALL_CONFIRMED)
    expect(withGates.preliminaryLevel.recognitionPercentage).toBe(EXPECTED_RECOGNITION_ALL_CONFIRMED)
  })

  // -------------------------------------------------------------------------
  // Management Control
  // -------------------------------------------------------------------------
  it('reads the direct groups from the Management Control F/G block', () => {
    expect(analysis.managementControl.board).toEqual(EXPECTED_MC_INPUTS.board)
    expect(analysis.managementControl.executiveDirectors).toEqual(EXPECTED_MC_INPUTS.executiveDirectors)
    expect(analysis.managementControl.otherExecutiveManagement).toEqual(
      EXPECTED_MC_INPUTS.otherExecutiveManagement,
    )
  })

  it('reads the occupational bands and disabilities from Employment Equity', () => {
    const mc = analysis.managementControl
    expect(mc.seniorManagement.total).toBe(EXPECTED_MC_INPUTS.seniorManagementTotal)
    expect(mc.middleManagement.total).toBe(EXPECTED_MC_INPUTS.middleManagementTotal)
    expect(mc.juniorManagement.total).toBe(EXPECTED_MC_INPUTS.juniorManagementTotal)
    expect(mc.blackEmployeesWithDisabilities).toBe(EXPECTED_MC_INPUTS.blackEmployeesWithDisabilities)
    expect(mc.totalEmployees).toBe(EXPECTED_MC_INPUTS.totalEmployees)
  })

  it('scores every management control indicator to its hand-computed value', () => {
    const mc = withEverything.elements.find((e) => e.elementKey === 'management_control')!
    for (const [key, points] of Object.entries(EXPECTED_MC_POINTS_WITH_EAP)) {
      const indicator = mc.indicators.find((i) => i.indicatorKey === key)
      expect(indicator?.basePointsAchieved, key).toBe(points)
    }
    expect(mc.basePointsAchieved).toBe(EXPECTED_MC_BASE_TOTAL_WITH_EAP)
    expect(mc.basePointsAvailable).toBe(EXPECTED_MC_BASE_AVAILABLE)
  })

  // -------------------------------------------------------------------------
  // Result page element subtotals
  //
  // Every element total used to be invisible: the Result page listed indicator
  // rows and a scorecard-wide total, with nothing in between. Management
  // Control's 12.57 could only be reached by adding up thirteen rows by hand.
  // These pin the exact strings the section headers render.
  // -------------------------------------------------------------------------
  /** The exact string the Result page section header renders for an element. */
  const subtotalOf = (elementKey: string) => {
    const element = withEverything.elements.find((e) => e.elementKey === elementKey)!
    return formatElementPoints(element.basePointsAchieved, element.basePointsAvailable)
  }

  it('renders each element subtotal as "achieved / available" on the Result page', () => {
    expect(subtotalOf('management_control')).toBe('12.57 / 19')
    expect(subtotalOf('skills_development')).toBe('12.14 / 20')
    expect(subtotalOf('ownership')).toBe('16.10 / 25')
  })

  it('keeps the subtotal string tied to the engine, not to a hardcoded literal', () => {
    expect(subtotalOf('management_control')).toBe(
      `${EXPECTED_MC_BASE_TOTAL_WITH_EAP.toFixed(2)} / ${EXPECTED_MC_BASE_AVAILABLE}`,
    )
    expect(subtotalOf('skills_development')).toBe(
      `${EXPECTED_SKILLS_BASE_TOTAL_WITH_GATES.toFixed(2)} / 20`,
    )
  })

  it('shows an em dash rather than a number for an element with no budget', () => {
    // A not-yet-calculated element must not render "0.00 / 0".
    expect(formatElementPoints(null, 25)).toBe('— / 25')
    expect(formatElementPoints(12.57, null)).toBe('12.57 / —')
  })

  it('gives each management control indicator a distinct score', () => {
    const values = Object.values(EXPECTED_MC_POINTS_WITH_EAP)
    expect(new Set(values).size).toBe(values.length)
    const mc = withEverything.elements.find((e) => e.elementKey === 'management_control')!
    const actual = Object.keys(EXPECTED_MC_POINTS_WITH_EAP).map(
      (k) => mc.indicators.find((i) => i.indicatorKey === k)?.basePointsAchieved,
    )
    expect(new Set(actual).size).toBe(actual.length)
  })

  it('still scores the seven non-EAP indicators when no EAP set is selected', () => {
    const mc = mcNoEap.elements.find((e) => e.elementKey === 'management_control')!
    expect(mc.basePointsAchieved).toBe(EXPECTED_MC_BASE_TOTAL_NO_EAP)
  })

  it('offers the workbook EAP row without imposing it', () => {
    // The importer never writes eapDistribution — it comes from the assessment's
    // target set. The workbook's own row is surfaced for review only.
    expect(analysis.managementControl.eapDistribution).toBeNull()
    expect(EXPECTED_WORKBOOK_EAP.african_male).toBe(0.435)
  })

  it('reaches Level 8 once every element is confirmed', () => {
    expect(withEverything.rawTotalPoints).toBe(EXPECTED_RAW_TOTAL_WITH_MC)
    expect(withEverything.preliminaryLevel.level).toBe(EXPECTED_LEVEL_WITH_MC)
  })

  // -------------------------------------------------------------------------
  // status = 'pending_confirmation'
  // -------------------------------------------------------------------------
  it('marks a zero that is only waiting on an evidence tick as pending_confirmation', () => {
    const sed = calculation.elements.find((e) => e.elementKey === 'socio_economic_development')!
    expect(sed.basePointsAchieved).toBe(0)
    expect(sed.status).toBe('pending_confirmation')
  })

  it('calls it scored once evidence is confirmed', () => {
    const sed = withGates.elements.find((e) => e.elementKey === 'socio_economic_development')!
    expect(sed.basePointsAchieved).toBeGreaterThan(0)
    expect(sed.status).toBe('scored')
  })

  it('leaves the discount behaviour exactly as it was', () => {
    // pending_confirmation must NOT be treated like missing_inputs in
    // evaluatePrioritySubminimums, or importing would stop discounting.
    expect(calculation.discountApplied).toBe(EXPECTED_DISCOUNT_APPLIED)
    expect([...calculation.failedPriorityKeys].sort()).toEqual([...EXPECTED_FAILED_PRIORITY_KEYS].sort())
  })
})
