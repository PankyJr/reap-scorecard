import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = [join(__dirname, '..'), join(__dirname, '../../components')]

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : tsxFiles(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

/** The text of each opening <Name …> tag, skipping over {…} expressions and strings. */
function openingTags(source: string, names: string[]): string[] {
  const tags: string[] = []
  for (const name of names) {
    let from = 0
    while ((from = source.indexOf(`<${name}`, from)) !== -1) {
      const start = from
      from += name.length + 1
      if (!/\s/.test(source[from] ?? '')) continue
      let depth = 0
      let quote: string | null = null
      let i = from
      for (; i < source.length; i++) {
        const c = source[i]
        if (quote) {
          if (c === quote) quote = null
        } else if (depth === 0 && (c === '"' || c === "'")) quote = c
        else if (c === '{') depth++
        else if (c === '}') depth--
        else if (c === '>' && depth === 0) break
      }
      tags.push(source.slice(start, i + 1))
    }
  }
  return tags
}

describe('links keep their link role', () => {
  // role="menuitem" is the one legitimate override: links inside a role="menu".
  it('never overrides the role of a Link or <a>, so screen readers announce it as a link', () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of tsxFiles(root)) {
        const source = readFileSync(file, 'utf8')
        for (const tag of openingTags(source, ['Link', 'a'])) {
          const role = tag.match(/\srole=["{']?([a-z]+)/)?.[1]
          if (role && role !== 'menuitem') offenders.push(`${relative(process.cwd(), file)}: role="${role}" on a link`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
