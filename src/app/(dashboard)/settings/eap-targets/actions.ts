'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import {
  parseEapSharesFromPercentages,
  sharesFromRows,
  sharesToRows,
  validateEapShares,
} from '@/lib/scorecard/calculator/eap/population-shares'

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

export async function createEapTargetSet(formData: FormData) {
  const user = await requireReapInternalAdmin()
  const admin = createServiceRoleSupabase()

  const name = String(formData.get('name') ?? '').trim()
  const year = Number(formData.get('year'))
  const geography = String(formData.get('geography') ?? '').trim() || null
  const sourceReference = String(formData.get('sourceReference') ?? '').trim() || null
  const notes = String(formData.get('notes') ?? '').trim() || null

  if (!name || !Number.isFinite(year)) {
    errorRedirect('/settings/eap-targets', 'Enter a name and a year for the target set.')
  }

  const { data, error } = await admin
    .from('eap_target_sets')
    .insert({
      name,
      year,
      geography,
      source_reference: sourceReference,
      notes,
      status: 'draft',
      version: 1,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error(error)
    errorRedirect('/settings/eap-targets', 'The target set could not be created. Try again.')
  }

  // No values are seeded: an empty set reads as "not captured yet" rather
  // than as a set of real zero percentages.
  await admin.from('eap_target_set_audit').insert({
    target_set_id: data.id,
    action: 'created_draft',
    changed_by: user.id,
    change_json: { name, year, geography },
  })

  revalidatePath('/settings/eap-targets')
  redirect(`/settings/eap-targets/${data.id}`)
}

export async function saveEapTargetValues(formData: FormData) {
  const user = await requireReapInternalAdmin()
  const admin = createServiceRoleSupabase()
  const targetSetId = String(formData.get('targetSetId') ?? '')
  if (!targetSetId) redirect('/settings/eap-targets')

  const { data: set } = await admin.from('eap_target_sets').select('*').eq('id', targetSetId).maybeSingle()
  if (!set) redirect('/settings/eap-targets?error=Not+found')
  if (set.status === 'retired') errorRedirect(`/settings/eap-targets/${targetSetId}`, 'This set has been replaced and is read-only. Duplicate it to make changes.')

  const parsed = parseEapSharesFromPercentages((field) => {
    const value = formData.get(field)
    return typeof value === 'string' ? value : null
  })
  if (!parsed.ok) errorRedirect(`/settings/eap-targets/${targetSetId}`, parsed.errors.join(' '))

  const { error: saveError } = await admin
    .from('eap_target_set_values')
    .upsert(sharesToRows(targetSetId, parsed.shares), { onConflict: 'target_set_id,band_key,demographic_key' })
  if (saveError) {
    console.error('[eap-targets] save failed', saveError.message)
    errorRedirect(`/settings/eap-targets/${targetSetId}`, 'The values could not be saved. Try again.')
  }

  await admin
    .from('eap_target_sets')
    .update({ updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', targetSetId)

  await admin.from('eap_target_set_audit').insert({
    target_set_id: targetSetId,
    action: 'values_updated',
    changed_by: user.id,
    change_json: { shares: parsed.shares },
  })

  revalidatePath(`/settings/eap-targets/${targetSetId}`)
  redirect(`/settings/eap-targets/${targetSetId}?saved=1`)
}

export async function activateEapTargetSet(formData: FormData) {
  const user = await requireReapInternalAdmin()
  const admin = createServiceRoleSupabase()
  const targetSetId = String(formData.get('targetSetId') ?? '')

  const { data: set } = await admin.from('eap_target_sets').select('*').eq('id', targetSetId).maybeSingle()
  if (!set) redirect('/settings/eap-targets?error=Not+found')

  const { data: values } = await admin
    .from('eap_target_set_values')
    .select('band_key, demographic_key, target_value')
    .eq('target_set_id', targetSetId)

  const validation = validateEapShares(sharesFromRows(values ?? []))
  if (!validation.ok) {
    errorRedirect(
      `/settings/eap-targets/${targetSetId}`,
      `Save all six population shares before making this set active. ${validation.errors.join(' ')}`,
    )
  }

  // Retire other active sets for same year + geography/scope
  let retireQuery = admin
    .from('eap_target_sets')
    .update({ status: 'retired', updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('year', set.year)
    .eq('status', 'active')
    .neq('id', targetSetId)
  retireQuery =
    set.geography == null ? retireQuery.is('geography', null) : retireQuery.eq('geography', set.geography)
  await retireQuery

  await admin
    .from('eap_target_sets')
    .update({
      status: 'active',
      effective_date: new Date().toISOString().slice(0, 10),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetSetId)

  await admin.from('eap_target_set_audit').insert({
    target_set_id: targetSetId,
    action: 'activated',
    changed_by: user.id,
    change_json: { year: set.year, geography: set.geography },
  })

  revalidatePath('/settings/eap-targets')
  redirect(`/settings/eap-targets/${targetSetId}?activated=1`)
}

export async function duplicateEapTargetSet(formData: FormData) {
  const user = await requireReapInternalAdmin()
  const admin = createServiceRoleSupabase()
  const sourceId = String(formData.get('targetSetId') ?? '')
  const newYear = Number(formData.get('newYear'))

  const { data: source } = await admin.from('eap_target_sets').select('*').eq('id', sourceId).maybeSingle()
  if (!source) redirect('/settings/eap-targets?error=Not+found')

  const { data: values } = await admin
    .from('eap_target_set_values')
    .select('band_key, demographic_key, target_value')
    .eq('target_set_id', sourceId)

  const { data: created, error } = await admin
    .from('eap_target_sets')
    .insert({
      name: `${source.name} (${newYear || source.year + 1})`,
      year: Number.isFinite(newYear) ? newYear : source.year + 1,
      geography: source.geography,
      source_reference: source.source_reference,
      notes: `Duplicated from ${source.id}`,
      status: 'draft',
      version: 1,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (error || !created) redirect(`/settings/eap-targets/${sourceId}?error=Duplicate+failed`)

  // Only the six population shares are carried over; rows in the retired
  // per-band format cannot drive the scorecard.
  const shares = sharesFromRows(values ?? [])
  if (validateEapShares(shares).ok) {
    await admin.from('eap_target_set_values').insert(sharesToRows(created.id, shares as Parameters<typeof sharesToRows>[1]))
  }

  await admin.from('eap_target_set_audit').insert({
    target_set_id: created.id,
    action: 'duplicated_from',
    changed_by: user.id,
    change_json: { sourceId },
  })

  revalidatePath('/settings/eap-targets')
  redirect(`/settings/eap-targets/${created.id}`)
}
