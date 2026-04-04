'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPassword } from '../login/actions'
import { resetPasswordFormSchema, type ResetPasswordFormValues } from '@/lib/reset-password-schema'
import {
  PasswordFieldWithToggle,
  PasswordStrengthMeter,
  RequirementsList,
  usePasswordStrengthAndMatch,
} from '@/components/auth/advanced-password-fields'

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-5 w-5 animate-spin text-slate-400'}
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

function ResetPasswordFormInner() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { password: '', confirm_password: '' },
  })

  const password = watch('password') ?? ''
  const confirm = watch('confirm_password') ?? ''
  const { strength, matchState } = usePasswordStrengthAndMatch(password, confirm)

  useEffect(() => {
    if (urlError) setServerError(urlError)
  }, [urlError])

  const canSubmit = isValid && !isSubmitting

  async function onSubmit(data: ResetPasswordFormValues) {
    setServerError(null)
    const fd = new FormData()
    fd.set('password', data.password)
    fd.set('confirm_password', data.confirm_password)
    const result = await resetPassword(fd)
    if (result.ok) {
      setSuccess(true)
    } else {
      setServerError(result.error)
    }
  }

  if (success) {
    return (
      <div className="mt-6 space-y-5 rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-[17px] font-semibold text-slate-900">Password updated</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Your password has been changed. Sign in with your new credentials.
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="text-left">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900">Set new password</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
          Choose a strong password for your account.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <PasswordFieldWithToggle
          id="password"
          name="password"
          label="New password"
          autoComplete="new-password"
          register={register}
          error={errors.password?.message}
          disabled={isSubmitting}
          show={showPw}
          onToggleShow={() => setShowPw(s => !s)}
        />

        {password.length > 0 && (
          <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
            <PasswordStrengthMeter segments={strength} />
            <RequirementsList password={password} />
          </div>
        )}

        <PasswordFieldWithToggle
          id="confirm_password"
          name="confirm_password"
          label="Confirm password"
          autoComplete="new-password"
          register={register}
          error={errors.confirm_password?.message}
          disabled={isSubmitting}
          show={showCf}
          onToggleShow={() => setShowCf(s => !s)}
        />

        {confirm.length > 0 && (
          <p
            className={`text-[12px] font-medium ${matchState === 'match' ? 'text-emerald-700' : matchState === 'mismatch' ? 'text-red-600' : 'text-slate-500'}`}
            role="status"
            aria-live="polite"
          >
            {matchState === 'match' && 'Passwords match'}
            {matchState === 'mismatch' && 'Passwords do not match'}
          </p>
        )}

        <p className="text-[12px] leading-relaxed text-slate-500">
          Use a unique password you don&apos;t reuse on other sites. Avoid names, dates, or predictable patterns.
        </p>

        {serverError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5" role="alert">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-[13px] font-medium text-red-800">{serverError}</p>
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[14px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Spinner />
                <span>Updating password...</span>
              </>
            ) : (
              'Update password'
            )}
          </button>
        </div>

        <div className="text-left text-[13px] text-slate-500">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-600"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            Back to sign in
          </Link>
        </div>
      </form>
    </>
  )
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="mt-6 space-y-4">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  )
}
