'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { MarketingButton } from '@/components/marketing/ui/button'
import { MarketingInput } from '@/components/marketing/ui/input'
import { MarketingTextarea } from '@/components/marketing/ui/textarea'
import { MarketingLabel } from '@/components/marketing/ui/label'
import { MarketingSelect, MarketingSelectOption } from '@/components/marketing/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/marketing/ui/card'
import { CheckCircle2, Loader2 } from 'lucide-react'

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

export function MarketingContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    if (data.honeypot) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/marketing/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setTimeout(() => setIsSuccess(false), 5000)
    } catch {
      setError('Something went wrong. Please try again or email us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="border-[#05363A]/20 bg-[#05363A]/5 rounded-none">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-[#05363A]">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold text-base">Message sent successfully!</p>
              <p className="text-sm text-[#05363A]/90 mt-1">We&apos;ll get back to you soon.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 rounded-none">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold text-slate-900">Send us a message</CardTitle>
        <CardDescription className="text-slate-600 mt-2">
          Fill out the form below and we&apos;ll get back to you as soon as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <input type="text" {...register('honeypot')} className="hidden" tabIndex={-1} autoComplete="off" />

          <div className="grid gap-6 md:grid-cols-2">
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
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <MarketingLabel htmlFor="mkt-email" className="text-slate-700 font-medium">
                Email <span className="text-red-600">*</span>
              </MarketingLabel>
              <MarketingInput
                id="mkt-email"
                type="email"
                {...register('email')}
                placeholder="your.email@example.com"
                className="rounded-none border-slate-300 focus:border-[#05363A] focus:ring-[#05363A]"
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <MarketingLabel htmlFor="mkt-phone" className="text-slate-700 font-medium">
                Phone
              </MarketingLabel>
              <MarketingInput
                id="mkt-phone"
                type="tel"
                {...register('phone')}
                placeholder="+27 12 345 6789"
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
                placeholder="Your company name"
                className="rounded-none border-slate-300 focus:border-[#05363A] focus:ring-[#05363A]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <MarketingLabel htmlFor="mkt-service" className="text-slate-700 font-medium">
              Service Interest
            </MarketingLabel>
            <MarketingSelect
              id="mkt-service"
              defaultValue=""
              onChange={(e) => setValue('serviceInterest', e.target.value || undefined)}
            >
              <MarketingSelectOption value="" disabled>
                Select a service (optional)
              </MarketingSelectOption>
              <MarketingSelectOption value="strategy">B-BBEE Strategy</MarketingSelectOption>
              <MarketingSelectOption value="implementation">Implementation Support</MarketingSelectOption>
              <MarketingSelectOption value="training">Training & Education</MarketingSelectOption>
              <MarketingSelectOption value="assessment">Current State Assessment</MarketingSelectOption>
              <MarketingSelectOption value="other">Other</MarketingSelectOption>
            </MarketingSelect>
          </div>

          <div className="space-y-2">
            <MarketingLabel htmlFor="mkt-message" className="text-slate-700 font-medium">
              Message <span className="text-red-600">*</span>
            </MarketingLabel>
            <MarketingTextarea
              id="mkt-message"
              {...register('message')}
              placeholder="Tell us about your needs..."
              rows={6}
              className="rounded-none border-slate-300 focus:border-[#05363A] focus:ring-[#05363A] resize-none"
            />
            {errors.message && <p className="text-sm text-red-600 mt-1">{errors.message.message}</p>}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-none">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <MarketingButton
            type="submit"
            size="lg"
            className="w-full bg-[#05363A] text-white hover:bg-[#05363A]/90 border-0 rounded-none font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Message'
            )}
          </MarketingButton>
        </form>
      </CardContent>
    </Card>
  )
}
