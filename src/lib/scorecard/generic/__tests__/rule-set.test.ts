import { describe, expect, it } from 'vitest'
import { GENERIC_CODES_2019_V1 } from '../../rules/generic-2019/scorecard'
import { DEFAULT_RULE_SET_KEY, listSelectableRuleSets, resolveRuleSet } from '../../rules/registry'
import { indicatorsForElement } from '../../rules/types'
import {
  WORKBOOK_REFERENCE,
  WORKBOOK_RULE_INVENTORY,
  workbookRulesByParityStatus,
} from '../../rules/generic-2019/workbook-rule-inventory'

describe('generic-codes-2019-v1 rule set', () => {
  it('is the default and the only operative rule set', () => {
    expect(DEFAULT_RULE_SET_KEY).toBe('generic-codes-2019-v1')
    expect(listSelectableRuleSets().map((set) => set.key)).toEqual(['generic-codes-2019-v1'])
  })

  it.each([
    ['ownership', 25, 0],
    ['management_control', 19, 0],
    ['skills_development', 20, 5],
    ['preferential_procurement', 25, 2],
    ['supplier_development', 10, 1],
    ['enterprise_development', 5, 1],
    ['socio_economic_development', 5, 0],
  ] as const)('weights %s at %i base and %i bonus points', (elementKey, base, bonus) => {
    const element = GENERIC_CODES_2019_V1.elements.find((candidate) => candidate.elementKey === elementKey)
    expect(element).toBeDefined()
    expect(element!.basePoints).toBe(base)
    expect(element!.bonusPoints).toBe(bonus)
  })

  it('has indicator weightings that sum to each element weighting (procurement criteria retain GN 304 27)', () => {
    for (const element of GENERIC_CODES_2019_V1.elements) {
      const indicators = indicatorsForElement(GENERIC_CODES_2019_V1, element.elementKey)
      const base = indicators.reduce((sum, indicator) => sum + indicator.basePoints, 0)
      const bonus = indicators.reduce((sum, indicator) => sum + indicator.bonusPoints, 0)
      if (element.elementKey === 'preferential_procurement') {
        expect(base).toBe(27)
        expect(bonus).toBe(2)
        expect(element.basePoints).toBe(25)
        continue
      }
      expect({ key: element.elementKey, base, bonus }).toEqual({
        key: element.elementKey,
        base: element.basePoints,
        bonus: element.bonusPoints,
      })
    }
  })

  it('totals 109 base points and 9 bonus points after the procurement product cap', () => {
    const base = GENERIC_CODES_2019_V1.elements.reduce((sum, element) => sum + element.basePoints, 0)
    const bonus = GENERIC_CODES_2019_V1.elements.reduce((sum, element) => sum + element.bonusPoints, 0)
    expect(base).toBe(109)
    expect(bonus).toBe(9)
  })

  it('applies the gazetted level bands', () => {
    expect(GENERIC_CODES_2019_V1.levelBands).toEqual([
      { level: 'Level 1', min: 100, recognitionPercentage: 135 },
      { level: 'Level 2', min: 95, maxExclusive: 100, recognitionPercentage: 125 },
      { level: 'Level 3', min: 90, maxExclusive: 95, recognitionPercentage: 110 },
      { level: 'Level 4', min: 80, maxExclusive: 90, recognitionPercentage: 100 },
      { level: 'Level 5', min: 75, maxExclusive: 80, recognitionPercentage: 80 },
      { level: 'Level 6', min: 70, maxExclusive: 75, recognitionPercentage: 60 },
      { level: 'Level 7', min: 55, maxExclusive: 70, recognitionPercentage: 50 },
      { level: 'Level 8', min: 40, maxExclusive: 55, recognitionPercentage: 10 },
      { level: 'Non-compliant', min: -Infinity, maxExclusive: 40, recognitionPercentage: 0 },
    ])
  })

  it.each([
    ['priority.ownership.net_value', 8, 3.2],
    ['priority.skills_development', 20, 8],
    ['priority.preferential_procurement', 25, 10],
    ['priority.supplier_development', 10, 4],
    ['priority.enterprise_development', 5, 2],
  ])('sets the %s sub-minimum at 40%% of %i points', (key, basis, threshold) => {
    const rule = GENERIC_CODES_2019_V1.prioritySubminimums.find((candidate) => candidate.key === key)
    expect(rule).toBeDefined()
    expect(rule!.basisPoints).toBe(basis)
    expect(rule!.fraction).toBe(0.4)
    expect(rule!.basisPoints * rule!.fraction).toBeCloseTo(threshold, 10)
  })

  it('aligns the procurement element weight and sub-minimum basis at 25', () => {
    const element = GENERIC_CODES_2019_V1.elements.find(
      (candidate) => candidate.elementKey === 'preferential_procurement',
    )!
    const priority = GENERIC_CODES_2019_V1.prioritySubminimums.find(
      (candidate) => candidate.key === 'priority.preferential_procurement',
    )!
    expect(element.basePoints).toBe(25)
    expect(priority.basisPoints).toBe(25)
    const conflict = GENERIC_CODES_2019_V1.ruleConflicts.find(
      (candidate) => candidate.key === 'procurement-subminimum-basis',
    )
    expect(conflict).toBeDefined()
  })

  it('records every documented conflict with a gazetted resolution', () => {
    const keys = GENERIC_CODES_2019_V1.ruleConflicts.map((conflict) => conflict.key)
    expect(keys).toContain('procurement-available-points')
    expect(keys).toContain('generic-total-points')
    expect(keys).toContain('npat-denominator-selection')
    expect(keys).toContain('absorption-measure')
    expect(keys).toContain('plus-one-vote')
    expect(keys).toContain('esd-orphan-job-creation-row')
    for (const conflict of GENERIC_CODES_2019_V1.ruleConflicts) {
      expect(conflict.resolution.length).toBeGreaterThan(20)
      expect(conflict.source.standing).toBe('gazetted')
    }
  })

  it('cites a primary source on every indicator', () => {
    for (const indicator of GENERIC_CODES_2019_V1.indicators) {
      expect(indicator.source.citation.length).toBeGreaterThan(10)
      expect(indicator.source.standing).toBe('gazetted')
    }
  })
})

