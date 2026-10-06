import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * deriveProcurementReapLevel maps a share of the six procurement indicators
 * onto LEGACY_SCORECARD_RULES.levelBands, which calculateScorecard.ts itself
 * calls placeholder thresholds. A rating made from placeholder rules must not
 * reach a user as if it meant something: no screen, report, PDF or admin view
 * may call it (or the sentences chosen by it). The function stays in
 * insights.ts; only its callers are checked.
 */
const SRC = join(__dirname, '../../..')

const FORBIDDEN = ['deriveProcurementReapLevel', 'getProcurementExecutiveScorecardLine', 'getProcurementExecutiveInterpretation']

/** Where the function and its sentences are defined, not shown. */
const DEFINED_IN = new Set(['lib/procurement/insights.ts'])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : []
  })
}

describe('the placeholder procurement rating', () => {
  const files = sourceFiles(SRC).map((full) => ({ path: relative(SRC, full), text: readFileSync(full, 'utf8') }))

  it('scans the app, the components, the admin queries and the reports', () => {
    const paths = files.map((f) => f.path)
    expect(paths).toContain('app/procurement/assessments/[id]/report/page.tsx')
    expect(paths).toContain('lib/admin/queries.ts')
    expect(paths).toContain('lib/reports/pdf/procurement.ts')
    expect(paths).toContain('lib/procurement/insights.ts')
  })

  it('is not called by any screen, report, PDF or admin view', () => {
    const callers = files
      .filter((f) => !DEFINED_IN.has(f.path))
      .flatMap((f) => FORBIDDEN.filter((name) => f.text.includes(name)).map((name) => `${f.path}: ${name}`))
    expect(callers).toEqual([])
  })

  it('is not labelled on any screen as a "Procurement rating"', () => {
    const labelled = files.filter((f) => /Procurement rating/.test(f.text)).map((f) => f.path)
    expect(labelled).toEqual([])
  })
})
