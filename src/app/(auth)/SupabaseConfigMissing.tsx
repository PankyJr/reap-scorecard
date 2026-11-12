import { Settings2 } from 'lucide-react'
import { AuthShell } from './AuthShell'

/** Shown when hosted Supabase public env vars are missing — avoids throwing during `createClient()`. */
export function SupabaseConfigMissing() {
  return (
    <AuthShell>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control border border-line text-icon">
          <Settings2 className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-6 text-title font-semibold text-ink">Sign-in is temporarily unavailable</h1>
        <p className="mt-1 text-body text-label">
          This deployment is missing the public Supabase settings. The host must define <code className="text-meta">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="text-meta">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (or <code className="text-meta">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>) in the build
          environment, then redeploy. See <code className="text-meta">.env.local.example</code> in the repository.
        </p>
        <p className="mt-4 text-meta text-label">Nothing is wrong with your account — this is an infrastructure fix on the app side.</p>
      </div>
    </AuthShell>
  )
}
