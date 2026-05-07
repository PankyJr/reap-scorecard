'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import Link from 'next/link'
import { Calculator } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'

const scorecardSchema = z.object({
  ownership: z
    .number('Ownership score is required')
    .min(0, 'Ownership score must be at least 0'),
  management_control: z
    .number('Management Control score is required')
    .min(0, 'Management Control score must be at least 0'),
  skills_development: z
    .number('Skills Development score is required')
    .min(0, 'Skills Development score must be at least 0'),
  enterprise_development: z
    .number('Enterprise Development score is required')
    .min(0, 'Enterprise Development score must be at least 0'),
  socio_economic_development: z
    .number('Socio Economic Development score is required')
    .min(0, 'Socio Economic Development score must be at least 0'),
})

type ScorecardFormValues = z.infer<typeof scorecardSchema>

interface NewScorecardFormProps {
  formId: string
  initialError?: string
  initialValues?: Partial<ScorecardFormValues>
  cancelHref?: string
  cancelLabel?: string
  saveLabel?: string
}

export function NewScorecardForm({
  formId,
  initialError,
  initialValues,
  cancelHref,
  cancelLabel = 'Cancel',
  saveLabel = 'Calculate & Save Results',
}: NewScorecardFormProps) {
  const [serverError, setServerError] = useState(initialError)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ScorecardFormValues>({
    resolver: zodResolver(scorecardSchema),
    defaultValues: {
      ownership: initialValues?.ownership ?? 0,
      management_control: initialValues?.management_control ?? 0,
      skills_development: initialValues?.skills_development ?? 0,
      enterprise_development: initialValues?.enterprise_development ?? 0,
      socio_economic_development:
        initialValues?.socio_economic_development ?? 0,
    },
  })

  const onValid = () => {
    setServerError(undefined)
    setSaving(true)
    const form = document.getElementById(formId) as HTMLFormElement | null
    form?.requestSubmit()
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-sm">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            <Calculator className="h-3.5 w-3.5" />
            Score input
          </div>
          <h3 className="font-semibold text-slate-900">1. Ownership</h3>
          <div className="space-y-2">
            <label
              htmlFor="ownership"
              className="block text-sm font-medium text-slate-700"
            >
              Score (Max 25)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="ownership"
              {...register('ownership', { valueAsNumber: true })}
              name="ownership"
              className="w-full rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-4 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/70 focus:border-slate-900"
            />
            {errors.ownership && (
              <p className="text-xs text-red-600 mt-1">
                {errors.ownership.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900">2. Management Control</h3>
          <div className="space-y-2">
            <label
              htmlFor="management_control"
              className="block text-sm font-medium text-slate-700"
            >
              Score (Max 20)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="management_control"
              {...register('management_control', { valueAsNumber: true })}
              name="management_control"
              className="w-full rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-4 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/70 focus:border-slate-900"
            />
            {errors.management_control && (
              <p className="text-xs text-red-600 mt-1">
                {errors.management_control.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900">3. Skills Development</h3>
          <div className="space-y-2">
            <label
              htmlFor="skills_development"
              className="block text-sm font-medium text-slate-700"
            >
              Score (Max 20)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="skills_development"
              {...register('skills_development', { valueAsNumber: true })}
              name="skills_development"
              className="w-full rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-4 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/70 focus:border-slate-900"
            />
            {errors.skills_development && (
              <p className="text-xs text-red-600 mt-1">
                {errors.skills_development.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900">4. Enterprise Development</h3>
          <div className="space-y-2">
            <label
              htmlFor="enterprise_development"
              className="block text-sm font-medium text-slate-700"
            >
              Score (Max 25)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="enterprise_development"
              {...register('enterprise_development', { valueAsNumber: true })}
              name="enterprise_development"
              className="w-full rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-4 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/70 focus:border-slate-900"
            />
            {errors.enterprise_development && (
              <p className="text-xs text-red-600 mt-1">
                {errors.enterprise_development.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900">
            5. Socio Economic Development
          </h3>
          <div className="space-y-2">
            <label
              htmlFor="socio_economic_development"
              className="block text-sm font-medium text-slate-700"
            >
              Score (Max 10)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="socio_economic_development"
              {...register('socio_economic_development', { valueAsNumber: true })}
              name="socio_economic_development"
              className="w-full rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-4 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/70 focus:border-slate-900"
            />
            {errors.socio_economic_development && (
              <p className="text-xs text-red-600 mt-1">
                {errors.socio_economic_development.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {(serverError || Object.keys(errors).length > 0) && (
        <div className="text-red-600 bg-red-50 p-3 rounded-md text-sm font-medium">
          {serverError || 'Please correct the highlighted fields and try again.'}
        </div>
      )}

      <div className="mt-8 flex gap-3 border-t border-slate-200/80 pt-6 sm:justify-end">
        {cancelHref ? (
          <Link
            href={cancelHref}
            className={buttonStyles({ variant: 'secondary', size: 'md' })}
          >
            {cancelLabel}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleSubmit(onValid)}
          disabled={isSubmitting || saving}
          className={buttonStyles({ variant: 'primary', size: 'md' })}
        >
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </>
  )
}

