import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AuthShell } from '../AuthShell'
import { SupabaseConfigMissing } from '../SupabaseConfigMissing'
import { ResetPasswordForm } from './ResetPasswordForm'
import { isSupabasePublicConfigComplete } from '@/lib/supabase/public-env'

export const metadata = { title: 'Set new password' }

export default async function ResetPasswordPage() {
  if (!isSupabasePublicConfigComplete()) {
    return <SupabaseConfigMissing />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      '/login?error=' +
        encodeURIComponent(
          'This reset link has expired or is invalid. Use Forgot password on the sign-in page to request a new link.',
        ),
    )
  }

  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  )
}
