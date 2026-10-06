import { describe, expect, it } from 'vitest'
import { emailLinkErrorMessage, parseEmailConfirmParams, safeNextPath } from '../email-confirm'

const q = (s: string) => new URLSearchParams(s)

describe('e-mail link parameters', () => {
  it('reads a sign-up confirmation link', () => {
    expect(parseEmailConfirmParams(q('token_hash=abc&type=email&next=/companies'))).toEqual({
      tokenHash: 'abc',
      type: 'email',
      next: '/companies',
    })
  })

  it('always sends a reset link to the new-password page', () => {
    expect(parseEmailConfirmParams(q('token_hash=abc&type=recovery&next=/dashboard'))?.next).toBe('/reset-password')
    expect(parseEmailConfirmParams(q('token_hash=abc&type=recovery'))?.next).toBe('/reset-password')
  })

  it('refuses a link with no token or an unknown type', () => {
    expect(parseEmailConfirmParams(q('type=email'))).toBeNull()
    expect(parseEmailConfirmParams(q('token_hash=abc'))).toBeNull()
    expect(parseEmailConfirmParams(q('token_hash=abc&type=admin'))).toBeNull()
  })

  it('never sends anyone to another site', () => {
    for (const next of ['//evil.example', 'https://evil.example', 'evil.example', '/\\evil.example']) {
      expect(safeNextPath(next)).toBe('/dashboard')
    }
    expect(parseEmailConfirmParams(q('token_hash=abc&type=email&next=https://evil.example'))?.next).toBe('/dashboard')
  })

  it('explains a spent reset link in plain words', () => {
    expect(emailLinkErrorMessage('recovery', 'Email link is invalid or has expired')).toMatch(/expired or has already been used/)
    expect(emailLinkErrorMessage('email')).not.toMatch(/token|otp|verify/i)
  })
})
