'use server'

import { postgrestLogExtras } from '@/lib/supabase/postgrestLogExtras'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { safeReturnPath } from '@/lib/flows'

export async function createCompany(formData: FormData) {
  const supabase = await createClient()

  const name = String(formData.get('name') ?? '').trim()
  const contactPerson = String(formData.get('contact_person') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  const returnTo = safeReturnPath(formData.get('next'))
  const backToForm = (message: string) =>
    redirect(
      '/companies/new?error=' + encodeURIComponent(message) + (returnTo ? `&next=${encodeURIComponent(returnTo)}` : ''),
    )

  if (!name) backToForm('Enter the company name.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) backToForm('Enter a valid email address, like name@company.co.za.')

  const data = {
    name,
    industry: String(formData.get('industry') ?? '').trim(), 
    contact_person: contactPerson,
    email,
    phone,
    notes: String(formData.get('notes') ?? '').trim(),
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: newCompany, error } = await supabase
    .from('companies')
    .insert([{ ...data, owner_id: user.id }])
    .select()
    .single()

  if (error || !newCompany) {
    // Log full error details for local debugging
    // This will show up in the Next.js dev terminal
    const { details, hint } = postgrestLogExtras(error)
    console.error('[COMPANIES] Failed to create company', {
      payload: data,
      errorMessage: error?.message,
      errorDetails: details,
      errorHint: hint,
      code: error?.code,
    })

    backToForm(
      process.env.NODE_ENV === 'development'
        ? error?.message || 'Unknown error while creating company'
        : 'The company could not be saved. Check your connection and try again.',
    )
    return
  }

  revalidatePath('/companies')
  revalidatePath('/dashboard')
  // Came from "Start new": carry straight on with the chosen scorecard.
  if (returnTo) redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}companyId=${newCompany.id}`)
  redirect(`/companies/${newCompany.id}?created=1`)
}
