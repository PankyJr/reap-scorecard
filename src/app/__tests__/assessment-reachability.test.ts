import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = ['src/app', 'src/components']
const CALCULATOR_SUBTREE = join('scorecards', 'calculator')
const LINK_PREFIX = '/scorecards/calculator/'

function walk(dir: string): string[] {
  let out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue
      out = out.concat(walk(full))
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/** Files that could link to an assessment, excluding the calculator's own pages. */
function filesOutsideCalculator(): string[] {
  return ROOTS.flatMap((root) => walk(root)).filter(
    (file) => !relative(process.cwd(), file).includes(CALCULATOR_SUBTREE),
  )
}

/**
 * The regression this exists to prevent.
 *
 * Generic scorecard assessments were reachable only by the redirect fired once
 * at creation: nothing anywhere in the app linked to `/scorecards/calculator/`,
 * so navigating away stranded 23 real assessments behind direct URLs. This test
 * fails the moment the application loses its last route back to one.
 */
describe('a generic scorecard assessment is reachable from the rest of the app', () => {
  const linking = filesOutsideCalculator().filter((file) =>
    readFileSync(file, 'utf8').includes(LINK_PREFIX),
  )

  it('has at least one inbound link outside the calculator subtree', () => {
    expect(
      linking.length,
      `No file outside ${CALCULATOR_SUBTREE} links to ${LINK_PREFIX}. An assessment would be reachable by direct URL only.`,
    ).toBeGreaterThan(0)
  })

  it('links from the company profile, so an assessment survives navigating away', () => {
    const fromCompanyProfile = linking.some((file) =>
      file.includes(join('companies', '[id]')),
    )
    expect(
      fromCompanyProfile,
      'The company profile no longer links to its scorecard assessments.',
    ).toBe(true)
  })

  it('points at the generic calculator route that actually exists', () => {
    const hrefs = linking.flatMap((file) => [
      ...readFileSync(file, 'utf8').matchAll(/\/scorecards\/calculator\/\$\{[^}]+\}(\/[a-z-]*)?/g),
    ])
    expect(hrefs.length).toBeGreaterThan(0)
    // Every link lands on /generic, which is the step-based entry point.
    for (const [match] of hrefs) {
      expect(match.endsWith('/generic'), `unexpected link target: ${match}`).toBe(true)
    }
  })
})
