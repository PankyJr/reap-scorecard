import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { AuthMarketingPanel } from '../AuthMarketingPanel'
import { ResetPasswordForm } from './ResetPasswordForm'

export default async function ResetPasswordPage() {
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
    <div className="flex min-h-screen w-full bg-white font-sans antialiased">
      <div className="relative flex w-full flex-col justify-between px-6 py-10 sm:px-10 lg:flex-none lg:w-[30rem] xl:w-[32rem] lg:px-16 xl:px-20">
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-slate-900/20 to-transparent" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-slate-900">
            <Image src="/logo.png" alt="Reap Solutions" width={36} height={36} className="h-9 w-9 object-contain" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">Reap Solutions</span>
        </div>

        <div className="mx-auto flex w-full max-w-[340px] flex-1 flex-col justify-center py-8">
          <ResetPasswordForm />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>&copy; {new Date().getFullYear()} Reap Solutions</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="transition-colors hover:text-slate-600">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-slate-600">
              Terms
            </Link>
          </div>
        </div>
      </div>

      <AuthMarketingPanel />
    </div>
  )
}
