import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getUserSafe } from '@/lib/auth/get-user-safe'
import { hasSupabaseAuthCookies } from '@/lib/auth/session-cookies'
import { createClient } from '@/utils/supabase/server'
import { AuthShell } from '../AuthShell'
import { SupabaseConfigMissing } from '../SupabaseConfigMissing'
import { AuthForm } from './AuthForm'
import { DemoSignInPanel } from './DemoSignInPanel'
import { isAuthDevBypassEnabled } from '@/lib/auth/dev-bypass'
import { isSupabasePublicConfigComplete } from '@/lib/supabase/public-env'
import { getEnabledOAuthProviders } from '@/lib/auth/oauth-providers'
import { PRIVATE_APP_ROBOTS } from '@/lib/seo/metadata'
import { DEMO_USER_EMAIL, getDemoPassword, isDemoInstance } from '@/lib/demo/demoMode'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: PRIVATE_APP_ROBOTS,
}

export default async function LoginPage() {
  if (isAuthDevBypassEnabled()) {
    redirect('/dashboard')
  }

  if (!isSupabasePublicConfigComplete()) {
    return <SupabaseConfigMissing />
  }

  const cookieStore = await cookies()
  if (hasSupabaseAuthCookies(cookieStore.getAll())) {
    const supabase = await createClient()
    const { user } = await getUserSafe(supabase)
    if (user) redirect('/dashboard')
  }

  // Resolved server-side so the browser is never offered a provider the
  // project cannot actually complete a sign-in with.
  const enabledOAuthProviders = await getEnabledOAuthProviders()

  return (
    <AuthShell>
      {/* The demo panel is inside the isDemoInstance() branch, and
          NEXT_PUBLIC_DEMO_MODE is inlined at build time, so on any other
          build this collapses to the form on its own. */}
      <div className="flex flex-col gap-6">
        {isDemoInstance() && <DemoSignInPanel email={DEMO_USER_EMAIL} password={getDemoPassword()} />}
        <AuthForm enabledOAuthProviders={enabledOAuthProviders} />
      </div>
    </AuthShell>
  )
}
