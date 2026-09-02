import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
}))
vi.mock('../actions', () => ({
  login: vi.fn(),
  forgotPassword: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithMicrosoft: vi.fn(),
  resendSignupConfirmation: vi.fn(),
}))
vi.mock('../SignupAdvancedForm', () => ({ SignupAdvancedForm: () => null }))

import { AuthForm } from '../AuthForm'
import { getEnabledOAuthProviders } from '@/lib/auth/oauth-providers'

const GOOGLE = 'Continue with Google'
const MICROSOFT = 'Continue with Microsoft'
const DIVIDER = 'or continue with email'

function render(enabledOAuthProviders: Array<'google' | 'azure'>) {
  return renderToStaticMarkup(createElement(AuthForm, { enabledOAuthProviders }))
}

describe('OAuth buttons are only rendered for providers that exist', () => {
  // The defect this guards: both buttons rendered unconditionally, so clicking
  // one on a project with no providers threw the user out to a raw GoTrue JSON
  // page. If this test fails, that regression is back.
  it('renders no provider buttons, divider or "continue with email" when none are enabled', () => {
    const html = render([])
    expect(html).not.toContain(GOOGLE)
    expect(html).not.toContain(MICROSOFT)
    expect(html).not.toContain(DIVIDER)
    expect(html).not.toContain('Sign in with Google')
    expect(html).not.toContain('Sign in with Microsoft')
  })

  it('defaults to rendering nothing when the prop is omitted entirely', () => {
    const html = renderToStaticMarkup(createElement(AuthForm, {}))
    expect(html).not.toContain(GOOGLE)
    expect(html).not.toContain(MICROSOFT)
    expect(html).not.toContain(DIVIDER)
  })

  it('renders only Google when only Google is enabled', () => {
    const html = render(['google'])
    expect(html).toContain(GOOGLE)
    expect(html).not.toContain(MICROSOFT)
    expect(html).toContain(DIVIDER)
    expect(html).toContain('Sign in with Google')
    expect(html).not.toContain('Sign in with Google or Microsoft')
  })

  it('renders only Microsoft when only Microsoft (azure) is enabled', () => {
    const html = render(['azure'])
    expect(html).toContain(MICROSOFT)
    expect(html).not.toContain(GOOGLE)
    expect(html).toContain(DIVIDER)
  })

  it('renders both, and the combined label, when both are enabled', () => {
    const html = render(['google', 'azure'])
    expect(html).toContain(GOOGLE)
    expect(html).toContain(MICROSOFT)
    expect(html).toContain('Sign in with Google or Microsoft')
  })

  it('still renders the email sign-in form when no provider is enabled', () => {
    expect(render([])).toContain('Sign in with email')
  })
})

describe('getEnabledOAuthProviders', () => {
  const settings = (external: Record<string, unknown>) => ({
    ok: true,
    status: 200,
    json: async () => ({ external }),
  })

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns nothing when the project has every provider disabled', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => settings({ google: false, azure: false, email: true })))
    await expect(getEnabledOAuthProviders()).resolves.toEqual([])
  })

  it('returns only the providers the project has switched on', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => settings({ google: true, azure: false })))
    await expect(getEnabledOAuthProviders()).resolves.toEqual(['google'])
  })

  it('ignores enabled providers the app has no UI for', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => settings({ google: true, github: true, apple: true })))
    await expect(getEnabledOAuthProviders()).resolves.toEqual(['google'])
  })

  it('sends the anon key to the settings endpoint', async () => {
    const fetchMock = vi.fn(async () => settings({ google: true }))
    vi.stubGlobal('fetch', fetchMock)
    await getEnabledOAuthProviders()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://project.supabase.co/auth/v1/settings')
    expect((init.headers as Record<string, string>).apikey).toBe('anon-key')
  })

  // Every failure mode hides the buttons rather than showing one that breaks.
  it.each([
    ['the request throws', () => { throw new Error('network down') }],
    ['the response is not ok', () => ({ ok: false, status: 503, json: async () => ({}) })],
    ['the payload has no external block', () => ({ ok: true, status: 200, json: async () => ({}) })],
    ['a provider value is not a real true', () => ({ ok: true, status: 200, json: async () => ({ external: { google: 'true' } }) })],
  ])('fails closed when %s', async (_label, impl) => {
    vi.stubGlobal('fetch', vi.fn(async () => impl()))
    await expect(getEnabledOAuthProviders()).resolves.toEqual([])
  })

  it('fails closed when Supabase is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(getEnabledOAuthProviders()).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
