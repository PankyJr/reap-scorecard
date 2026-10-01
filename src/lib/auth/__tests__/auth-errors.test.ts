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
