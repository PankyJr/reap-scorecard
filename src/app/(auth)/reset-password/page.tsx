import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ResetPasswordForm } from './ResetPasswordForm'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?error=' + encodeURIComponent('Please use the reset link from your email.'))

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-slate-900">
            <Image src="/logo.png" alt="Reap Solutions" width={36} height={36} className="h-9 w-9 object-contain" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">Reap Solutions</span>
        </div>

        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900">
          Set new password
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
          Choose a strong password for your account.
        </p>

        <ResetPasswordForm />

        <p className="mt-6 text-center text-[13px] text-slate-500">
          <Link href="/login" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-600 hover:decoration-slate-600">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
