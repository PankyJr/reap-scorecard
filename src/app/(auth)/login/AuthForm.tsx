'use client'

import { buttonStyles } from '@/components/ui/buttonStyles'
import { Callout } from '@/components/ui/Callout'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useTransition, Suspense, useEffect, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import {
  login,
  forgotPassword,
  signInWithGoogle,
  signInWithMicrosoft,
  resendSignupConfirmation,
  type OAuthInitResult,
} from './actions'
import { SignupAdvancedForm } from './SignupAdvancedForm'
import type { OAuthProviderId } from '@/lib/auth/oauth-errors'

type AuthMode = 'login' | 'signup' | 'forgot'

/**
 * Providers the project actually has enabled, resolved on the server by
 * `getEnabledOAuthProviders()`. Defaults to none: a button is only ever shown
 * once we have positive confirmation the provider works.
 */
type OAuthProps = { enabledOAuthProviders?: OAuthProviderId[] }

/** Icon-only OAuth — tight row inside one surface (no stacked “app store” boxes) */
const oauthIconButtonClassName =
  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-control-line bg-surface text-ink transition-[border-color,background-color,transform] duration-200 hover:border-line-strong hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40'

function OAuthIconButton({
  onClick,
  disabled,
  loading,
  label,
  children,
}: {
  onClick: () => void
  disabled: boolean
  loading: boolean
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={oauthIconButtonClassName}
    >
      {loading ? (
        <Spinner className="h-5 w-5 animate-spin text-faint" />
      ) : (
        <span className="flex h-[22px] w-[22px] items-center justify-center">{children}</span>
      )}
    </button>
  )
}

