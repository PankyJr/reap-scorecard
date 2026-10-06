import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The keyboard-only run found "Skip to content" was the 9th Tab stop (after
// the whole menu) and was inside a header hidden on phones.
const layout = readFileSync(join(__dirname, '../app/(dashboard)/layout.tsx'), 'utf8')
const header = readFileSync(join(__dirname, '../components/layout/Header.tsx'), 'utf8')

describe('Skip to content', () => {
  it('comes before the menu in every signed-in page, outside the phone-hidden header', () => {
    expect(layout.indexOf('Skip to content')).toBeGreaterThan(-1)
    expect(layout.indexOf('Skip to content')).toBeLessThan(layout.indexOf('<Sidebar'))
    expect(header).not.toContain('Skip to content')
  })

  it('lands on the page content, which can take focus', () => {
    expect(layout).toMatch(/href="#main"/)
    expect(layout).toMatch(/<main id="main" tabIndex=\{-1\}/)
  })
})
