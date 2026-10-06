import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyseGenericScorecardWorkbook } from '../workbook-import'
import { calculateGenericScorecard, EMPTY_MANAGEMENT_CONTROL_INPUTS, EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '..'
import { genericApplicability } from './fixtures'
import { buildAreaRows, droppedLevelSentence, liveScore, losingPoints, nextUnfinished } from '../ux/areas'
import type { NextActionItem } from '../ux/workflow'

const GOLDEN = resolve(process.cwd(), 'test-fixtures/golden/golden-populated-workbook.xlsx')

describe.skipIf(!existsSync(GOLDEN))('the workspace checklist and live score, on the golden workbook as imported', () => {
  const buffer = readFileSync(GOLDEN)
  const analysis = analyseGenericScorecardWorkbook({ filename: 'golden.xlsx', buffer, fileSize: buffer.length })
  const preview = calculateGenericScorecard({
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
  const items: NextActionItem[] = [
    { id: 'applicability', label: 'Company size and sector', href: '/a', complete: true },
    { id: 'financial', label: 'Financial figures', href: '/f', complete: true },
  ]
  const rows = buildAreaRows({ assessmentId: 'x', preview, workflowItems: items, procurementAttached: false })
  const row = (key: string) => rows.find((r) => r.key === key)!

  it('lists the two set-up steps, then the seven areas in scorecard order', () => {
    expect(rows.map((r) => r.key)).toEqual([
      'applicability',
      'financial',
      'ownership',
      'management_control',
      'skills_development',
      'preferential_procurement',
      'supplier_development',
      'enterprise_development',
      'socio_economic_development',
    ])
  })

  it('shows the engine’s own points per area', () => {
    expect(row('ownership')).toMatchObject({ achieved: 16.1, available: 25, status: 'progress' })
  })

  it('colours an area amber when it is below its priority minimum, with the engine’s threshold', () => {
    expect(row('supplier_development')).toMatchObject({
      status: 'problem',
      note: 'Below its minimum: 0.00 of the 4.00 points needed',
    })
    expect(row('enterprise_development').note).toBe('Below its minimum: 0.00 of the 2.00 points needed')
  })

  it('asks for a procurement scorecard until one is attached', () => {
    expect(row('preferential_procurement')).toMatchObject({ status: 'todo', note: 'Attach a procurement scorecard' })
  })

  it('gives the live total and names the areas that dropped the level', () => {
    const score = liveScore(preview)
    expect(score.totalPoints).toBe(16.1)
    expect(score.isFinal).toBe(false)
    expect(droppedLevelSentence(score)).toBe(
      'Dropped one level: Supplier development (0.00 of the 4.00 points needed) and Enterprise development (0.00 of the 2.00 points needed) are below the minimum.',
    )
  })

  it('finds the next area that still needs something, after the current one', () => {
    const next = nextUnfinished(rows, 'ownership')
    expect(next?.key).toBe('management_control')
    expect(nextUnfinished(rows, 'socio_economic_development')?.key).toBe('ownership')
  })

  it('says where Ownership loses most points, biggest gap first', () => {
    expect(losingPoints(preview.elements.find((e) => e.elementKey === 'ownership')).map((l) => [l.achieved, l.available])).toEqual([
      [4.8, 8],
      [2, 4],
      [2.1, 3],
    ])
  })
})