function AuthFormInner({ enabledOAuthProviders = [] }: OAuthProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlMode = searchParams.get('mode')
  const urlError = searchParams.get('error')
  const urlSuccess = searchParams.get('success')
  const rawNext = searchParams.get('next')
  const confirmEmail = (searchParams.get('email') ?? '').trim()
  const nextUrl = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://')
    ? rawNext
    : '/dashboard'

  const initialMode: AuthMode =
    urlMode === 'signup' ? 'signup' : urlMode === 'forgot' ? 'forgot' : 'login'

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(urlError ?? '')
  const [success, setSuccess] = useState(urlSuccess ?? '')
  const [oauthPending, setOauthPending] = useState<'google' | 'microsoft' | null>(null)
  const [signupBusy, setSignupBusy] = useState(false)

  useEffect(() => {
    setError(urlError ?? '')
    setSuccess(urlSuccess ?? '')
  }, [urlError, urlSuccess])

  useEffect(() => {
    setMode(urlMode === 'signup' ? 'signup' : urlMode === 'forgot' ? 'forgot' : 'login')
  }, [urlMode])

  useEffect(() => {
    if (mode !== 'signup') setSignupBusy(false)
  }, [mode])

  const isSignupEmailSent = mode === 'signup' && Boolean(success)
  const isForgotEmailSent = mode === 'forgot' && Boolean(success)
  const needsConfirmationHelp =
    (urlMode === 'confirm' || error.toLowerCase().includes('confirm your email')) &&
    Boolean(confirmEmail)
  const oauthBusy = Boolean(oauthPending) || isPending || signupBusy

  // Supabase calls Microsoft "azure"; the UI calls it Microsoft.
  const googleEnabled = enabledOAuthProviders.includes('google')
  const microsoftEnabled = enabledOAuthProviders.includes('azure')
  const hasOAuthProviders = googleEnabled || microsoftEnabled

  function switchMode(next: AuthMode) {
    setMode(next)
    setError('')
    setSuccess('')
    const base = next === 'login' ? '/login' : `/login?mode=${next}`
    const url = nextUrl !== '/dashboard' ? `${base}${base.includes('?') ? '&' : '?'}next=${encodeURIComponent(nextUrl)}` : base
    window.history.replaceState(null, '', url)
  }

  function runOAuth(
    action: (fd: FormData) => Promise<OAuthInitResult>,
    key: 'google' | 'microsoft',
  ) {
    setError('')
    setOauthPending(key)
    const fd = new FormData()
    fd.set('next', nextUrl)
    startTransition(async () => {
      try {
        const result = await action(fd)
        if (result.ok) {
          // Full page navigation — required so Safari (and others) don’t treat IdP URLs as downloads
          // when the URL was returned from a Server Action over fetch().
          window.location.assign(result.url)
          return
        }
        setError(result.error)
      } catch {
        setError('Something went wrong. Please try again.')
      } finally {
        setOauthPending(null)
      }
    })
  }

  function handleGoogle() {
    runOAuth(signInWithGoogle, 'google')
  }

  function handleMicrosoft() {
    runOAuth(signInWithMicrosoft, 'microsoft')
  }

  function loginHrefWithNext() {
    return nextUrl !== '/dashboard' ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login'
  }

  function signupHrefWithNext() {
    return nextUrl !== '/dashboard'
      ? `/login?mode=signup&next=${encodeURIComponent(nextUrl)}`
      : '/login?mode=signup'
  }

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    login: { heading: 'Sign in', sub: 'Use the email and password you registered with.' },
    signup: { heading: 'Create your account', sub: 'It takes a minute. We email you a link to confirm your address.' },
    forgot: { heading: 'Reset your password', sub: 'Enter your email and we will send you a link to choose a new password.' },
  }

  return (
    <div className="w-full">
      {!(isSignupEmailSent || isForgotEmailSent) && (
        <div className="text-center">
          <h1 className="text-title font-semibold text-ink">{titles[mode].heading}</h1>
          <p className="mt-1 text-body text-label">{titles[mode].sub}</p>
        </div>
      )}

      {/* Error / Success banners */}
      {error && <Callout tone="danger" className="mt-6">{error}</Callout>}
      {success && !isSignupEmailSent && !isForgotEmailSent && <Callout tone="success" className="mt-6">{success}</Callout>}

      {isSignupEmailSent && (
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-line/90 bg-surface px-6 py-8 shadow-[0_4px_48px_rgba(5,30,33,0.07)] ring-1 ring-slate-900/[0.04]">
          <div
            className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand via-brand to-brand"
            aria-hidden
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-teal-900/15">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-title font-semibold text-ink">
            Check your email
          </h2>
          <p className="mt-1 text-body text-label">{success}</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.replace(loginHrefWithNext())}
              className={buttonStyles({ variant: 'primary', className: 'w-full' })}
            >
              Back to sign in
            </button>
            <button
              type="button"
              onClick={() => router.replace(signupHrefWithNext())}
              className={buttonStyles({ variant: 'plain', className: 'w-full' })}
            >
              Use a different email
            </button>
          </div>
        </div>
      )}

      {isForgotEmailSent && (
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-line/90 bg-surface px-6 py-8 shadow-[0_4px_48px_rgba(5,30,33,0.07)] ring-1 ring-slate-900/[0.04]">
          <div
            className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand via-brand to-brand"
            aria-hidden
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-teal-900/15">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-title font-semibold text-ink">
            Check your inbox
          </h2>
          <p className="mt-1 text-body text-label">{success}</p>
          <button
            type="button"
            onClick={() => router.replace(loginHrefWithNext())}
            className={buttonStyles({ variant: 'primary', className: 'mt-6 w-full' })}
          >
            Back to sign in
          </button>
        </div>
      )}

      {needsConfirmationHelp && (
        <form action={resendSignupConfirmation} className="mt-4 rounded-control border border-line bg-sunken px-4 py-3">
          <input type="hidden" name="email" value={confirmEmail} />
          <p className="text-meta text-muted">
            Need a new verification link for <span className="font-medium text-ink">{confirmEmail}</span>?
          </p>
          <button
            type="submit"
            disabled={isPending}
            className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-2' })}
          >
            Resend verification email
          </button>
        </form>
      )}

      {/* OAuth — Google & Microsoft; label-only for screen readers */}
      {hasOAuthProviders && mode !== 'forgot' && !isSignupEmailSent && (
        <>
          <div className="mt-7">
            <span className="sr-only">
              {googleEnabled && microsoftEnabled
                ? 'Sign in with Google or Microsoft'
                : googleEnabled
                  ? 'Sign in with Google'
                  : 'Sign in with Microsoft'}
            </span>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" aria-hidden />
              <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line/90 bg-sunken/90 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {googleEnabled && (
                <OAuthIconButton
                  onClick={handleGoogle}
                  disabled={oauthBusy}
                  loading={oauthPending === 'google'}
                  label="Continue with Google"
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="h-[22px] w-[22px]">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </OAuthIconButton>
                )}
                {microsoftEnabled && (
                <OAuthIconButton
                  onClick={handleMicrosoft}
                  disabled={oauthBusy}
                  loading={oauthPending === 'microsoft'}
                  label="Continue with Microsoft"
                >
                  <svg viewBox="0 0 21 21" aria-hidden className="h-[22px] w-[22px]">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                </OAuthIconButton>
                )}
              </div>
              <div className="h-px flex-1 bg-line" aria-hidden />
            </div>
          </div>

          <div className="relative mt-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line/90" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-3 text-meta text-label">
                or continue with email
              </span>
            </div>
          </div>
        </>
      )}

      {/* Email form — signup uses advanced password UX + confirm; login/forgot stay on server action form */}
      {!isSignupEmailSent && !isForgotEmailSent && (
        <>
          {mode === 'signup' ? (
            <div className="space-y-4">
              <SignupAdvancedForm nextUrl={nextUrl} onBusyChange={setSignupBusy} />
            </div>
          ) : (
            // The form posts straight to the server action, so it signs in even
            // when it is submitted before the page's JavaScript has loaded: on a
            // phone a fast tap (often right after password autofill) beats it.
            <form
              action={mode === 'login' ? login : forgotPassword}
              className="mt-6 space-y-4"
            >
              <input type="hidden" name="next" value={nextUrl} />
              <div>
                <label htmlFor="email" className="mb-1.5 block text-body font-medium text-ink">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  className="block h-11 w-full rounded-control border border-control-line bg-surface px-3.5 text-body text-ink placeholder:text-subtle transition-[border-color,box-shadow] duration-200 focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/20 disabled:opacity-60 sm:h-10"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="block text-body font-medium text-ink">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="-my-3 inline-flex min-h-11 items-center text-meta font-medium text-teal hover:underline sm:my-0 sm:min-h-0"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    className="block h-11 w-full rounded-control border border-control-line bg-surface px-3.5 text-body text-ink placeholder:text-subtle transition-[border-color,box-shadow] duration-200 focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/20 disabled:opacity-60 sm:h-10"
                  />
                </div>
              )}

              <div className="pt-1">
                <AuthSubmitButton label={mode === 'login' ? 'Sign in' : 'Send reset link'} />
              </div>
            </form>
          )}
        </>
      )}

      {/* Mode switch */}
      {!isSignupEmailSent && !isForgotEmailSent && (
      <div className="mt-6 text-center text-body text-label">
        {mode === 'login' && (
          <>
            Don&apos;t have an account?{' '}
            <button onClick={() => switchMode('signup')} className="-my-3 inline-flex min-h-11 items-center font-medium text-teal hover:underline sm:my-0 sm:min-h-0">
              Create account
            </button>
          </>
        )}
        {mode === 'signup' && (
          <>
            Already have an account?{' '}
            <button onClick={() => switchMode('login')} className="-my-3 inline-flex min-h-11 items-center font-medium text-teal hover:underline sm:my-0 sm:min-h-0">
              Sign in
            </button>
          </>
        )}
        {mode === 'forgot' && (
          <>
            Remember your password?{' '}
            <button onClick={() => switchMode('login')} className="-my-3 inline-flex min-h-11 items-center font-medium text-teal hover:underline sm:my-0 sm:min-h-0">
              Back to sign in
            </button>
          </>
        )}
      </div>
      )}
    </div>
  )
}

/** Reads the enclosing form's own pending state, so it works with a plain server-action form. */
function AuthSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonStyles({ variant: 'primary', size: 'lg', className: 'w-full' })}
    >
      {pending ? <Spinner /> : label}
    </button>
  )
}

function Spinner({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <svg
      className={className ?? `h-5 w-5 animate-spin ${dark ? 'text-faint' : 'text-on-teal-muted'}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export function AuthForm({ enabledOAuthProviders = [] }: OAuthProps) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-[340px] h-96 animate-pulse rounded-lg bg-sunken" />}>
      <AuthFormInner enabledOAuthProviders={enabledOAuthProviders} />
    </Suspense>
  )
}
