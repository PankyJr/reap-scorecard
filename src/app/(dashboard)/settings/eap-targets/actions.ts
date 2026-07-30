'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { expectedEapCells, validateEapTargetMatrix, type McEapBandKey, type McEapDemographicKey } from '@/lib/scorecard/calculator/eap/demographics'

export async function createEapTargetSet(formData: FormData) {
  const user = await requireReapInternalAdmin()
  const admin = createServiceRoleSupabase()

  const name = String(formData.get('name') ?? '').trim()
  const year = Number(formData.get('year'))
  const geography = String(formData.get('geography') ?? '').trim() || null
  const sourceReference = String(formData.get('sourceReference') ?? '').trim() || null
  const notes = String(formData.get('notes') ?? '').trim() || null

  if (!name || !Number.isFinite(year)) {
    redirect('/settings/eap-targets?error=Name+and+year+required')
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
    redirect('/settings/eap-targets?error=Could+not+create+target+set')
  }

  const seed = expectedEapCells().map((cell) => ({
    target_set_id: data.id,
    band_key: cell.bandKey,
    demographic_key: cell.demographicKey,
    target_value: 0,
  }))
  await admin.from('eap_target_set_values').insert(seed)
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
  if (set.status === 'retired') redirect(`/settings/eap-targets/${targetSetId}?error=Retired+sets+are+read-only`)

  const cells = expectedEapCells()
  const values = cells.map((cell) => {
    const key = `${cell.bandKey}__${cell.demographicKey}`
    const raw = String(formData.get(key) ?? '0')
    let targetValue = Number(raw)
    if (targetValue > 1) targetValue = targetValue / 100
    return {
      bandKey: cell.bandKey,
      demographicKey: cell.demographicKey,
      targetValue,
    }
  })

  const validation = validateEapTargetMatrix(values)
  if (!validation.ok) {
    redirect(
      `/settings/eap-targets/${targetSetId}?error=${encodeURIComponent(validation.errors.join(' '))}`,
    )
  }

  for (const cell of values) {
    await admin.from('eap_target_set_values').upsert(
      {
        target_set_id: targetSetId,
        band_key: cell.bandKey,
        demographic_key: cell.demographicKey,
        target_value: cell.targetValue,
      },
      { onConflict: 'target_set_id,band_key,demographic_key' },
    )
  }

  await admin
    .from('eap_target_sets')
    .update({ updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', targetSetId)

  await admin.from('eap_target_set_audit').insert({
    target_set_id: targetSetId,
    action: 'values_updated',
    changed_by: user.id,
    change_json: { warnings: validation.warnings, count: values.length },
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

  const validation = validateEapTargetMatrix(
    (values ?? []).map((v) => ({
      bandKey: v.band_key as McEapBandKey,
      demographicKey: v.demographic_key as McEapDemographicKey,
      targetValue: Number(v.target_value),
    })),
  )
  if (!validation.ok) {
    redirect(`/settings/eap-targets/${targetSetId}?error=${encodeURIComponent(validation.errors.join(' '))}`)
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

  if (values && values.length > 0) {
    await admin.from('eap_target_set_values').insert(
      values.map((v) => ({
        target_set_id: created.id,
        band_key: v.band_key,
        demographic_key: v.demographic_key,
        target_value: v.target_value,
      })),
    )
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
