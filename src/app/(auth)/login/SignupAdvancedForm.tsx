'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signup } from './actions'
import { signupFormSchema, type SignupFormValues } from '@/lib/signup-form-schema'
import {
  PasswordFieldWithToggle,
  PasswordStrengthMeter,
  RequirementsList,
  usePasswordStrengthAndMatch,
} from '@/components/auth/advanced-password-fields'

const textInputClassName =
  'block w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60 disabled:pointer-events-none'

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
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

type Props = {
  nextUrl: string
  /** Keeps OAuth buttons disabled while signup is submitting or redirecting */
  onBusyChange?: (busy: boolean) => void
}

export function SignupAdvancedForm({ nextUrl, onBusyChange }: Props) {
  const [isRedirectPending, startTransition] = useTransition()
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  })

  const password = watch('password') ?? ''
  const confirm = watch('confirm_password') ?? ''
  const { strength, matchState } = usePasswordStrengthAndMatch(password, confirm)

  const busy = isSubmitting || isRedirectPending
  const canSubmit = isValid && !busy

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  function onSubmit(data: SignupFormValues) {
    const fd = new FormData()
    fd.set('full_name', data.full_name)
    fd.set('email', data.email)
    fd.set('password', data.password)
    fd.set('confirm_password', data.confirm_password)
    fd.set('next', nextUrl)
    startTransition(async () => {
      try {
        await signup(fd)
      } catch {
        // redirect() throws — expected
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-[13px] font-medium text-slate-700">
          Full name
        </label>
        <input
          id="full_name"
          autoComplete="name"
          placeholder="John Doe"
          disabled={busy}
          aria-invalid={errors.full_name ? 'true' : 'false'}
          aria-describedby={errors.full_name ? 'full_name-error' : undefined}
          className={`${textInputClassName} ${errors.full_name ? 'border-red-200 focus:border-red-300 focus:ring-red-100' : ''}`}
          {...register('full_name')}
        />
        {errors.full_name ? (
          <p id="full_name-error" className="mt-1.5 text-[12px] text-red-600" role="alert">
            {errors.full_name.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          disabled={busy}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={`${textInputClassName} ${errors.email ? 'border-red-200 focus:border-red-300 focus:ring-red-100' : ''}`}
          {...register('email')}
        />
        {errors.email ? (
          <p id="email-error" className="mt-1.5 text-[12px] text-red-600" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <PasswordFieldWithToggle
        id="password"
        name="password"
        label="Password"
        autoComplete="new-password"
        placeholder="••••••••"
        register={register}
        error={errors.password?.message}
        disabled={busy}
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
        placeholder="••••••••"
        register={register}
        error={errors.confirm_password?.message}
        disabled={busy}
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

      <div className="pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none"
        >
          {busy ? (
            <>
              <Spinner />
              <span>Creating account...</span>
            </>
          ) : (
            'Create account'
          )}
        </button>
      </div>
    </form>
  )
}
