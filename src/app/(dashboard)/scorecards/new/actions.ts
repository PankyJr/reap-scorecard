'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { calculateScorecard, ScorecardInput } from '@/lib/scorecard/calculateScorecard'

export async function createScorecard(formData: FormData) {
  const supabase = await createClient()

  const company_id = (formData.get('company_id') as string)?.trim() ?? ''

  if (!company_id) {
    redirect('/companies')
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', company_id)
    .single()

  if (companyError || !company) {
    const message = encodeURIComponent('Company not found.')
    redirect(`/scorecards/new?companyId=${company_id}&error=${message}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Phase 1 compatibility rule:
  // - If owner_id IS NULL (legacy/unowned company), deny scorecard creation.
  // - Otherwise, allow only if company.owner_id matches the current user.
  const isOwner = company.owner_id === user.id

  if (!isOwner) {
    const message = encodeURIComponent('Company not found.')
    redirect(`/scorecards/new?companyId=${company_id}&error=${message}`)
  }

  const inputs: ScorecardInput = {
    ownership: Number(formData.get('ownership')),
    management_control: Number(formData.get('management_control')),
    skills_development: Number(formData.get('skills_development')),
    enterprise_development: Number(formData.get('enterprise_development')),
    socio_economic_development: Number(formData.get('socio_economic_development')),
  }

  // Calculate results using the isolated module
  const result = calculateScorecard(inputs)

  // 1. Insert Scorecard Header
  const { data: newScorecard, error: scorecardError } = await supabase
    .from('scorecards')
    .insert([{
      company_id,
      total_score: result.total_score,
      score_level: result.score_level,
      created_by: user?.id
    }])
    .select()
    .single()

  if (scorecardError) {
    console.error('[SCORECARDS] Failed to create scorecard header', {
      company_id,
      inputs,
      result,
      errorMessage: scorecardError.message,
      errorDetails: (scorecardError as any)?.details,
      errorHint: (scorecardError as any)?.hint,
      code: scorecardError.code,
    })

    const baseMessage =
      process.env.NODE_ENV === 'development'
        ? scorecardError.message || 'Failed to save scorecard.'
        : 'Failed to save scorecard.'

    const message = encodeURIComponent(baseMessage)
    redirect(`/scorecards/new?companyId=${company_id}&error=${message}`)
  }

  // 2. Insert Scorecard Inputs
  const inputRows = [
    { scorecard_id: newScorecard.id, category_key: 'ownership', input_value: inputs.ownership },
    { scorecard_id: newScorecard.id, category_key: 'management_control', input_value: inputs.management_control },
    { scorecard_id: newScorecard.id, category_key: 'skills_development', input_value: inputs.skills_development },
    { scorecard_id: newScorecard.id, category_key: 'enterprise_development', input_value: inputs.enterprise_development },
    { scorecard_id: newScorecard.id, category_key: 'socio_economic_development', input_value: inputs.socio_economic_development },
  ]

  await supabase.from('scorecard_inputs').insert(inputRows)

  // 3. Insert Scorecard Results
  const resultRows = result.category_results.map((cat) => ({
    scorecard_id: newScorecard.id,
    category_name: cat.category_name,
    score: cat.score,
    max_score: cat.max_score,
  }))

  await supabase.from('scorecard_results').insert(resultRows)

  const { error: auditError } = await supabase.from('audit_log').insert({
    action: 'scorecard.created',
    entity_type: 'scorecard',
    entity_id: newScorecard.id,
    entity_name: company.name
      ? `Scorecard for ${company.name} (${result.score_level ?? '—'})`
      : null,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    metadata: {
      company_id: company.id,
      company_name: company.name ?? null,
      score_level: result.score_level ?? null,
      total_score: result.total_score ?? null,
    },
  })

  if (auditError) {
    console.error('[AUDIT] Failed to write audit log for scorecard.created', {
      scorecardId: newScorecard.id,
      code: auditError.code,
      message: auditError.message,
      details: auditError.details,
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/companies')

  redirect(`/scorecards/${newScorecard.id}`)
}
