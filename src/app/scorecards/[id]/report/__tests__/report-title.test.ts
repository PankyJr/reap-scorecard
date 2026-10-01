import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The manual scorecard covers ownership, management control, skills,
// enterprise development and socio-economic development. It is not a
// procurement scorecard, and its report must not say it is.
const FILES = [
  join(__dirname, '../page.tsx'),
  join(__dirname, '../../../../api/scorecards/[id]/report/route.ts'),
]

describe('manual scorecard report', () => {
  it.each(FILES)('is not titled as a procurement scorecard: %s', (file) => {
    const source = readFileSync(file, 'utf8')
    expect(source).not.toMatch(/Procurement Scorecard/)
    expect(source).toMatch(/B-BBEE Scorecard/)
  })
})
