'use server'

import { firstEmbeddedRow } from '@/utils/supabase/embed'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  calculateScorecard,
  type ScorecardInput,
} from '@/lib/scorecard/calculateScorecard'

export type DeleteScorecardResult = { error: string } | void

type CompanyEmbed = { name: string | null; owner_id: string | null }

const deleteScorecardSchema = z.string().uuid()

export async function deleteScorecard(
  scorecardId: string,
): Promise<DeleteScorecardResult> {
  const parsed = deleteScorecardSchema.safeParse(scorecardId)
  if (!parsed.success) {
    return { error: 'Invalid scorecard.' }
  }

  const supabase = await createClient()

  const { data: scorecard, error: fetchError } = await supabase
    .from('scorecards')
    .select(
      `
        id,
        company_id,
        total_score,
        score_level,
        company:companies(name, owner_id)
      `,
    )
    .eq('id', parsed.data)
    .single()

  if (fetchError || !scorecard) {
    return {
      error:
        process.env.NODE_ENV === 'development'
          ? fetchError?.message ?? 'Scorecard not found.'
          : 'Could not delete scorecard.',
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Phase 1 compatibility rule:
  // - scorecards for legacy/unowned companies (company.owner_id IS NULL) are denied for mutations.
  // - otherwise, allow only if the parent company is owned by the current user.
  const company = firstEmbeddedRow(
    scorecard.company as CompanyEmbed | CompanyEmbed[] | null | undefined,
  )
  const isOwner = !!user?.id && company?.owner_id === user.id

  if (!isOwner) {
    return {
      error:
        process.env.NODE_ENV === 'development'
          ? 'Scorecard not found.'
          : 'Could not delete scorecard.',
    }
  }

  let auditFailed = false
  const companyName = company?.name ?? null
  const entityName = companyName
    ? `Scorecard (${companyName})`
    : `Scorecard (${parsed.data})`

  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'scorecard.deleted',
    entity_type: 'scorecard',
    entity_id: scorecard.id,
    entity_name: entityName,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    metadata: {
      company_id: scorecard.company_id,
      company_name: companyName,
      score_level: scorecard.score_level ?? null,
      total_score: scorecard.total_score ?? null,
    },
  })

  if (auditError) {
    auditFailed = true
    console.error('[AUDIT] Failed to write audit log for scorecard.deleted', {
      scorecardId: scorecard.id,
      code: auditError.code,
      message: auditError.message,
      details: auditError.details,
    })
  }

  const { error: deleteError } = await supabase
    .from('scorecards')
    .delete()
    .eq('id', parsed.data)

  if (deleteError) {
    console.error('[SCORECARDS] Failed to delete scorecard', {
      scorecardId: parsed.data,
      errorMessage: deleteError.message,
    })
    return {
      error:
        process.env.NODE_ENV === 'development'
          ? deleteError.message
          : 'Could not delete scorecard.',
    }
  }

  revalidatePath(`/companies/${scorecard.company_id}`)
  revalidatePath('/dashboard')
  revalidatePath('/companies')

  redirect(
    auditFailed
      ? `/companies/${scorecard.company_id}?scorecard_deleted=1&audit_failed=1`
      : `/companies/${scorecard.company_id}?scorecard_deleted=1`,
  )
}

const scorecardIdSchema = z.string().uuid()

const scorecardInputsSchema = z.object({
  ownership: z.coerce.number().min(0),
  management_control: z.coerce.number().min(0),
  skills_development: z.coerce.number().min(0),
  enterprise_development: z.coerce.number().min(0),
  socio_economic_development: z.coerce.number().min(0),
})

export type UpdateScorecardResult = { error: string } | void

