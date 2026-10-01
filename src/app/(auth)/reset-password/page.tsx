import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { AuthMarketingPanel } from '../AuthMarketingPanel'
import { SupabaseConfigMissing } from '../SupabaseConfigMissing'
import { ResetPasswordForm } from './ResetPasswordForm'
import { isSupabasePublicConfigComplete } from '@/lib/supabase/public-env'

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
    <div className="flex min-h-screen w-full bg-surface font-sans antialiased">
      <div className="relative flex w-full flex-col justify-between px-6 py-10 sm:px-10 lg:flex-none lg:w-[30rem] xl:w-[32rem] lg:px-16 xl:px-20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-sidebar">
            <Image src="/logo.png" alt="Reap Solutions" width={36} height={36} className="h-9 w-9 object-contain" />
          </div>
          <span className="text-base font-semibold text-ink">REAP Scorecard</span>
        </div>

        <div className="mx-auto flex w-full max-w-[340px] flex-1 flex-col justify-center py-8">
          <ResetPasswordForm />
        </div>

        <div className="flex items-center justify-between text-sm text-faint">
          <span>&copy; {new Date().getFullYear()} Reap Solutions</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="transition-colors hover:text-muted">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-muted">
              Terms
            </Link>
          </div>
        </div>
      </div>

      <AuthMarketingPanel />
    </div>
  )
}
