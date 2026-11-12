import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { liveScore, loadLivePreviews } from '../live-preview'

/**
 * Home, /companies, company detail and /scorecards must show the same score
 * for the same company. They do that by reading it the same way: loadLivePreviews (the
 * engine on the figures as they stand) and liveScore (live first, else the
 * last saved result). This test pins both halves.
 */
const PAGES = {
  home: 'src/app/(dashboard)/dashboard/page.tsx',
  companies: 'src/app/(dashboard)/companies/page.tsx',
  companyDetail: 'src/app/(dashboard)/companies/[id]/page.tsx',
  scorecards: 'src/app/(dashboard)/scorecards/page.tsx',
}

describe('the live score is read the same way on Home, /companies, company detail and /scorecards', () => {
  for (const [name, path] of Object.entries(PAGES)) {
    it(`${name} uses the shared live-score read`, () => {
      const source = readFileSync(join(process.cwd(), path), 'utf8')
      expect(source).toMatch(/import \{[^}]*\bliveScore\b[^}]*\bloadLivePreviews\b[^}]*\} from '@\/lib\/assessments\/live-preview'/)
      expect(source).toMatch(/loadLivePreviews\(/)
      expect(source).toMatch(/liveScore\(/)
      // No page works the list score out on its own.
      expect(source).not.toMatch(/total:\s*\w+\.rawTotalPoints/)
    })
  }

  it('prefers the live score over the saved one', () => {
    expect(liveScore({ rawTotalPoints: 61.2, totalBasePointsAvailable: 109 }, { rawTotalPoints: 40, totalBasePointsAvailable: 109 })).toEqual({ total: 61.2, available: 109 })
  })

  it('falls back to the last saved result when the engine could not read the scorecard', () => {
    expect(liveScore(null, { rawTotalPoints: 40, totalBasePointsAvailable: 109 })).toEqual({ total: 40, available: 109 })
    expect(liveScore(undefined, { rawTotalPoints: 40, totalBasePointsAvailable: 109 })).toEqual({ total: 40, available: 109 })
  })

  it('shows no score when there is neither', () => {
    expect(liveScore(null, null)).toBeNull()
    expect(liveScore(null, { rawTotalPoints: 'x' })).toBeNull()
  })

  it('reads only (select), never writes, and skips the database when there is nothing to read', async () => {
    const calls: string[] = []
    const chain = (table: string) => ({
      select: (cols: string) => {
        calls.push(`${table}.select(${cols})`)
        return { in: async () => ({ data: [], error: null }) }
      },
      insert: () => calls.push(`${table}.insert`),
      update: () => calls.push(`${table}.update`),
      upsert: () => calls.push(`${table}.upsert`),
      delete: () => calls.push(`${table}.delete`),
    })
    const db = { from: (table: string) => chain(table) } as unknown as Parameters<typeof loadLivePreviews>[0]
    expect((await loadLivePreviews(db, [])).size).toBe(0)
    expect(calls).toEqual([])
    await loadLivePreviews(db, ['a'])
    expect(calls.every((c) => c.includes('.select('))).toBe(true)
    expect(calls).toHaveLength(3)
  })
})
