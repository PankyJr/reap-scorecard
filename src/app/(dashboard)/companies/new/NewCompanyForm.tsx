'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

const newCompanySchema = z.object({
  name: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name is too long'),
  industry: z
    .string()
    .max(120, 'Industry is too long')
    .optional()
    .or(z.literal('')),
  contact_person: z
    .string()
    .max(120, 'Contact person is too long')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(50, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .max(2000, 'Notes are too long')
    .optional()
    .or(z.literal('')),
})

type NewCompanyFormValues = z.infer<typeof newCompanySchema>

interface NewCompanyFormProps {
  formId: string
  initialError?: string
  initialValues?: Partial<NewCompanyFormValues>
  cancelHref?: string
  cancelLabel?: string
  saveLabel?: string
}

export function NewCompanyForm({
  formId,
  initialError,
  initialValues,
  cancelHref,
  cancelLabel = 'Cancel',
  saveLabel = 'Save Company',
}: NewCompanyFormProps) {
  const [serverError, setServerError] = useState(initialError)
  const [saving, setSaving] = useState(false)

  const fieldBase =
    'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60'
  const fieldFocus =
    'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/60'
  const fieldErrorFocus =
    'focus:border-red-500 focus:ring-4 focus:ring-red-200/70'

  function fieldClass(hasError: boolean) {
    return [
      fieldBase,
      hasError ? 'border-red-200' : 'border-slate-200/80',
      hasError ? fieldErrorFocus : fieldFocus,
    ].join(' ')
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewCompanyFormValues>({
    resolver: zodResolver(newCompanySchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      industry: initialValues?.industry ?? '',
      contact_person: initialValues?.contact_person ?? '',
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      notes: initialValues?.notes ?? '',
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="name"
            className="block text-sm font-semibold tracking-tight text-slate-900"
          >
            Company Name{' '}
            <span className="text-red-500 font-semibold" aria-hidden="true">
              *
            </span>
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            name="name"
            className={fieldClass(!!errors.name)}
            aria-invalid={errors.name ? 'true' : 'false'}
            placeholder="Acme Corp"
          />
          {errors.name && (
            <p className="text-xs font-medium text-red-600 mt-1.5">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="industry"
            className="block text-sm font-semibold tracking-tight text-slate-900"
          >
            Industry
          </label>
          <input
            type="text"
            id="industry"
            {...register('industry')}
            name="industry"
            className={fieldClass(!!errors.industry)}
            aria-invalid={errors.industry ? 'true' : 'false'}
            placeholder="Technology, Retail, etc."
          />
          {errors.industry && (
            <p className="text-xs font-medium text-red-600 mt-1.5">
              {errors.industry.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="contact_person"
            className="block text-sm font-semibold tracking-tight text-slate-900"
          >
            Contact Person
          </label>
          <input
            type="text"
            id="contact_person"
            {...register('contact_person')}
            name="contact_person"
            className={fieldClass(!!errors.contact_person)}
            aria-invalid={errors.contact_person ? 'true' : 'false'}
            placeholder="Jane Doe"
          />
          {errors.contact_person && (
            <p className="text-xs font-medium text-red-600 mt-1.5">
              {errors.contact_person.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-semibold tracking-tight text-slate-900"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            {...register('email')}
            name="email"
            className={fieldClass(!!errors.email)}
            aria-invalid={errors.email ? 'true' : 'false'}
            placeholder="jane@acme.com"
          />
          {errors.email && (
            <p className="text-xs font-medium text-red-600 mt-1.5">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="phone"
            className="block text-sm font-semibold tracking-tight text-slate-900"
          >
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            {...register('phone')}
            name="phone"
            className={fieldClass(!!errors.phone)}
            aria-invalid={errors.phone ? 'true' : 'false'}
            placeholder="+1 555 123 4567"
          />
          {errors.phone && (
            <p className="text-xs font-medium text-red-600 mt-1.5">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="notes"
            className="block text-sm font-semibold tracking-tight text-slate-900"
          >
            Additional Notes
          </label>
          <textarea
            id="notes"
            {...register('notes')}
            name="notes"
            rows={4}
            className={`${fieldClass(!!errors.notes)} resize-none`}
            aria-invalid={errors.notes ? 'true' : 'false'}
            placeholder="Optional notes or background info..."
          />
          {errors.notes && (
            <p className="text-xs font-medium text-red-600 mt-1.5">
              {errors.notes.message}
            </p>
          )}
        </div>
      </div>

      {(serverError || Object.keys(errors).length > 0) && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">
                Please fix your submission
              </p>
              <p className="mt-1 text-sm leading-6 text-red-700">
                {serverError || 'Please correct the highlighted fields and try again.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-end pt-4 border-t border-slate-100 gap-3">
        {cancelHref ? (
          <Link
            href={cancelHref}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {cancelLabel}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleSubmit(onValid)}
          disabled={isSubmitting || saving}
          className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-xl shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300/60 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </>
  )
}
  