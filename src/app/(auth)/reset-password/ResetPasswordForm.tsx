'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useTransition, Suspense } from 'react'
import { resetPassword } from '../login/actions'

function ResetPasswordFormInner() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(urlError ?? '')

  function handleSubmit(formData: FormData) {
    const pw = formData.get('password') as string
    const confirm = formData.get('confirm_password') as string

    if (pw !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (pw.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setError('')
    startTransition(async () => {
      try { await resetPassword(formData) } catch {}
    })
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          minLength={6}
          disabled={isPending}
          className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="confirm_password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
          Confirm password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          minLength={6}
          disabled={isPending}
          className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-[13px] font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className="pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
        >
          {isPending ? (
            <svg className="h-5 w-5 animate-spin text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : 'Update password'}
        </button>
      </div>
    </form>
  )
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-lg bg-slate-100" />}>
      <ResetPasswordFormInner />
    </Suspense>
  )
}
