import { describe, expect, it, vi, afterEach } from 'vitest'
import { isSupabasePublicConfigComplete } from '../public-env'

describe('isSupabasePublicConfigComplete', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when URL is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    expect(isSupabasePublicConfigComplete()).toBe(false)
  })

  it('returns false when anon and publishable keys are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    expect(isSupabasePublicConfigComplete()).toBe(false)
  })

  it('returns true when URL and anon key are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    expect(isSupabasePublicConfigComplete()).toBe(true)
  })

  it('returns true when URL and publishable key alias are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub')
    expect(isSupabasePublicConfigComplete()).toBe(true)
  })
})
