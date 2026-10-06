import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/utils/supabase/server', () => ({
  createRouteHandlerClient: () => ({ auth: { verifyOtp: mocks.verifyOtp } }),
}))
vi.mock('@/lib/supabase/public-env', () => ({ isSupabasePublicConfigComplete: () => true }))
vi.mock('@/lib/auth/auth-errors', () => ({ logAuthError: vi.fn() }))

import { GET } from '../route'

const open = (query: string) => GET(new NextRequest(`https://reap.example/auth/confirm?${query}`))

describe('/auth/confirm: e-mail links that work in any browser', () => {
  beforeEach(() => mocks.verifyOtp.mockReset())

  it('confirms a reset link and opens the new-password page, with no cookie needed', async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null })
    const res = await open('token_hash=h1&type=recovery')
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'h1' })
    expect(res.headers.get('location')).toBe('https://reap.example/reset-password')
  })

  it('confirms a sign-up link and goes where the link says, on this site only', async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null })
    expect((await open('token_hash=h2&type=email&next=/companies')).headers.get('location')).toBe('https://reap.example/companies')
    expect((await open('token_hash=h2&type=email&next=https://evil.example')).headers.get('location')).toBe('https://reap.example/dashboard')
  })

  it('sends a spent reset link back to Forgot password with a plain message', async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: 'Email link is invalid or has expired' } })
    const location = (await open('token_hash=old&type=recovery')).headers.get('location') ?? ''
    expect(location.startsWith('https://reap.example/login?mode=forgot&error=')).toBe(true)
    expect(decodeURIComponent(location)).toMatch(/expired or has already been used/)
  })

  it('refuses a link without a token, without calling Supabase', async () => {
    const location = (await open('type=email')).headers.get('location') ?? ''
    expect(mocks.verifyOtp).not.toHaveBeenCalled()
    expect(location.startsWith('https://reap.example/login?error=')).toBe(true)
  })
})
