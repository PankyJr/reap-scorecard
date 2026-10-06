import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isOAuthProviderEnabled: vi.fn(),
  createClient: vi.fn(),
  signInWithOAuth: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: async () => new Map([['host', 'localhost:3002']]) as unknown as Headers,
}))
vi.mock('@/lib/auth/oauth-providers', () => ({
  isOAuthProviderEnabled: mocks.isOAuthProviderEnabled,
  getEnabledOAuthProviders: vi.fn(async () => []),
}))
vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }))

import { signInWithGoogle, signInWithMicrosoft } from '../actions'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createClient.mockResolvedValue({ auth: { signInWithOAuth: mocks.signInWithOAuth } })
  mocks.signInWithOAuth.mockResolvedValue({
    data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
    error: null,
  })
})

/**
 * `signInWithOAuth` builds its URL locally, so a disabled provider used to be
 * discovered only after the browser had navigated to GoTrue and been handed
 * raw JSON. The action must decide before any URL reaches the client.
 */
describe('OAuth init refuses a provider the project has not enabled', () => {
  it.each([
    ['Google', () => signInWithGoogle(), 'Google'],
    ['Microsoft', () => signInWithMicrosoft(), 'Microsoft'],
  ])('%s: returns the in-app message instead of a URL', async (_label, run, label) => {
    mocks.isOAuthProviderEnabled.mockResolvedValue(false)

    const result = await run()

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    // The existing copy from oauth-errors.ts, not a raw Supabase string.
    expect(result.error).toBe(
      `${label} sign-in is not enabled for this project yet. An administrator must enable it in Supabase Auth settings.`,
    )
    expect(result).not.toHaveProperty('url')
  })

  it('never reaches Supabase when the provider is disabled', async () => {
    mocks.isOAuthProviderEnabled.mockResolvedValue(false)
    await signInWithGoogle()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled()
  })

  it('still returns a URL to navigate to when the provider is enabled', async () => {
    mocks.isOAuthProviderEnabled.mockResolvedValue(true)
    const result = await signInWithGoogle()
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.url).toContain('/auth/v1/authorize')
    expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1)
  })

  it('checks the provider that was actually requested', async () => {
    mocks.isOAuthProviderEnabled.mockResolvedValue(true)
    await signInWithMicrosoft()
    expect(mocks.isOAuthProviderEnabled).toHaveBeenCalledWith('azure')
  })
})
