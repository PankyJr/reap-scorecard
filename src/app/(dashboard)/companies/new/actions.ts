'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createCompany(formData: FormData) {
  const supabase = await createClient()

  const data = {
    name: formData.get('name') as string,
    industry: formData.get('industry') as string,
    contact_person: formData.get('contact_person') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    notes: formData.get('notes') as string,
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
