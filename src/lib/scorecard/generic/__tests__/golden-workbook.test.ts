import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyseGenericScorecardWorkbook } from '../workbook-import'
import { calculateGenericScorecard, EMPTY_MANAGEMENT_CONTROL_INPUTS, EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '..'
import { genericApplicability } from './fixtures'
import {
  EXPECTED_APPLICABLE_NPAT,
  EXPECTED_CONTRIBUTION_TARGETS,
  EXPECTED_DEEMED_NPAT,
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
  EXPECTED_READINESS_COMPLETE,
  EXPECTED_RECOGNITION_PERCENTAGE,
  EXPECTED_SED_POINTS_AS_IMPORTED,
  EXPECTED_SED_POINTS_WITH_EVIDENCE,
  EXPECTED_SED_RECOGNISED_TOTAL,
  EXPECTED_SED_ROWS,
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

  it('totals ownership to 14.80 of 25 and marks it partial', () => {
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

  it('scores SED at 3.00 once evidence is confirmed', () => {
    const withEvidence = calculateGenericScorecard({
      applicability: genericApplicability(),
      financial: analysis.financial,
      ownership: analysis.ownership,
      managementControl: { ...EMPTY_MANAGEMENT_CONTROL_INPUTS },
      skillsDevelopment: { ...EMPTY_SKILLS_DEVELOPMENT_INPUTS },
      procurementSnapshot: null,
      enterpriseDevelopment: { records: [] },
      supplierDevelopment: { records: [] },
      socioEconomicDevelopment: {
        records: analysis.socioEconomicDevelopmentContributions.map((c) => ({ ...c, evidenceProvided: true })),
      },
    })
    const sed = withEvidence.elements.find((e) => e.elementKey === 'socio_economic_development')!
    expect(sed.basePointsAchieved).toBe(EXPECTED_SED_POINTS_WITH_EVIDENCE)
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

  it('leaves new entrants null — the metric key has no definition', () => {
    // Ownership!D10 holds 0.065 in the fixture; it is unreadable today.
    expect(analysis.ownership.newEntrantsEconomicInterestPercentage).toBeNull()
  })

  it('ignores the workbook Full Scorecard score and level', () => {
    const full = analysis.sheets.find((s) => s.detectedName === 'Full Scorecard')!
    expect(full.classification).toBe('ignored')
    expect(calculation.ruleSetKey).toBe('generic-codes-2019-v1')
  })
})
