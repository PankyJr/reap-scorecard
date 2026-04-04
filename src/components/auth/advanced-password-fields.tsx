'use client'

import { useMemo } from 'react'
import type { FieldPath, FieldValues, UseFormRegister } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { getPasswordRuleChecks, getPasswordStrengthSegments, isCommonPassword } from '@/lib/password-policy'

export const advancedPasswordInputClassName =
  'block w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-3.5 pr-11 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 disabled:opacity-60 disabled:pointer-events-none'

export function PasswordStrengthMeter({ segments }: { segments: 0 | 1 | 2 | 3 | 4 }) {
  const labels = ['Weak', 'Fair', 'Good', 'Strong'] as const
  const active = segments === 0 ? 0 : segments
  const labelIdx = Math.max(0, Math.min(3, active - 1))

  return (
    <div className="space-y-2" aria-live="polite">
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={active}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label="Password strength"
      >
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < active ? 'bg-emerald-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <p className="text-[12px] text-slate-500">
        Strength:{' '}
        <span className="font-medium text-slate-700">{segments === 0 ? '—' : labels[labelIdx]}</span>
      </p>
    </div>
  )
}

export function RequirementsList({ password }: { password: string }) {
  const checks = useMemo(() => getPasswordRuleChecks(password), [password])
  const commonOk = Boolean(password) && !isCommonPassword(password)

  return (
    <ul className="space-y-1.5 text-[12px] text-slate-600" aria-label="Password requirements">
      {checks.map(rule => (
        <li key={rule.id} className="flex items-start gap-2">
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
              rule.met ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'
            }`}
            aria-hidden
          >
            {rule.met ? '✓' : ''}
          </span>
          <span className={rule.met ? 'text-slate-800' : 'text-slate-500'}>{rule.label}</span>
        </li>
      ))}
      <li className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
            commonOk ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'
          }`}
          aria-hidden
        >
          {commonOk ? '✓' : ''}
        </span>
        <span className={commonOk ? 'text-slate-800' : 'text-slate-500'}>Not a commonly used password</span>
      </li>
    </ul>
  )
}

type PasswordFieldName = 'password' | 'confirm_password'

export function PasswordFieldWithToggle<T extends FieldValues & Record<PasswordFieldName, string>>({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  register,
  error,
  disabled,
  show,
  onToggleShow,
}: {
  id: string
  name: FieldPath<T>
  label: string
  autoComplete: string
  placeholder?: string
  register: UseFormRegister<T>
  error?: string
  disabled: boolean
  show: boolean
  onToggleShow: () => void
}) {
  const showId = `${id}-show`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${advancedPasswordInputClassName} ${error ? 'border-red-200 focus:border-red-300 focus:ring-red-100' : ''}`}
          {...register(name)}
        />
        <button
          type="button"
          id={showId}
          onClick={onToggleShow}
          disabled={disabled}
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-slate-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function usePasswordStrengthAndMatch(password: string, confirm: string) {
  const strength = useMemo(() => getPasswordStrengthSegments(password), [password])
  const matchState = useMemo(() => {
    if (!confirm.length) return 'empty' as const
    if (password === confirm) return 'match' as const
    return 'mismatch' as const
  }, [password, confirm])
  return { strength, matchState }
}
