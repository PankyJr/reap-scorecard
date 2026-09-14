import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  GENERIC_SCORECARD_ELEMENT_KEYS,
  GENERIC_SCORECARD_PRODUCT_NAME,
  GENERIC_SCORECARD_RULE_VERSION,
} from '@/lib/scorecard/generic/entry'
import { mapGenericAssessmentCreateError } from '@/lib/scorecard/generic/create-errors'

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
const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('New Scorecard Calculation entry workflow', () => {
  it('does not default to Single element on the primary page', () => {
    expect(primaryForm).not.toContain("useState<'full' | 'single' | 'selected'>('single')")
    expect(primaryForm).not.toContain('Single element')
    expect(primaryForm).toContain('createGenericScorecardAssessment')
    expect(primaryForm).toContain('Create Assessment and Upload Workbook')
    expect(primaryForm).toContain('PendingSubmitButton')
    expect(primaryForm).toContain('Creating assessment')
  })

  it('keeps assessment name, year and notes editable on initial render', () => {
    expect(primaryForm).toMatch(/name="name"[\s\S]*defaultValue=/)
    expect(primaryForm).toMatch(/name="measurementYear"[\s\S]*type="number"/)
    expect(primaryForm).toMatch(/name="notes"/)
    expect(primaryForm).toContain('text-slate-950')
    expect(primaryForm).toContain('bg-white')
    // Only the submit button uses pending disable — fields stay editable after errors.
    expect(primaryForm).toContain('PendingSubmitButton')
    expect(primaryForm).not.toContain('<fieldset')
    expect(primaryForm).not.toMatch(/name="name"[^>]*disabled/)
    expect(primaryForm).not.toMatch(/name="measurementYear"[^>]*disabled/)
    expect(primaryForm).not.toMatch(/name="notes"[^>]*disabled/)
    expect(primaryForm).not.toMatch(/name="name"[^>]*readOnly/)
    expect(primaryForm).toContain('Status is fixed to Draft')
    expect(globalsCss).toContain('color-scheme: light')
    expect(globalsCss).not.toMatch(/@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)/)
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
    expect(calculatorActions).toContain("const status = 'draft' as const")
    expect(calculatorActions).toContain('GENERIC_SCORECARD_PRODUCT_NAME')
    expect(calculatorActions).toContain("workbook_import_status: 'no_workbook_uploaded'")
    expect(calculatorActions).toContain('GENERIC_ASSESSMENT_INSERT_FAILED')
    expect(calculatorActions).toContain('GENERIC_ELEMENT_INSERT_FAILED')
    expect(calculatorActions).toContain(".delete().eq('id', assessment.id)")
  })

  it('maps missing-schema failures to actionable messages', () => {
    expect(
      mapGenericAssessmentCreateError(
        { code: 'PGRST205', message: "Could not find the table 'public.scorecard_assessments'" },
        'assessment_insert',
      ),
    ).toMatch(/staging database/i)
    expect(
      mapGenericAssessmentCreateError(
        { code: '23514', message: 'new row violates check constraint element' },
        'element_insert',
      ),
    ).toMatch(/seven Generic elements/i)
  })

  it('redirects new Generic assessments to /generic', () => {
    expect(calculatorActions).toMatch(
      /export async function createGenericScorecardAssessment[\s\S]*redirect\(`\/scorecards\/calculator\/\$\{assessment\.id\}\/generic`\)/,
    )
  })

  it('shows the full workbook upload card immediately on the Generic landing page', () => {
    expect(genericLanding).toContain('Upload Generic Scorecard Workbook')
    expect(genericLanding).toContain('uploadGenericWorkbookForReview')
    expect(genericLanding).toContain('resolveImportStatus')
    expect(genericLanding).toContain('Measurement year')
    expect(genericLanding).toContain('GENERIC_CODES_USER_LABEL')
    expect(genericLanding).toContain('NextActionCard')
    expect(genericLanding).toContain('AssessmentAside')
  })

  it('keeps modular and legacy workflows accessible separately', () => {
    expect(newPage).toContain("mode === 'modular'")
    expect(newPage).toContain('ModularScorecardCalculatorNewForm')
    expect(newPage).toContain('legacy=1')
    expect(newPage).toContain('Legacy Manual Scorecards')
    expect(modularForm).toContain('createScorecardAssessment')
    expect(modularForm).toContain('Single element')
    expect(modularForm).toContain('selectedElements')
    // Renamed in the terminology pass: one concept, one name.
    expect(sidebar).toContain('New Assessment')
  })
})
