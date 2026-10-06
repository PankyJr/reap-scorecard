'use server'

import { postgrestLogExtras } from '@/lib/supabase/postgrestLogExtras'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { safeReturnPath } from '@/lib/flows'
import { parseCompanyProfile } from '@/lib/company/profile'

export async function createCompany(formData: FormData) {
  const supabase = await createClient()

  const returnTo = safeReturnPath(formData.get('next'))
  const backToForm = (message: string) =>
    redirect(
      '/companies/new?error=' + encodeURIComponent(message) + (returnTo ? `&next=${encodeURIComponent(returnTo)}` : ''),
    )

  const parsed = parseCompanyProfile(formData, { requireProfile: true })
  if (!parsed.ok) backToForm(parsed.error)
  const data = (parsed as Extract<typeof parsed, { ok: true }>).values

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
    const { details, hint } = postgrestLogExtras(error)
    console.error('[COMPANIES] Failed to create company', {
      errorMessage: error?.message,
      errorDetails: details,
      errorHint: hint,
      code: error?.code,
    })

    backToForm('The company could not be saved. Check your connection and try again.')
    return
  }

  revalidatePath('/companies')
  revalidatePath('/dashboard')
  // Came from somewhere that needs a company (for example a scorecard's
  // company picker): carry straight on there.
  if (returnTo) redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}companyId=${newCompany.id}`)
  // Otherwise straight on to "What do you need?" for this company.
  redirect(`/start?companyId=${newCompany.id}&created=1`)
}
