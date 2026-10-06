import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

describe('security headers on every response', () => {
  it('sends the standard browser protections and hides the framework', async () => {
    expect(nextConfig.poweredByHeader).toBe(false)
    const rules = await nextConfig.headers!()
    const all = rules.find((rule) => rule.source === '/:path*')
    const headers = Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]))
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Strict-Transport-Security']).toMatch(/max-age=\d+/)
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    // The CSP must not restrict scripts or styles: the app's own inline scripts would break.
    expect(headers['Content-Security-Policy']).not.toMatch(/script-src|default-src|style-src/)
  })
})
