'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Notice } from '@/components/ui/Notice'
import { MoreOptions } from '@/components/ui/Panel'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { INDUSTRIES, MONTHS, findIndustry, parsePercent, parseRand } from '@/lib/company/industries'
import { describeCompanySize } from '@/lib/company/size'

export type CompanyFormValues = {
  name?: string | null
  industry?: string | null
  financial_year_end_month?: number | null
  annual_turnover?: number | null
  black_ownership_percentage?: number | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
}

interface CompanyFormProps {
  initialError?: string
  initialValues?: CompanyFormValues
  cancelHref?: string
  cancelLabel?: string
  saveLabel?: string
  /** Adding a company asks for all five details; editing an older one does not insist. */
  requireProfile?: boolean
}

const inputClass =
  'mt-2 block w-full rounded-control border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20'

function Label(args: { htmlFor: string; children: React.ReactNode; hint: React.ReactNode; optional?: boolean }) {
  return (
    <>
      <label htmlFor={args.htmlFor} className="block text-[15px] font-semibold text-ink">
        {args.children} {args.optional ? <span className="font-normal text-muted">(optional)</span> : null}
      </label>
      <p id={`${args.htmlFor}-hint`} className="text-sm text-muted">
        {args.hint}
      </p>
    </>
  )
}

/**
 * The company's details. Name, industry and financial year end belong to the
 * company. Turnover and black ownership are the latest known figures: each
 * scorecard keeps its own year's figures, starting from these.
 *
 * Works as a plain form posting to the server action: the size message is the
 * only part that needs JavaScript.
 */
export function NewCompanyForm({
  initialError,
  initialValues,
  cancelHref,
  cancelLabel = 'Cancel',
  saveLabel = 'Save company',
  requireProfile = true,
}: CompanyFormProps) {
  const [industry, setIndustry] = useState(initialValues?.industry ?? '')
  const [turnover, setTurnover] = useState(initialValues?.annual_turnover?.toString() ?? '')
  const [ownership, setOwnership] = useState(initialValues?.black_ownership_percentage?.toString() ?? '')

  const listed = findIndustry(industry)
  const legacyIndustry = industry && !listed ? industry : null
  const size = describeCompanySize({ turnover: parseRand(turnover), blackOwnershipPercent: parsePercent(ownership) })
  const hasContact = Boolean(initialValues?.contact_person || initialValues?.email || initialValues?.phone || initialValues?.notes)

  return (
    <div className="space-y-6">
      {initialError ? (
        <Notice tone="bad" title="The company was not saved">
          {initialError}
        </Notice>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="name" hint="The registered or trading name, as it should appear on reports.">
            Company name
          </Label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={200}
            defaultValue={initialValues?.name ?? ''}
            autoComplete="organization"
            aria-describedby="name-hint"
            placeholder="For example, Mokoena Logistics (Pty) Ltd"
            className={inputClass}
          />
        </div>

        <div>
          <Label htmlFor="industry" hint="Pick the closest match.">
            Industry
          </Label>
          <select
            id="industry"
            name="industry"
            required
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-describedby="industry-hint"
            className={inputClass}
          >
            <option value="">Choose an industry</option>
            {legacyIndustry ? <option value={legacyIndustry}>{legacyIndustry}</option> : null}
            {INDUSTRIES.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="financial_year_end_month" hint="The month the company's financial year ends. A scorecard measures one financial year.">
            Financial year end
          </Label>
          <select
            id="financial_year_end_month"
            name="financial_year_end_month"
            required={requireProfile}
            defaultValue={initialValues?.financial_year_end_month?.toString() ?? ''}
            aria-describedby="financial_year_end_month-hint"
            className={inputClass}
          >
            <option value="">Choose a month</option>
            {MONTHS.map((month, i) => (
              <option key={month} value={String(i + 1)}>
                {month}
              </option>
            ))}
          </select>
        </div>

        {listed?.mayHaveSectorCode ? (
          <div className="md:col-span-2">
            <Notice tone="info" title={`${listed.label} may have its own B-BBEE rules`}>
              Some industries are measured on their own sector code instead of the Generic codes this app uses. Confirm
              with your verification agency which scorecard applies.
            </Notice>
          </div>
        ) : null}

        <div>
          <Label htmlFor="annual_turnover" hint="Total income for the last financial year, before tax. For example 30 000 000.">
            Annual turnover (rand)
          </Label>
          <input
            id="annual_turnover"
            name="annual_turnover"
            type="text"
            inputMode="numeric"
            required={requireProfile}
            value={turnover}
            onChange={(e) => setTurnover(e.target.value)}
            aria-describedby="annual_turnover-hint company-size"
            placeholder="30 000 000"
            className={inputClass}
          />
        </div>

        <div>
          <Label htmlFor="black_ownership_percentage" hint="The share of the company owned by black South Africans. For example 51. Enter 0 if none.">
            Black ownership (%)
          </Label>
          <input
            id="black_ownership_percentage"
            name="black_ownership_percentage"
            type="text"
            inputMode="decimal"
            required={requireProfile}
            value={ownership}
            onChange={(e) => setOwnership(e.target.value)}
            aria-describedby="black_ownership_percentage-hint company-size"
            placeholder="51"
            className={inputClass}
          />
        </div>

        <div id="company-size" aria-live="polite" className="space-y-3 md:col-span-2">
          <p className="rounded-control border border-line bg-sunken px-4 py-3 text-[15px] font-medium text-ink">{size.headline}</p>
          {size.automaticLevel ? (
            <Notice tone="ok" title="You may not need a full scorecard">
              {size.automaticLevel.reason} Confirm with your verification agency.
            </Notice>
          ) : null}
          {size.limitation ? <Notice tone="warn">{size.limitation}</Notice> : null}
        </div>
      </div>

      <MoreOptions label="Contact details (optional)" defaultOpen={hasContact}>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="contact_person" hint="Who to speak to at the company." optional>
              Contact person
            </Label>
            <input id="contact_person" name="contact_person" type="text" maxLength={120} autoComplete="name" defaultValue={initialValues?.contact_person ?? ''} className={inputClass} />
          </div>
          <div>
            <Label htmlFor="email" hint="For example name@company.co.za." optional>
              Email
            </Label>
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={initialValues?.email ?? ''} className={inputClass} />
          </div>
          <div>
            <Label htmlFor="phone" hint="For example 012 345 6789." optional>
              Phone
            </Label>
            <input id="phone" name="phone" type="tel" maxLength={50} autoComplete="tel" defaultValue={initialValues?.phone ?? ''} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes" hint="Anything the team should know about this client." optional>
              Notes
            </Label>
            <textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={initialValues?.notes ?? ''} className={`${inputClass} resize-y`} />
          </div>
        </div>
      </MoreOptions>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <Link href={cancelHref} className={buttonStyles({ variant: 'secondary' })}>
            {cancelLabel}
          </Link>
        ) : null}
        <span data-tour="company-form-save" className="contents">
          <PendingSubmitButton label={saveLabel} pendingLabel="Saving…" className={buttonStyles({ variant: 'primary' })} />
        </span>
      </div>
    </div>
  )
}
