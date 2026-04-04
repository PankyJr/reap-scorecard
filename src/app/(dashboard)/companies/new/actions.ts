'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createCompany(formData: FormData) {
  const supabase = await createClient()

  const name = String(formData.get('name') ?? '').trim()
  const contactPerson = String(formData.get('contact_person') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!name || !contactPerson || !email || !phone) {
    redirect('/companies/new?error=' + encodeURIComponent('Company name, contact person, email, and phone are required'))
  }

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
    console.error('[COMPANIES] Failed to create company', {
      payload: data,
      errorMessage: error?.message,
      errorDetails: (error as any)?.details,
      errorHint: (error as any)?.hint,
      code: error?.code,
    })

    const baseMessage =
      process.env.NODE_ENV === 'development'
        ? error?.message || 'Unknown error while creating company'
        : 'Could not create company'

    const message = encodeURIComponent(baseMessage)
    redirect(`/companies/new?error=${message}`)
  }

  revalidatePath('/companies')
  redirect(`/companies/${newCompany.id}`)
}
