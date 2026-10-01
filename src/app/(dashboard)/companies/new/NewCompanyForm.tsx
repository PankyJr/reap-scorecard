'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import Link from 'next/link'
import { Notice } from '@/components/ui/Notice'
import { buttonStyles } from '@/components/ui/buttonStyles'

/**
 * Only the company name is required. Contact details are useful for reports
 * but are not needed to start a scorecard, so they never block the first step.
 */
const newCompanySchema = z.object({
  name: z.string().trim().min(1, 'Enter the company name.').max(200, 'The company name is too long (200 characters at most).'),
  industry: z.string().max(120, 'Industry is too long (120 characters at most).').optional().or(z.literal('')),
  contact_person: z.string().max(120, 'Contact name is too long (120 characters at most).').optional().or(z.literal('')),
  email: z.string().email('Enter a valid email address, like name@company.co.za.').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone number is too long.').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes are too long (2,000 characters at most).').optional().or(z.literal('')),
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

const inputClass =
  'block w-full rounded-control border bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-sm font-medium text-bad">{message}</p>
}

export function NewCompanyForm({
  formId,
  initialError,
  initialValues,
  cancelHref,
  cancelLabel = 'Cancel',
  saveLabel = 'Save company',
}: NewCompanyFormProps) {
  const [serverError, setServerError] = useState(initialError)
  const [saving, setSaving] = useState(false)

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

  const border = (hasError: boolean) => (hasError ? 'border-bad' : 'border-line-strong')

  return (
    <div className="space-y-6">
      {serverError ? (
        <Notice tone="bad" title="The company was not saved">
          {serverError}
        </Notice>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="name" className="block text-[15px] font-semibold text-ink">
            Company name
          </label>
          <p className="text-sm text-muted">The registered or trading name, as it should appear on reports.</p>
          <input
            type="text"
            id="name"
            {...register('name')}
            name="name"
            autoComplete="organization"
            className={`mt-2 ${inputClass} ${border(!!errors.name)}`}
            aria-invalid={errors.name ? 'true' : 'false'}
            placeholder="For example, Mokoena Logistics (Pty) Ltd"
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div>
          <label htmlFor="industry" className="block text-[15px] font-semibold text-ink">
            Industry <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            type="text"
            id="industry"
            {...register('industry')}
            name="industry"
            className={`mt-2 ${inputClass} ${border(!!errors.industry)}`}
            placeholder="For example, transport, retail, manufacturing"
          />
          <FieldError message={errors.industry?.message} />
        </div>

        <div>
          <label htmlFor="contact_person" className="block text-[15px] font-semibold text-ink">
            Contact person <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            type="text"
            id="contact_person"
            {...register('contact_person')}
            name="contact_person"
            autoComplete="name"
            className={`mt-2 ${inputClass} ${border(!!errors.contact_person)}`}
          />
          <FieldError message={errors.contact_person?.message} />
        </div>

        <div>
          <label htmlFor="email" className="block text-[15px] font-semibold text-ink">
            Email <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            type="email"
            id="email"
            {...register('email')}
            name="email"
            autoComplete="email"
            className={`mt-2 ${inputClass} ${border(!!errors.email)}`}
            placeholder="name@company.co.za"
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <label htmlFor="phone" className="block text-[15px] font-semibold text-ink">
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            {...register('phone')}
            name="phone"
            autoComplete="tel"
            className={`mt-2 ${inputClass} ${border(!!errors.phone)}`}
            placeholder="012 345 6789"
          />
          <FieldError message={errors.phone?.message} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notes" className="block text-[15px] font-semibold text-ink">
            Notes <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="notes"
            {...register('notes')}
            name="notes"
            rows={3}
            className={`mt-2 resize-y ${inputClass} ${border(!!errors.notes)}`}
            placeholder="Anything the team should know about this client."
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <Link href={cancelHref} className={buttonStyles({ variant: 'secondary' })}>
            {cancelLabel}
          </Link>
        ) : null}
        <button
          type="button"
          data-tour="company-form-save"
          onClick={handleSubmit(onValid)}
          disabled={isSubmitting || saving}
          className={buttonStyles({ variant: 'primary' })}
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  )
}
