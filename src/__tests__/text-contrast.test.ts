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
  // The canvas is the teal frame now (pass 5): only white type sits on it (tested below).
  const backgrounds = ['surface', 'sunken', 'segment', 'brand-soft', 'level-nc']
  it.each(['ink', 'muted', 'faint'])('%s text is at least 4.5:1 on every background', (text) => {
    for (const bg of backgrounds) {
      expect(contrast(token(text), token(bg)), `${text} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('faint text stays lighter than muted text, so the order of emphasis holds', () => {
    expect(luminance(token('faint'))).toBeGreaterThan(luminance(token('muted')))
  })
})

describe('white text on teal', () => {
  // White at an opacity, laid over the teal, is the colour the eye sees.
  const over = (alpha: number, bg: string) => {
    const mix = [1, 3, 5].map((i) => Math.round(alpha * 255 + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16)))
    return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`
  }
  const alphaOf = (name: string) => {
    const match = tokens.match(new RegExp(`--reap-${name}:\\s*rgb\\(255 255 255 / ([0-9.]+)\\)`))
    if (!match) throw new Error(`--reap-${name} not found`)
    return Number(match[1])
  }
  it.each(['on-teal-muted', 'on-teal-subtle'])('%s is at least 4.5:1 on brand teal', (name) => {
    expect(contrast(over(alphaOf(name), token('brand')), token('brand'))).toBeGreaterThanOrEqual(4.5)
  })
  it('full white on brand teal', () => {
    expect(contrast('#ffffff', token('brand'))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('the teal sidebar (pass 5): white type at an opacity, AA on #063B3F', () => {
  const hex = (name: string) => token(name)
  const mix = (alpha: number, bg: string) => {
    const v = [1, 3, 5].map((i) => Math.round(alpha * 255 + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16)))
    return `#${v.map((x) => x.toString(16).padStart(2, '0')).join('')}`
  }
  const alpha = (name: string) => {
    const m = tokens.match(new RegExp(`--reap-${name}:\\s*rgb\\(255 255 255 / ([0-9.]+)\\)`))
    if (!m) throw new Error(`--reap-${name} not found`)
    return Number(m[1])
  }
  const sidebar = hex('sidebar')
  it.each(['sidebar-ink', 'sidebar-muted', 'sidebar-label'])('%s on the sidebar is at least 4.5:1', (name) => {
    expect(contrast(mix(alpha(name), sidebar), sidebar)).toBeGreaterThanOrEqual(4.5)
  })
  it('search text on its 8% field is at least 4.5:1', () => {
    const field = mix(alpha('sidebar-search'), sidebar)
    expect(contrast(mix(alpha('sidebar-search-ink'), field), field)).toBeGreaterThanOrEqual(4.5)
  })
  it('white and the mint icon on the selected item are at least 4.5:1', () => {
    const active = mix(alpha('sidebar-active'), sidebar)
    expect(contrast('#ffffff', active)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(hex('sidebar-accent'), active)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('form labels', () => {
  it('the hidden profile photo file field has an accessible name', () => {
    const source = readFileSync(join(__dirname, '../components/settings/ProfileForm.tsx'), 'utf8')
    expect(source).toMatch(/id="profile-avatar-file"[\s\S]{0,80}aria-label="Profile photo"/)
  })
})
