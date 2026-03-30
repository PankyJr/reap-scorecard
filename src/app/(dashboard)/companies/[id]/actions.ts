'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type DeleteCompanyResult = { error: string } | void

export async function deleteCompany(companyId: string): Promise<DeleteCompanyResult> {
  if (!companyId || typeof companyId !== 'string') {
    return { error: 'Invalid company.' }
  }

  const supabase = await createClient()

  const { data: company, error: fetchError } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', companyId)
    .single()

  if (fetchError || !company) {
    return {
      error:
        process.env.NODE_ENV === 'development'
          ? fetchError?.message ?? 'Company not found.'
          : 'Could not delete company.',
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Phase 1 compatibility rule:
  // - If owner_id IS NULL (legacy/unowned companies), deny mutations.
  // - Otherwise, allow only if the company is owned by the current user.
  const isOwner = !!user?.id && company.owner_id === user.id

  if (!isOwner) {
    return {
      error:
        process.env.NODE_ENV === 'development'
          ? 'Company not found.'
          : 'Could not delete company.',
    }
  }

  let auditFailed = false
  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'company.deleted',
    entity_type: 'company',
    entity_id: company.id,
    entity_name: company.name ?? null,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    metadata: null,
  })

  if (auditError) {
    auditFailed = true
    console.error('[AUDIT] Failed to write audit log for company.deleted', {
      companyId,
      code: auditError.code,
      message: auditError.message,
      details: auditError.details,
    })
  }

  const { error } = await supabase.from('companies').delete().eq('id', companyId)

  if (error) {
    console.error('[COMPANIES] Failed to delete company', {
      companyId,
      errorMessage: error.message,
    })
    return {
      error: process.env.NODE_ENV === 'development' ? error.message : 'Could not delete company.',
    }
  }

  revalidatePath('/companies')
  revalidatePath('/dashboard')
  redirect(auditFailed ? '/companies?deleted=1&audit_failed=1' : '/companies?deleted=1')
}

const companyIdSchema = z.string().uuid()

const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200, 'Company name is too long'),
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
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
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

export async function updateCompany(formData: FormData) {
  const companyIdRaw = (formData.get('company_id') as string | null)?.trim() ?? ''
  const companyIdParsed = companyIdSchema.safeParse(companyIdRaw)
  if (!companyIdParsed.success) {
    redirect('/companies')
  }

  const raw = {
    name: formData.get('name'),
    industry: formData.get('industry'),
    contact_person: formData.get('contact_person'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    notes: formData.get('notes'),
  }

  // Coerce to strings so zod can validate optional empty values consistently.
  const payload = {
    name: typeof raw.name === 'string' ? raw.name : '',
    industry: typeof raw.industry === 'string' ? raw.industry : '',
    contact_person:
      typeof raw.contact_person === 'string' ? raw.contact_person : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  }

  const validated = updateCompanySchema.safeParse(payload)
  if (!validated.success) {
    const message =
      validated.error.issues[0]?.message ?? 'Invalid company values.'
    redirect(
      `/companies/${encodeURIComponent(
        companyIdParsed.data,
      )}/edit?error=${encodeURIComponent(message)}`,
    )
  }

  const supabase = await createClient()

  const { data: company, error: fetchError } = await supabase
    .from('companies')
    .select('id,name,owner_id')
    .eq('id', companyIdParsed.data)
    .single()

  if (fetchError || !company) {
    redirect(
      `/companies/${encodeURIComponent(
        companyIdParsed.data,
      )}/edit?error=${encodeURIComponent('Company not found.')}`,
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Phase 1 compatibility rule (same as delete):
  // - owner_id IS NULL means legacy/unowned -> deny edits.
  // - otherwise allow only if owned by current user.
  const isOwner = !!user?.id && company.owner_id === user.id

  if (!isOwner) {
    redirect(
      `/companies/${encodeURIComponent(
        companyIdParsed.data,
      )}/edit?error=${encodeURIComponent('Company not found.')}`,
    )
  }

  const { error: updateError } = await supabase
    .from('companies')
    .update({
      name: validated.data.name,
      industry: validated.data.industry ?? '',
      contact_person: validated.data.contact_person ?? '',
      email: validated.data.email ?? '',
      phone: validated.data.phone ?? '',
      notes: validated.data.notes ?? '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', company.id)

  if (updateError) {
    console.error('[COMPANIES] Failed to update company', {
      companyId: company.id,
      errorMessage: updateError.message,
    })
    redirect(
      `/companies/${encodeURIComponent(
        company.id,
      )}/edit?error=${encodeURIComponent(
        process.env.NODE_ENV === 'development'
          ? updateError.message
          : 'Could not update company.',
      )}`,
    )
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'company.updated',
    entity_type: 'company',
    entity_id: company.id,
    entity_name: validated.data.name ?? null,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    metadata: {
      company_id: company.id,
      previous_name: company.name ?? null,
      name: validated.data.name,
      industry: validated.data.industry ?? '',
      contact_person: validated.data.contact_person ?? '',
      email: validated.data.email ?? '',
      phone: validated.data.phone ?? '',
      notes: validated.data.notes ?? '',
    },
  })

  if (auditError) {
    console.error('[AUDIT] Failed to write audit log for company.updated', {
      companyId: company.id,
      code: auditError.code,
      message: auditError.message,
      details: auditError.details,
    })
  }

  revalidatePath('/companies')
  revalidatePath('/dashboard')
  revalidatePath(`/companies/${company.id}`)
  redirect(`/companies/${company.id}`)
}