describe('reserved 2026 draft', () => {
  it('is not selectable without explicit non-production enablement', () => {
    const selection = resolveRuleSet({ requestedKey: 'generic-codes-2026-draft' })
    expect(selection.ruleSet.key).toBe('generic-codes-2019-v1')
    expect(selection.operative).toBe(true)
    expect(selection.blockedReason).toMatch(/reserved draft/i)
  })

  it('can never be operative even when explicitly enabled', () => {
    const selection = resolveRuleSet({
      requestedKey: 'generic-codes-2026-draft',
      allowNonProductionDraft: true,
    })
    expect(selection.ruleSet.key).toBe('generic-codes-2026-draft')
    expect(selection.operative).toBe(false)
    expect(selection.blockedReason).toMatch(/cannot produce a final B-BBEE level/i)
  })

  it('falls back to the default rule set for an unknown key', () => {
    const selection = resolveRuleSet({ requestedKey: 'not-a-rule-set' })
    expect(selection.ruleSet.key).toBe('generic-codes-2019-v1')
    expect(selection.blockedReason).toMatch(/Unknown rule set/)
  })
})

describe('workbook rule inventory', () => {
  it('records the audited workbook fingerprint', () => {
    expect(WORKBOOK_REFERENCE.sha256).toBe(
      '93494e2916e21ad88072a074edadc75d351db6f28c10222463df8de641168fc0',
    )
    expect(WORKBOOK_REFERENCE.worksheetCount).toBe(22)
    expect(WORKBOOK_REFERENCE.formulaCount).toBe(633)
    expect(WORKBOOK_REFERENCE.cachedErrorCellCount).toBe(205)
    expect(WORKBOOK_REFERENCE.macrosPresent).toBe(false)
    expect(WORKBOOK_REFERENCE.hiddenSheetCount).toBe(0)
    expect(WORKBOOK_REFERENCE.externalWorkbookLinks).toBe(0)
  })

  it('classifies every record and explains every non-parity classification', () => {
    expect(WORKBOOK_RULE_INVENTORY.length).toBeGreaterThan(30)
    for (const record of WORKBOOK_RULE_INVENTORY) {
      expect(record.displayName.length).toBeGreaterThan(3)
      expect(record.workbookSheet.length).toBeGreaterThan(0)
      if (record.workbookParityStatus !== 'exact_parity') {
        expect(record.knownWorkbookDefect ?? '').not.toBe('')
      }
    }
  })

  it('excludes demonstration data and the orphan ESD row', () => {
    const excluded = workbookRulesByParityStatus('excluded_demonstration_data')
    expect(excluded.map((record) => record.workbookSheet)).toEqual(
      expect.arrayContaining(['Ownership', 'Procurement Scorecard']),
    )

    const orphans = workbookRulesByParityStatus('unsupported_or_orphaned')
    const jobsRow = orphans.find((record) => record.displayName.includes('11% more new jobs'))
    expect(jobsRow).toBeDefined()
    expect(jobsRow!.indicatorKey).toBeNull()
    expect(jobsRow!.bonusPoints).toBe(2)
  })

  it('maps every engine indicator key in the inventory to a real rule', () => {
    const ruleKeys = new Set(GENERIC_CODES_2019_V1.indicators.map((indicator) => indicator.key))
    for (const record of WORKBOOK_RULE_INVENTORY) {
      if (record.indicatorKey == null) continue
      expect(ruleKeys.has(record.indicatorKey), `${record.indicatorKey} is not a rule-set indicator`).toBe(true)
    }
  })

  it('covers every scoring indicator in the rule set', () => {
    const covered = new Set(
      WORKBOOK_RULE_INVENTORY.map((record) => record.indicatorKey).filter((key): key is string => key != null),
    )
    for (const indicator of GENERIC_CODES_2019_V1.indicators) {
      expect(covered.has(indicator.key), `${indicator.key} is missing from the workbook inventory`).toBe(true)
    }
  })
})
