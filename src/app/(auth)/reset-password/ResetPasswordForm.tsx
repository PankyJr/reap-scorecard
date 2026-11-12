'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { Callout } from '@/components/ui/Callout'
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
      className={className ?? 'h-5 w-5 animate-spin text-faint'}
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
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control border border-line text-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-6 text-title font-semibold text-ink">Password updated</h1>
        <p className="mt-1 text-body text-label">Your password has been changed. Sign in with your new credentials.</p>
        <Link href="/login" className={buttonStyles({ variant: 'primary', size: 'lg', className: 'mt-6 w-full' })}>
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-control border border-line text-icon">
          <KeyRound className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="text-title font-semibold text-ink">Set new password</h1>
        <p className="mt-1 text-body text-label">Choose a strong password for your account.</p>
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
          <div className="space-y-3 rounded-control border border-line bg-sunken px-3 py-3">
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
            className={`text-meta font-medium ${matchState === 'match' ? 'text-success' : matchState === 'mismatch' ? 'text-danger' : 'text-label'}`}
            role="status"
            aria-live="polite"
          >
            {matchState === 'match' && 'Passwords match'}
            {matchState === 'mismatch' && 'Passwords do not match'}
          </p>
        )}

        <p className="text-meta text-label">
          Use a unique password you don&apos;t reuse on other sites. Avoid names, dates, or predictable patterns.
        </p>

        {serverError && <Callout tone="danger">{serverError}</Callout>}

        <div className="pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className={buttonStyles({ variant: 'primary', size: 'lg', className: 'w-full' })}
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

        <div className="text-center text-body">
          <Link
            href="/login"
            className={buttonStyles({ variant: 'plain' })}
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
          <div className="h-10 animate-pulse rounded-lg bg-sunken" />
          <div className="h-24 animate-pulse rounded-lg bg-sunken" />
          <div className="h-10 animate-pulse rounded-lg bg-sunken" />
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  )
}
