import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  GENERIC_SCORECARD_ELEMENT_KEYS,
  GENERIC_SCORECARD_PRODUCT_NAME,
  GENERIC_SCORECARD_RULE_VERSION,
} from '@/lib/scorecard/generic/entry'

const primaryForm = readFileSync(
  resolve(process.cwd(), 'src/app/(dashboard)/scorecards/new/FullScorecardCalculatorNewForm.tsx'),
  'utf8',
)
const modularForm = readFileSync(
  resolve(process.cwd(), 'src/app/(dashboard)/scorecards/new/ModularScorecardCalculatorNewForm.tsx'),
  'utf8',
)
const newPage = readFileSync(
  resolve(process.cwd(), 'src/app/(dashboard)/scorecards/new/page.tsx'),
  'utf8',
)
const calculatorActions = readFileSync(
  resolve(process.cwd(), 'src/app/(dashboard)/scorecards/calculator/actions.ts'),
  'utf8',
)
const genericLanding = readFileSync(
  resolve(process.cwd(), 'src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/page.tsx'),
  'utf8',
)
const sidebar = readFileSync(resolve(process.cwd(), 'src/components/layout/Sidebar.tsx'), 'utf8')

describe('New Scorecard Calculation entry workflow', () => {
  it('does not default to Single element on the primary page', () => {
    expect(primaryForm).not.toContain("useState<'full' | 'single' | 'selected'>('single')")
    expect(primaryForm).not.toContain('Single element')
    expect(primaryForm).toContain('createGenericScorecardAssessment')
    expect(primaryForm).toContain('Create Assessment and Upload Workbook')
  })

  it('omits the old four-element selector from the primary page', () => {
    expect(primaryForm).not.toContain('Calculation scope')
    expect(primaryForm).not.toContain('selectedElements')
    expect(primaryForm).not.toContain('socio_economic_development')
    expect(primaryForm).not.toContain('Upload Excel per element')
    expect(primaryForm).not.toContain('Partial work is supported')
    expect(primaryForm).toContain('Work with selected elements instead')
  })

  it('creates assessments with generic-codes-2019-v1 and all seven elements', () => {
    expect(GENERIC_SCORECARD_ELEMENT_KEYS).toEqual([
      'ownership',
      'management_control',
      'skills_development',
      'preferential_procurement',
      'enterprise_development',
      'supplier_development',
      'socio_economic_development',
    ])
    expect(GENERIC_SCORECARD_ELEMENT_KEYS).toHaveLength(7)
    expect(GENERIC_SCORECARD_RULE_VERSION).toBe('generic-codes-2019-v1')
    expect(GENERIC_SCORECARD_PRODUCT_NAME).toBe('REAP Generic Scorecard Calculator')
    expect(calculatorActions).toContain('GENERIC_SCORECARD_RULE_VERSION')
    expect(calculatorActions).toContain("status: 'draft'")
    expect(calculatorActions).toContain('GENERIC_SCORECARD_PRODUCT_NAME')
    expect(calculatorActions).toContain("workbook_import_status: 'no_workbook_uploaded'")
  })

  it('redirects new Generic assessments to /generic', () => {
    expect(calculatorActions).toMatch(
      /export async function createGenericScorecardAssessment[\s\S]*redirect\(`\/scorecards\/calculator\/\$\{assessment\.id\}\/generic`\)/,
    )
  })

  it('shows the full workbook upload card immediately on the Generic landing page', () => {
    expect(genericLanding).toContain('Upload Generic Scorecard Workbook')
    expect(genericLanding).toContain('uploadGenericWorkbookForReview')
    expect(genericLanding).toContain('no_workbook_uploaded')
    expect(genericLanding).toContain('Measurement year')
    expect(genericLanding).toContain('Generic Codes 2019')
  })

  it('keeps modular and legacy workflows accessible separately', () => {
    expect(newPage).toContain("mode === 'modular'")
    expect(newPage).toContain('ModularScorecardCalculatorNewForm')
    expect(newPage).toContain('legacy=1')
    expect(newPage).toContain('Legacy Manual Scorecards')
    expect(modularForm).toContain('createScorecardAssessment')
    expect(modularForm).toContain('Single element')
    expect(modularForm).toContain('selectedElements')
    expect(sidebar).toContain('New Scorecard Calculation')
  })
})
