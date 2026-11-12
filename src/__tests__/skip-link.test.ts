import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The keyboard-only run found "Skip to content" was the 9th Tab stop (after
// the whole menu). The app shell (sidebar + panel) now carries it, for the
// signed-in app and the Aberdare workspace alike.
const shell = readFileSync(join(__dirname, '../components/layout/AppShell.tsx'), 'utf8')
const layout = readFileSync(join(__dirname, '../app/(dashboard)/layout.tsx'), 'utf8')

describe('Skip to content', () => {
  it('comes before the menu in every signed-in page', () => {
    expect(layout).toContain('<AppShell>')
    expect(shell.indexOf('Skip to content')).toBeGreaterThan(-1)
    expect(shell.indexOf('Skip to content')).toBeLessThan(shell.indexOf('<Sidebar'))
  })

  it('lands on the page content, which can take focus', () => {
    expect(shell).toMatch(/href="#main"/)
    expect(shell).toMatch(/id="main"\s+tabIndex=\{-1\}/)
  })
})
