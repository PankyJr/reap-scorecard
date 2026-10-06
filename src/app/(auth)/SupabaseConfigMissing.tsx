import Image from 'next/image'
import Link from 'next/link'

/** Shown when hosted Supabase public env vars are missing — avoids throwing during `createClient()`. */
export function SupabaseConfigMissing() {
  return (
    <div className="flex min-h-screen w-full bg-surface font-sans antialiased">
      <div className="relative mx-auto flex w-full max-w-lg flex-col justify-center px-6 py-12 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-brand">
            <Image src="/logo.png" alt="Reap Solutions" width={36} height={36} className="h-9 w-9 object-contain" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Reap Solutions</span>
        </div>

        <div className="mt-10 rounded-2xl border border-warn/30 bg-warn-soft/80 px-5 py-6 shadow-sm">
          <p className="text-sm font-medium text-warn/80">
            Configuration required
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">
            Sign-in is temporarily unavailable
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            This deployment is missing the public Supabase settings. The host must define{' '}
            <code className="rounded bg-surface/80 px-1 py-0.5 text-sm">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-surface/80 px-1 py-0.5 text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (or{' '}
            <code className="rounded bg-surface/80 px-1 py-0.5 text-sm">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>)
            in the build environment, then redeploy. See <code className="text-sm">.env.local.example</code> in the
            repository.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Nothing is wrong with your account — this is an infrastructure fix on the app side.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-between text-sm text-faint">
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
    </div>
  )
}
