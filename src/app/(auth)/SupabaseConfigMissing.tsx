import Image from 'next/image'
import Link from 'next/link'

/** Shown when hosted Supabase public env vars are missing — avoids throwing during `createClient()`. */
export function SupabaseConfigMissing() {
  return (
    <div className="flex min-h-screen w-full bg-white font-sans antialiased">
      <div className="relative mx-auto flex w-full max-w-lg flex-col justify-center px-6 py-12 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-slate-900">
            <Image src="/logo.png" alt="Reap Solutions" width={36} height={36} className="h-9 w-9 object-contain" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">Reap Solutions</span>
        </div>

        <div className="mt-10 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-5 py-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800/80">
            Configuration required
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            Sign-in is temporarily unavailable
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            This deployment is missing the public Supabase settings. The host must define{' '}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (or{' '}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>)
            in the build environment, then redeploy. See <code className="text-xs">.env.local.example</code> in the
            repository.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            Nothing is wrong with your account — this is an infrastructure fix on the app side.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-between text-[11px] text-slate-400">
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
    </div>
  )
}
