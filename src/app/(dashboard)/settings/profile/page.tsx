import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ProfileForm, type ProfileFormInitial } from '@/components/settings/ProfileForm'
import { getAuthProviderLabel } from '@/lib/auth/provider-label'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const meta = user.user_metadata ?? {}
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle()

  const fullName =
    profile?.full_name ||
    (meta.full_name as string) ||
    (meta.name as string) ||
    ''
  const displayName =
    (profile?.display_name as string) ||
    (meta.display_name as string) ||
    ''
  const avatarUrl =
    profile?.avatar_url ||
    (meta.avatar_url as string) ||
    (meta.picture as string) ||
    ''

  const initial: ProfileFormInitial = {
    email: user.email ?? profile?.email ?? '',
    fullName: fullName,
    displayName: displayName,
    avatarUrl: avatarUrl,
    authProviderLabel: getAuthProviderLabel(user),
  }

  return (
    <SettingsPanel
      title="Profile"
      description="Update how your name and photo appear across the platform."
    >
      <ProfileForm initial={initial} />
    </SettingsPanel>
  )
}
