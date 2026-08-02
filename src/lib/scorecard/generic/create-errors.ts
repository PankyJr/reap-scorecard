/**
 * Safe user-facing messages for Generic assessment creation failures.
 * Never include SQL, secrets, or private row payloads.
 */

type PostgrestLikeError = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
} | null

export function mapGenericAssessmentCreateError(
  error: PostgrestLikeError,
  stage: 'assessment_insert' | 'element_insert',
): string {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()
  const details = (error?.details ?? '').toLowerCase()
  const combined = `${message} ${details}`

  if (code === 'PGRST205' || combined.includes('could not find the table') || combined.includes('schema cache')) {
    return 'Generic Scorecard tables are not available in this environment. Use the staging database and confirm migrations are applied.'
  }
  if (code === 'PGRST204' || combined.includes('could not find the') && combined.includes('column')) {
    return 'Staging schema is missing a Generic Scorecard column. Apply the pending Generic migrations to staging.'
  }
  if (code === '23514' || combined.includes('check constraint')) {
    if (combined.includes('element') || stage === 'element_insert') {
      return 'A Generic element key was rejected by a database constraint. Update the element-key check to include all seven Generic elements.'
    }
    return 'A scorecard value was rejected by a database constraint. Confirm status, scope and rule-set values are supported.'
  }
  if (code === '23503' || combined.includes('foreign key')) {
    return 'Company ownership check failed. Refresh the company list and try again.'
  }
  if (code === '42501' || combined.includes('permission denied') || combined.includes('row-level security')) {
    return 'You can only create assessments for companies you own.'
  }
  if (code === '23505' || combined.includes('duplicate')) {
    return 'An equivalent assessment already exists. Open the existing assessment or change the name.'
  }
  if (stage === 'element_insert') {
    return 'The assessment shell was created, but Generic element rows could not be saved. The incomplete assessment was removed. Try again.'
  }
  return 'Could not create assessment. Check that you are on staging and that Generic Scorecard migrations are applied.'
}

export function logGenericAssessmentCreateFailure(args: {
  stage: 'assessment_insert' | 'element_insert'
  label: 'GENERIC_ASSESSMENT_INSERT_FAILED' | 'GENERIC_ELEMENT_INSERT_FAILED'
  companyId: string
  assessmentId?: string | null
  error: PostgrestLikeError
}) {
  console.error(args.label, {
    stage: args.stage,
    companyId: args.companyId,
    assessmentId: args.assessmentId ?? null,
    code: args.error?.code ?? null,
    message: args.error?.message ?? null,
    details: args.error?.details ?? null,
    hint: args.error?.hint ?? null,
  })
}
