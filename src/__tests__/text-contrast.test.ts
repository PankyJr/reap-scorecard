import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Text colours must be readable on every background they sit on: WCAG AA
// asks for 4.5:1 for normal-size text. axe flagged the faint grey (hints,
// "optional", "Forgot password?") at 3.9 to 4.3:1.
const tokens = readFileSync(join(__dirname, '../app/tokens.css'), 'utf8')
const token = (name: string) => {
  const match = tokens.match(new RegExp(`--reap-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`--reap-${name} not found`)
  return match[1]
}
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('text contrast', () => {
  const backgrounds = ['surface', 'sunken', 'canvas', 'brand-soft', 'level-nc']
  it.each(['ink', 'muted', 'faint'])('%s text is at least 4.5:1 on every background', (text) => {
    for (const bg of backgrounds) {
      expect(contrast(token(text), token(bg)), `${text} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('faint text stays lighter than muted text, so the order of emphasis holds', () => {
    expect(luminance(token('faint'))).toBeGreaterThan(luminance(token('muted')))
  })
})

describe('form labels', () => {
  it('the hidden profile photo file field has an accessible name', () => {
    const source = readFileSync(join(__dirname, '../components/settings/ProfileForm.tsx'), 'utf8')
    expect(source).toMatch(/id="profile-avatar-file"[\s\S]{0,80}aria-label="Profile photo"/)
  })
})
