import { describe, expect, it } from 'vitest'
import { userSafeAuthMessage } from '../auth-errors'

const RAW = [
  'Email address "a@reap-staging.example" is invalid',
  'Invalid login credentials',
  'Email not confirmed',
  'User already registered',
  'Email rate limit exceeded',
  'Invalid API key',
  'JWT expired',
  'something nobody expected',
]

describe('userSafeAuthMessage', () => {
  it('never shows a user the name of the service or a setup file', () => {
    for (const raw of RAW) {
      const message = userSafeAuthMessage(raw)
      expect(message, raw).not.toMatch(/supabase|\.env|NEXT_PUBLIC|anon key/i)
    }
  })

  it('says plainly when an address cannot receive the confirmation e-mail', () => {
    expect(userSafeAuthMessage('Email address "a@reap-staging.example" is invalid')).toMatch(/could not send a confirmation e-mail/i)
  })
})

describe('rate limits in plain words', () => {
  it('says the e-mail limit lasts an hour, not "a moment"', () => {
    // Supabase's built-in sender allows two auth e-mails an hour.
    expect(userSafeAuthMessage('email rate limit exceeded')).toBe(
      'Too many e-mails have been sent from this site in the last hour. Wait up to an hour, then try again.',
    )
  })

  it('asks for a few minutes when sign-in attempts are rate limited', () => {
    expect(userSafeAuthMessage('Request rate limit reached')).toBe('Too many attempts. Wait a few minutes, then try again.')
  })
})
