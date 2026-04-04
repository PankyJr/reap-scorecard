'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function friendlyStorageUploadError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('bucket not found') || (m.includes('not found') && m.includes('bucket'))) {
    return [
      'Profile photo storage is not set up in Supabase yet.',
      '',
      '1) Dashboard → Storage → New bucket',
      '2) Name: avatars — enable “Public bucket”',
      '3) SQL Editor → paste & run: supabase/migrations/20260402120000_avatars_storage.sql',
    ].join('\n')
  }
  if (m.includes('row-level security') || m.includes('permission denied') || m.includes('policy')) {
    return [
      'Upload was blocked by storage permissions.',
      'Run the policies in supabase/migrations/20260402120000_avatars_storage.sql after creating the avatars bucket.',
    ].join('\n')
  }
  return message || 'Upload failed.'
}

export type UpdateProfileResult = { ok: true } | { ok: false; error: string }

export type UploadAvatarResult = { ok: true; publicUrl: string } | { ok: false; error: string }

export async function uploadProfileAvatar(formData: FormData): Promise<UploadAvatarResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return { ok: false, error: 'No file uploaded.' }
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: 'Image must be 5MB or smaller.' }
  }

  if (!file.type || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: 'Please upload a JPEG, PNG, WebP, or GIF image.' }
  }

  const path = `${user.id}/avatar`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: file.type,
  })

  if (uploadError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[uploadProfileAvatar] storage error', uploadError)
    }
    return { ok: false, error: friendlyStorageUploadError(uploadError.message) }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const full_name =
    profile?.full_name ??
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    ''
  const display_name =
    profile?.display_name ?? (user.user_metadata?.display_name as string | undefined) ?? null

  const { error: profileErr } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? profile?.email ?? null,
      full_name: full_name || null,
      display_name,
      avatar_url: publicUrl,
    },
    { onConflict: 'id' },
  )

  if (profileErr) {
    return { ok: false, error: profileErr.message || 'Could not save profile.' }
  }

  const { error: authErr } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      avatar_url: publicUrl,
    },
  })

  if (authErr) {
    return { ok: false, error: authErr.message || 'Could not update session.' }
  }

  revalidatePath('/', 'layout')
  return { ok: true, publicUrl }
}

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const full_name = ((formData.get('full_name') as string) ?? '').trim()
  const display_name = ((formData.get('display_name') as string) ?? '').trim()
  const avatar_url = ((formData.get('avatar_url') as string) ?? '').trim()

  if (!full_name) {
    return { ok: false, error: 'Full name is required.' }
  }

  const meta = {
    ...user.user_metadata,
    full_name,
    display_name: display_name || null,
    avatar_url: avatar_url || null,
  }

  const { error: authErr } = await supabase.auth.updateUser({
    data: meta,
  })
  if (authErr) {
    return { ok: false, error: authErr.message || 'Could not update profile.' }
  }

  const { error: profileErr } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? undefined,
      full_name,
      display_name: display_name || null,
      avatar_url: avatar_url || null,
    },
    { onConflict: 'id' },
  )

  if (profileErr) {
    return { ok: false, error: profileErr.message || 'Could not save profile to database.' }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}
