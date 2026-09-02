import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const generic = (file: string) =>
  readFileSync(
    resolve(process.cwd(), 'src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic', file),
    'utf8',
  )

const actions = generic('actions.ts')
const ui = generic('ui.tsx')

/** Every `key=value` flag the server actions redirect with when they finish. */
function flagsSetByActions(): Array<[string, string]> {
  return [...actions.matchAll(/'([a-z]+)=([a-z0-9-]+)'/g)]
    .map((match) => [match[1], match[2]] as [string, string])
    .filter(([key]) => key !== 'error')
}

/** The outcome table in ui.tsx, parsed back out of the source. */
function outcomesHandledByFlash(): Map<string, Set<string>> {
  const start = ui.indexOf('const FLASH_OUTCOMES')
  const end = ui.indexOf('\nexport function Flash', start)
  expect(start).toBeGreaterThan(-1)
  const block = ui.slice(start, end)

  const handled = new Map<string, Set<string>>()
  let current: string | null = null
  for (const line of block.split('\n')) {
    const param = /^ {2}([a-z]+): \{/.exec(line)
    if (param) {
      current = param[1]
      handled.set(current, new Set())
      continue
    }
    const value = /^ {4}'([a-z0-9-]+)':/.exec(line)
    if (value && current) handled.get(current)!.add(value[1])
  }
  return handled
}

describe('every action outcome is visible on the page', () => {
  const flags = flagsSetByActions()
  const handled = outcomesHandledByFlash()

  it('finds the flags the actions actually set', () => {
    const unique = [...new Set(flags.map(([key, value]) => `${key}=${value}`))].sort()
    expect(unique).toEqual([
      'attached=1',
      'bonus=1',
      'deleted=1',
      'detached=1',
      'evidence=already-confirmed',
      'evidence=confirmed',
      'evidence=corrected',
      'npat=1',
      'override=1',
      'override=cleared',
      'saved=1',
    ])
  })

  // The guard that matters: a new action redirecting with an unknown flag makes
  // this fail rather than shipping a page that reloads in silence.
  it.each([...new Set(flags.map(([key, value]) => `${key}=${value}`))].sort())(
    'renders a message for %s',
    (flag) => {
      const [key, value] = flag.split('=')
      expect(handled.get(key), `no FLASH_OUTCOMES entry for "${key}"`).toBeDefined()
      expect(handled.get(key)!.has(value), `no message for ${key}=${value}`).toBe(true)
    },
  )

  it('gives every declared outcome both a tone and a message', () => {
    const declared = [...handled.entries()].flatMap(([key, values]) =>
      [...values].map((value) => `${key}=${value}`),
    )
    // Everything the actions set is covered, plus the two flags set outside
    // this module by the import and calculate flows.
    const fromActions = new Set(flags.map(([key, value]) => `${key}=${value}`))
    for (const flag of fromActions) expect(declared).toContain(flag)
    expect(declared.filter((flag) => !fromActions.has(flag)).sort()).toEqual([
      'calculated=1',
      'imported=1',
    ])

    const start = ui.indexOf('const FLASH_OUTCOMES')
    const block = ui.slice(start, ui.indexOf('\nexport function Flash', start))
    // One tone and one message per declared outcome, and nothing left over.
    expect(block.match(/\btone: '(success|notice)'/g)).toHaveLength(declared.length)
    expect(block.match(/\bmessage:/g)).toHaveLength(declared.length)
  })

  it('treats an already-confirmed no-op as a notice rather than a success', () => {
    const entry = ui.slice(ui.indexOf("'already-confirmed'"), ui.indexOf("'corrected'"))
    expect(entry).toContain("tone: 'notice'")
  })

  it('keeps an explicit error above any success message', () => {
    expect(ui).toContain('{error ?? outcome?.message}')
    expect(ui).toContain("const tone = error ? 'error' : (outcome?.tone ?? 'success')")
  })
})
