import { afterEach, describe, expect, it, vi } from 'vitest'

import { isDemoInstance } from '../demoMode'
import robots from '@/app/robots'

/**
 * The demo flag gates a permanent banner and a site-wide noindex. Both must be
 * completely inert on the production Netlify deployment, which never sets the
 * variable — that is the half of this behaviour most worth pinning, because a
 * regression there would quietly de-index a live marketing site.
 */

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isDemoInstance', () => {
  it('is true only for the exact string "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true')
    expect(isDemoInstance()).toBe(true)
  })

  // Anything ambiguous must fail closed to "this is production", so a typo
  // can never silently switch a real deployment into demo presentation.
  it.each([['false'], ['TRUE'], ['1'], ['yes'], [''], ['  true  ']])(
    'is false for %p',
    (value) => {
      vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', value)
      expect(isDemoInstance()).toBe(false)
    },
  )

  it('is false when the variable is not set at all (the production case)', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', undefined as unknown as string)
    expect(isDemoInstance()).toBe(false)
  })
})

describe('robots.txt', () => {
  it('disallows every crawler on the demo instance and publishes no sitemap', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true')
    const result = robots()

    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' })
    expect(result.sitemap).toBeUndefined()
  })

  it('keeps the production rules and sitemap when the flag is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', undefined as unknown as string)
    const result = robots()

    const rules = result.rules as { userAgent: string; allow?: string; disallow?: string[] }
    expect(rules.allow).toBe('/')
    expect(rules.disallow).toContain('/settings')
    expect(rules.disallow).toContain('/scorecards')
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/)
  })
})
