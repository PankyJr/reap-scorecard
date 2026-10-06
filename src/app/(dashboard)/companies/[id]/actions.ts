'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { parseCompanyProfile } from '@/lib/company/profile'

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


export async function updateCompany(formData: FormData) {
  const companyIdRaw = (formData.get('company_id') as string | null)?.trim() ?? ''
  const companyIdParsed = companyIdSchema.safeParse(companyIdRaw)
  if (!companyIdParsed.success) {
    redirect('/companies')
  }

  const parsed = parseCompanyProfile(formData, { requireProfile: false })
  if (!parsed.ok) {
    redirect(
      `/companies/${encodeURIComponent(
        companyIdParsed.data,
      )}/edit?error=${encodeURIComponent(parsed.error)}`,
    )
  }
  const values = (parsed as Extract<typeof parsed, { ok: true }>).values

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
      ...values,
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
      )}/edit?error=${encodeURIComponent('The changes could not be saved. Check your connection and try again.')}`,
    )
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'company.updated',
    entity_type: 'company',
    entity_id: company.id,
    entity_name: values.name,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    metadata: {
      company_id: company.id,
      previous_name: company.name ?? null,
      ...values,
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
  redirect(`/companies/${company.id}?saved=1`)
}
