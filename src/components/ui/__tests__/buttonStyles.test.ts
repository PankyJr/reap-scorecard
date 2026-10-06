import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buttonStyles } from '../buttonStyles'

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : tsxFiles(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

describe('buttonStyles', () => {
  it('has a solid red variant for the final delete, with no brand colour to fight it', () => {
    const cls = buttonStyles({ variant: 'destructive' })
    expect(cls).toContain('bg-bad')
    expect(cls).not.toContain('bg-brand')
  })

  it('is never given a background colour on top of a variant that already has one', () => {
    // Two bg-* classes of equal weight: whichever Tailwind emits last wins, so
    // the intended colour (a red delete button) silently loses.
    const root = join(__dirname, '../../..')
    const offenders: string[] = []
    for (const file of [...tsxFiles(join(root, 'app')), ...tsxFiles(join(root, 'components'))]) {
      const source = readFileSync(file, 'utf8')
      for (const m of source.matchAll(/buttonStyles\(\{[^}]*variant:\s*'(primary|secondary|danger|destructive)'[^}]*className:\s*'([^']*)'/g)) {
        if (/(^|\s)bg-/.test(m[2])) offenders.push(`${relative(root, file)}: ${m[1]} + "${m[2]}"`)
      }
    }
    expect(offenders).toEqual([])
  })
})
