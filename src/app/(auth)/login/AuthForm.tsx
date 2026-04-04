'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useTransition, Suspense, useEffect, type ReactNode } from 'react'
import {
  login,
  forgotPassword,
  signInWithGoogle,
  signInWithMicrosoft,
  type OAuthInitResult,
} from './actions'
import { SignupAdvancedForm } from './SignupAdvancedForm'

type AuthMode = 'login' | 'signup' | 'forgot'

/** Icon-only OAuth — tight row inside one surface (no stacked “app store” boxes) */
const oauthIconButtonClassName =
  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-900 transition duration-200 hover:bg-white hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40'

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
        <Spinner className="h-5 w-5 animate-spin text-slate-400" />
      ) : (
        <span className="flex h-[22px] w-[22px] items-center justify-center">{children}</span>
      )}
    </button>
  )
}

function AuthFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlMode = searchParams.get('mode')
  const urlError = searchParams.get('error')
  const urlSuccess = searchParams.get('success')
  const rawNext = searchParams.get('next')
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
  const oauthBusy = Boolean(oauthPending) || isPending || signupBusy

  function switchMode(next: AuthMode) {
    setMode(next)
    setError('')
    setSuccess('')
    const base = next === 'login' ? '/login' : `/login?mode=${next}`
    const url = nextUrl !== '/dashboard' ? `${base}${base.includes('?') ? '&' : '?'}next=${encodeURIComponent(nextUrl)}` : base
    window.history.replaceState(null, '', url)
  }

  function handleSubmit(formData: FormData) {
    formData.set('next', nextUrl)
    setError('')
    setSuccess('')
    startTransition(async () => {
      try {
        if (mode === 'login') await login(formData)
        else await forgotPassword(formData)
      } catch {
        // redirect() throws NEXT_REDIRECT — expected
      }
    })
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
    login: { heading: 'Welcome back', sub: 'Sign in to access your dashboard.' },
    signup: { heading: 'Create your account', sub: 'Get started with your REAP scorecard.' },
    forgot: { heading: 'Reset your password', sub: 'Enter your email and we\'ll send a reset link.' },
  }

  return (
    <div className="mx-auto w-full max-w-[340px]">
      {!(isSignupEmailSent || isForgotEmailSent) && (
        <div
          className={
            mode === 'login' || mode === 'signup'
              ? 'text-center'
              : ''
          }
        >
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900">
            {titles[mode].heading}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
            {titles[mode].sub}
          </p>
        </div>
      )}

      {/* Error / Success banners */}
      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-[13px] font-medium text-red-700">{error}</p>
        </div>
      )}
      {success && !isSignupEmailSent && !isForgotEmailSent && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <p className="text-[13px] font-medium text-emerald-700">{success}</p>
        </div>
      )}

      {isSignupEmailSent && (
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-6 py-8 shadow-[0_4px_48px_rgba(5,30,33,0.07)] ring-1 ring-slate-900/[0.04]">
          <div
            className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#051e21] via-teal-700 to-emerald-500"
            aria-hidden
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#051e21] text-white shadow-md shadow-teal-900/15">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-5 text-center text-[20px] font-semibold tracking-[-0.02em] text-slate-900">
            Check your email
          </h2>
          <p className="mt-3 text-center text-[14px] leading-[1.65] text-slate-500">{success}</p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.replace(loginHrefWithNext())}
              className="w-full rounded-xl bg-[#051e21] px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#0a2e32] active:scale-[0.99]"
            >
              Back to sign in
            </button>
            <button
              type="button"
              onClick={() => router.replace(signupHrefWithNext())}
              className="text-center text-[13px] font-medium text-slate-500 transition hover:text-slate-800"
            >
              Use a different email
            </button>
          </div>
        </div>
      )}

      {isForgotEmailSent && (
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-6 py-8 shadow-[0_4px_48px_rgba(5,30,33,0.07)] ring-1 ring-slate-900/[0.04]">
          <div
            className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#051e21] via-teal-700 to-emerald-500"
            aria-hidden
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#051e21] text-white shadow-md shadow-teal-900/15">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-5 text-center text-[20px] font-semibold tracking-[-0.02em] text-slate-900">
            Check your inbox
          </h2>
          <p className="mt-3 text-center text-[14px] leading-[1.65] text-slate-500">{success}</p>
          <button
            type="button"
            onClick={() => router.replace(loginHrefWithNext())}
            className="mt-8 w-full rounded-xl bg-[#051e21] px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#0a2e32] active:scale-[0.99]"
          >
            Back to sign in
          </button>
        </div>
      )}

      {/* OAuth — Google & Microsoft; label-only for screen readers */}
      {mode !== 'forgot' && !isSignupEmailSent && (
        <>
          <div className="mt-7">
            <span className="sr-only">Sign in with Google or Microsoft</span>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" aria-hidden />
              <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
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
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-200" aria-hidden />
            </div>
          </div>

          <div className="relative mt-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/90" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[12px] font-medium tracking-wide text-slate-400">
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
            <form action={handleSubmit} className={mode === 'forgot' ? 'mt-6 space-y-4' : 'space-y-4'}>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  disabled={isPending}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="block text-[13px] font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[12px] font-medium text-slate-400 transition-colors hover:text-slate-600"
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
                    disabled={isPending}
                    className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60"
                  />
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                >
                  {isPending ? <Spinner dark /> : mode === 'login' ? 'Sign in with email' : 'Send reset link'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Mode switch */}
      {!isSignupEmailSent && !isForgotEmailSent && (
      <div className="mt-6 text-center text-[13px] text-slate-500">
        {mode === 'login' && (
          <>
            Don&apos;t have an account?{' '}
            <button onClick={() => switchMode('signup')} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-600 hover:decoration-slate-600">
              Create account
            </button>
          </>
        )}
        {mode === 'signup' && (
          <>
            Already have an account?{' '}
            <button onClick={() => switchMode('login')} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-600 hover:decoration-slate-600">
              Sign in
            </button>
          </>
        )}
        {mode === 'forgot' && (
          <>
            Remember your password?{' '}
            <button onClick={() => switchMode('login')} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-600 hover:decoration-slate-600">
              Back to sign in
            </button>
          </>
        )}
      </div>
      )}
    </div>
  )
}

function Spinner({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <svg
      className={className ?? `h-5 w-5 animate-spin ${dark ? 'text-slate-400' : 'text-white/70'}`}
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

export function AuthForm() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-[340px] h-96 animate-pulse rounded-lg bg-slate-100" />}>
      <AuthFormInner />
    </Suspense>
  )
}