export async function updateScorecard(formData: FormData): Promise<UpdateScorecardResult> {
  const supabase = await createClient()

  const scorecardIdRaw =
    (formData.get('scorecard_id') as string | null)?.trim() ?? ''

  const scorecardIdParsed = scorecardIdSchema.safeParse(scorecardIdRaw)
  if (!scorecardIdParsed.success) {
    redirect('/dashboard')
  }

  const inputsRaw = {
    ownership: formData.get('ownership'),
    management_control: formData.get('management_control'),
    skills_development: formData.get('skills_development'),
    enterprise_development: formData.get('enterprise_development'),
    socio_economic_development: formData.get('socio_economic_development'),
  }

  const inputsParsed = scorecardInputsSchema.safeParse(inputsRaw)
  if (!inputsParsed.success) {
    const message = inputsParsed.error.issues[0]?.message ?? 'Invalid inputs.'
    redirect(
      `/scorecards/${encodeURIComponent(
        scorecardIdParsed.data,
      )}/edit?error=${encodeURIComponent(message)}`,
    )
  }

  // Confirm the scorecard exists and load context for recalculation + audit logging
  const { data: scorecard, error: scorecardError } = await supabase
    .from('scorecards')
    .select(`
      id,
      company_id,
      score_level,
      total_score,
      company:companies(name, owner_id)
    `)
    .eq('id', scorecardIdParsed.data)
    .single()

  if (scorecardError || !scorecard) {
    redirect(
      `/scorecards/${encodeURIComponent(
        scorecardIdParsed.data,
      )}/edit?error=${encodeURIComponent(
        process.env.NODE_ENV === 'development'
          ? scorecardError?.message ?? 'Scorecard not found.'
          : 'Scorecard not found.',
      )}`,
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Phase 1 compatibility rule (same as delete):
  // - legacy/unowned parent company => deny mutations.
  // - otherwise, allow only if owned by current user.
  const company = firstEmbeddedRow(
    scorecard.company as CompanyEmbed | CompanyEmbed[] | null | undefined,
  )
  const isOwner = !!user?.id && company?.owner_id === user.id

  if (!isOwner) {
    redirect(
      `/scorecards/${encodeURIComponent(
        scorecardIdParsed.data,
      )}/edit?error=${encodeURIComponent('Scorecard not found.')}`,
    )
  }

  const inputs: ScorecardInput = inputsParsed.data

  // Recompute using the same calculation engine as create
  const result = calculateScorecard(inputs)

  // Replace the related child rows using a simple delete -> insert approach
  const { error: inputsDeleteError } = await supabase
    .from('scorecard_inputs')
    .delete()
    .eq('scorecard_id', scorecard.id)

  if (inputsDeleteError) {
    console.error('[SCORECARDS] Failed to replace scorecard_inputs', {
      scorecardId: scorecard.id,
      message: inputsDeleteError.message,
    })
    redirect(
      `/scorecards/${encodeURIComponent(
        scorecard.id,
      )}/edit?error=${encodeURIComponent('Could not update scorecard inputs.')}`,
    )
  }

  const inputRows = [
    {
      scorecard_id: scorecard.id,
      category_key: 'ownership',
      input_value: inputs.ownership,
    },
    {
      scorecard_id: scorecard.id,
      category_key: 'management_control',
      input_value: inputs.management_control,
    },
    {
      scorecard_id: scorecard.id,
      category_key: 'skills_development',
      input_value: inputs.skills_development,
    },
    {
      scorecard_id: scorecard.id,
      category_key: 'enterprise_development',
      input_value: inputs.enterprise_development,
    },
    {
      scorecard_id: scorecard.id,
      category_key: 'socio_economic_development',
      input_value: inputs.socio_economic_development,
    },
  ]

  const { error: inputsInsertError } = await supabase
    .from('scorecard_inputs')
    .insert(inputRows)

  if (inputsInsertError) {
    console.error('[SCORECARDS] Failed to insert scorecard_inputs', {
      scorecardId: scorecard.id,
      message: inputsInsertError.message,
    })
    redirect(
      `/scorecards/${encodeURIComponent(
        scorecard.id,
      )}/edit?error=${encodeURIComponent('Could not save scorecard inputs.')}`,
    )
  }

  const { error: resultsDeleteError } = await supabase
    .from('scorecard_results')
    .delete()
    .eq('scorecard_id', scorecard.id)

  if (resultsDeleteError) {
    console.error('[SCORECARDS] Failed to replace scorecard_results', {
      scorecardId: scorecard.id,
      message: resultsDeleteError.message,
    })
    redirect(
      `/scorecards/${encodeURIComponent(
        scorecard.id,
      )}/edit?error=${encodeURIComponent('Could not update scorecard results.')}`,
    )
  }

  const resultRows = result.category_results.map((cat) => ({
    scorecard_id: scorecard.id,
    category_name: cat.category_name,
    score: cat.score,
    max_score: cat.max_score,
  }))

  const { error: resultsInsertError } = await supabase
    .from('scorecard_results')
    .insert(resultRows)

  if (resultsInsertError) {
    console.error('[SCORECARDS] Failed to insert scorecard_results', {
      scorecardId: scorecard.id,
      message: resultsInsertError.message,
    })
    redirect(
      `/scorecards/${encodeURIComponent(
        scorecard.id,
      )}/edit?error=${encodeURIComponent('Could not save scorecard results.')}`,
    )
  }

  // Update the parent summary row after successful recomputation & child refresh
  const { error: updateHeaderError } = await supabase
    .from('scorecards')
    .update({
      total_score: result.total_score,
      score_level: result.score_level,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scorecard.id)

  if (updateHeaderError) {
    console.error('[SCORECARDS] Failed to update scorecards header', {
      scorecardId: scorecard.id,
      message: updateHeaderError.message,
    })
    redirect(
      `/scorecards/${encodeURIComponent(
        scorecard.id,
      )}/edit?error=${encodeURIComponent('Could not update scorecard.')}`,
    )
  }

  const companyName = company?.name ?? null
  const entityName = companyName
    ? `Scorecard (${companyName})`
    : `Scorecard (${scorecard.id})`

  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'scorecard.updated',
    entity_type: 'scorecard',
    entity_id: scorecard.id,
    entity_name: entityName,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    metadata: {
      company_id: scorecard.company_id,
      company_name: companyName,
      score_level: result.score_level ?? null,
      total_score: result.total_score ?? null,
      updated_scorecard_inputs: inputs,
    },
  })

  if (auditError) {
    console.error('[AUDIT] Failed to write audit log for scorecard.updated', {
      scorecardId: scorecard.id,
      code: auditError.code,
      message: auditError.message,
      details: auditError.details,
    })
  }

  revalidatePath(`/scorecards/${scorecard.id}`)
  revalidatePath(`/companies/${scorecard.company_id}`)
  revalidatePath('/dashboard')

  redirect(`/scorecards/${scorecard.id}`)
}

/** Form `action` must resolve to `void`; delegates to `updateScorecard`. */
export async function updateScorecardFormAction(
  formData: FormData,
): Promise<void> {
  await updateScorecard(formData)
}

