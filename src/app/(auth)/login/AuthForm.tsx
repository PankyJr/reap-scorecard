'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useTransition, Suspense } from 'react'
import { login, signup, forgotPassword, signInWithGoogle } from './actions'

type AuthMode = 'login' | 'signup' | 'forgot'

function AuthFormInner() {
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
        else if (mode === 'signup') await signup(formData)
        else await forgotPassword(formData)
      } catch {
        // redirect() throws NEXT_REDIRECT — expected
      }
    })
  }

  function handleGoogle() {
    setError('')
    const fd = new FormData()
    fd.set('next', nextUrl)
    startTransition(async () => {
      try { await signInWithGoogle(fd) } catch {}
    })
  }

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    login: { heading: 'Welcome back', sub: 'Sign in to access your dashboard.' },
    signup: { heading: 'Create your account', sub: 'Get started with your REAP scorecard.' },
    forgot: { heading: 'Reset your password', sub: 'Enter your email and we\'ll send a reset link.' },
  }

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900">
          {titles[mode].heading}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
          {titles[mode].sub}
        </p>
      </div>

      {/* Error / Success banners */}
      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-[13px] font-medium text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <p className="text-[13px] font-medium text-emerald-700">{success}</p>
        </div>
      )}

      {/* Google — primary CTA for login/signup */}
      {mode !== 'forgot' && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-slate-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            {isPending ? (
              <Spinner />
            ) : (
              <>
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#8ab4f8" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#81c995" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fdd663" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#e8710a" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[12px] text-slate-400">or use email</span>
            </div>
          </div>
        </div>
      )}

      {/* Email form */}
      <form action={handleSubmit} className={mode === 'forgot' ? 'mt-6 space-y-4' : 'space-y-4'}>
        {mode === 'signup' && (
          <div>
            <label htmlFor="full_name" className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Full name
            </label>
            <input
              id="full_name" name="full_name" type="text" autoComplete="name"
              placeholder="John Doe" required disabled={isPending}
              className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email" name="email" type="email" autoComplete="email"
            placeholder="you@company.com" required disabled={isPending}
            className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60"
          />
        </div>

        {mode !== 'forgot' && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-[13px] font-medium text-slate-700">
                Password
              </label>
              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')}
                  className="text-[12px] font-medium text-slate-400 transition-colors hover:text-slate-600">
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password" name="password" type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••" required minLength={6} disabled={isPending}
              className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60"
            />
          </div>
        )}

        <div className="pt-1">
          <button type="submit" disabled={isPending}
            className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none">
            {isPending ? <Spinner dark /> : mode === 'login' ? 'Sign in with email' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </div>
      </form>

      {/* Mode switch */}
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
    </div>
  )
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <svg className={`h-5 w-5 animate-spin ${dark ? 'text-slate-400' : 'text-white/70'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
