'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { MarketingButton } from '@/components/marketing/ui/button'
import { MarketingInput } from '@/components/marketing/ui/input'
import { MarketingTextarea } from '@/components/marketing/ui/textarea'
import { MarketingLabel } from '@/components/marketing/ui/label'
import { MarketingSelect, MarketingSelectOption } from '@/components/marketing/ui/select'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import {
  CONTACT_SERVICE_OPTIONS,
  MARKETING_CONTACT,
} from '@/components/marketing/marketingContactData'
import {
  marketingBrandBgClass,
  marketingBrandBgHoverClass,
} from '@/components/marketing/marketingLayout'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  serviceInterest: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  honeypot: z.string().max(0, 'Bot detected'),
})

type ContactFormData = z.infer<typeof contactSchema>

function resolveServiceFromQuery(params: URLSearchParams): string {
  const service = params.get('service')
  if (service && CONTACT_SERVICE_OPTIONS.some((o) => o.value === service)) {
    return service
  }

  const intent = params.get('intent')
  if (intent === 'training') return 'training'
  if (intent === 'scorecard') return 'scorecard'
  if (intent === 'consultation') return 'consultation'

  const program = params.get('program')
  if (program) return 'training'

  return ''
}

function buildDefaultMessage(params: URLSearchParams): string {
  const program = params.get('program')
  const intent = params.get('intent')
  if (!program && !intent) return ''

  const parts: string[] = []
  if (intent) parts.push(`Interest: ${intent}`)
  if (program) parts.push(`Programme: ${program.replace(/-/g, ' ')}`)
  return parts.length ? `${parts.join(' · ')}\n\n` : ''
}

export function MarketingContactForm() {
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceSelect, setServiceSelect] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  useEffect(() => {
    const service = resolveServiceFromQuery(searchParams)
    if (service) {
      setServiceSelect(service)
      setValue('serviceInterest', service)
    }
    const prefix = buildDefaultMessage(searchParams)
    if (prefix) {
      setValue('message', prefix)
    }
  }, [searchParams, setValue])

  const onSubmit = async (data: ContactFormData) => {
    if (data.honeypot) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/marketing/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error('Failed to send message')
      }

      const payload = (await response.json()) as { success?: boolean; error?: string }
      if (!payload.success) {
        throw new Error(payload.error ?? 'Failed to send message')
      }

      setIsSuccess(true)
      reset()
      setServiceSelect('')
      setTimeout(() => setIsSuccess(false), 5000)
    } catch {
      setError('Something went wrong. Please try again or email us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="border border-[#05363A]/25 bg-[#05363A]/5 p-8 sm:p-10">
        <div className="flex items-start gap-4 text-[#05363A]">
          <CheckCircle2 className="h-7 w-7 shrink-0" strokeWidth={1.5} aria-hidden />
          <div>
            <p className="text-lg font-semibold text-slate-900">Message sent</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Thank you—we&apos;ll get back to you soon. You can also reach us at{' '}
              <a href={`mailto:${MARKETING_CONTACT.email}`} className="font-medium text-[#05363A] hover:underline">
                {MARKETING_CONTACT.email}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 border-l-4 border-l-[#05363A] px-6 py-6 sm:px-8">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Send a message</h2>
        <p className="mt-2 text-sm text-slate-600">
          Required fields are marked. We&apos;ll never share your details.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 sm:p-8">
        <input type="text" {...register('honeypot')} className="hidden" tabIndex={-1} autoComplete="off" />

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <MarketingLabel htmlFor="mkt-name" className="text-slate-700 font-medium">
              Name <span className="text-red-600">*</span>
            </MarketingLabel>
            <MarketingInput
              id="mkt-name"
              {...register('name')}
              placeholder="Your name"
              className="rounded-none border-slate-300 focus:border-[#05363A] focus:ring-[#05363A]"
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <MarketingLabel htmlFor="mkt-email" className="text-slate-700 font-medium">
              Email <span className="text-red-600">*</span>
            </MarketingLabel>
            <MarketingInput
              id="mkt-email"
              type="email"
              {...register('email')}
              placeholder="you@company.co.za"
              className="rounded-none border-slate-300 focus:border-[#05363A] focus:ring-[#05363A]"
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <MarketingLabel htmlFor="mkt-phone" className="text-slate-700 font-medium">
              Phone
            </MarketingLabel>
            <MarketingInput
              id="mkt-phone"
              type="tel"
              {...register('phone')}
              placeholder="+27 73 140 1409"
              className="rounded-none border-slate-300 focus:border-[#05363A] focus:ring-[#05363A]"
            />
          </div>

          <div className="space-y-2">
            <MarketingLabel htmlFor="mkt-company" className="text-slate-700 font-medium">
              Company
            </MarketingLabel>
            <MarketingInput
              id="mkt-company"
              {...register('company')}
              placeholder="Organisation name"
              className="rounded-none border-slate-300 focus:border-[#05363A] focus:ring-[#05363A]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <MarketingLabel htmlFor="mkt-service" className="text-slate-700 font-medium">
            How can we help?
          </MarketingLabel>
          <MarketingSelect
            id="mkt-service"
            value={serviceSelect}
            onChange={(e) => {
              const v = e.target.value
              setServiceSelect(v)
              setValue('serviceInterest', v || undefined)
            }}
          >
            <MarketingSelectOption value="">Select a topic (optional)</MarketingSelectOption>
            {CONTACT_SERVICE_OPTIONS.map((opt) => (
              <MarketingSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </MarketingSelectOption>
            ))}
          </MarketingSelect>
        </div>

        <div className="space-y-2">
          <MarketingLabel htmlFor="mkt-message" className="text-slate-700 font-medium">
            Message <span className="text-red-600">*</span>
          </MarketingLabel>
          <MarketingTextarea
            id="mkt-message"
            {...register('message')}
            placeholder="Tell us about your B-BBEE priorities, timeline, or questions..."
            rows={6}
            className="rounded-none border-slate-300 focus:border-[#05363A] focus:ring-[#05363A] resize-none"
          />
          {errors.message && <p className="text-sm text-red-600">{errors.message.message}</p>}
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        <MarketingButton
          type="submit"
          size="lg"
          className={cn(
            'h-12 w-full rounded-none border-0 font-semibold text-white',
            marketingBrandBgClass,
            marketingBrandBgHoverClass,
          )}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Sending...
            </>
          ) : (
            'Send message'
          )}
        </MarketingButton>
      </form>
    </div>
  )
}
