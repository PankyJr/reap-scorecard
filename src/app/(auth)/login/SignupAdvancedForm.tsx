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
  'block w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20 disabled:opacity-60'

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

const SIGNUP_DRAFT_KEY = 'reap-signup-draft'

export function SignupAdvancedForm({ nextUrl, onBusyChange }: Props) {
  const [isRedirectPending, startTransition] = useTransition()
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  })

  // A failed sign-up comes back as a fresh page with an error. Bring back the
  // name and e-mail so the person only fixes what was wrong (never the password).
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(SIGNUP_DRAFT_KEY)
      if (!saved) return
      const draft = JSON.parse(saved) as { full_name?: string; email?: string }
      if (new URLSearchParams(window.location.search).has('error')) {
        if (draft.full_name) setValue('full_name', draft.full_name)
        if (draft.email) setValue('email', draft.email, { shouldValidate: true })
      } else {
        window.sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
      }
    } catch {
      // Storage unavailable (private mode): the person retypes, nothing breaks.
    }
  }, [setValue])

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
    try {
      window.sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify({ full_name: data.full_name, email: data.email }))
    } catch {
      // Storage unavailable: nothing to restore after an error.
    }
    startTransition(async () => {
      await signup(fd)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-[15px] font-semibold text-ink">
          Full name
        </label>
        <input
          id="full_name"
          autoComplete="name"
          placeholder="John Doe"
          disabled={busy}
          aria-invalid={errors.full_name ? 'true' : 'false'}
          aria-describedby={errors.full_name ? 'full_name-error' : undefined}
          className={`${textInputClassName} ${errors.full_name ? 'border-bad/30 focus:border-bad/30 focus:ring-red-100' : ''}`}
          {...register('full_name')}
        />
        {errors.full_name ? (
          <p id="full_name-error" className="mt-1.5 text-sm text-bad" role="alert">
            {errors.full_name.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-[15px] font-semibold text-ink">
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
          className={`${textInputClassName} ${errors.email ? 'border-bad/30 focus:border-bad/30 focus:ring-red-100' : ''}`}
          {...register('email')}
        />
        {errors.email ? (
          <p id="email-error" className="mt-1.5 text-sm text-bad" role="alert">
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
        <div className="space-y-3 rounded-lg border border-line bg-sunken/80 px-3 py-3">
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
          className={`text-sm font-medium ${matchState === 'match' ? 'text-ok' : matchState === 'mismatch' ? 'text-bad' : 'text-muted'}`}
          role="status"
          aria-live="polite"
        >
          {matchState === 'match' && 'Passwords match'}
          {matchState === 'mismatch' && 'Passwords do not match'}
        </p>
      )}

      <p className="text-sm leading-relaxed text-muted">
        Use a unique password you don&apos;t reuse on other sites. Avoid names, dates, or predictable patterns.
      </p>

      <div className="pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-brand bg-brand px-4 py-3 text-base font-semibold text-brand-ink transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 disabled:opacity-60 disabled:pointer-events-none"
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
