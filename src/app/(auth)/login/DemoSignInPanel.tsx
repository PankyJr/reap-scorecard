'use client'

import { ArrowRight, FlaskConical } from 'lucide-react'
import { useTransition } from 'react'

import { login } from './actions'

/**
 * Credentials panel for the public demonstration instance.
 *
 * The demo exists to be opened by someone who has never seen this app, from a
 * CV or a forwarded link. A login form they cannot get past defeats the point,
 * so the one seeded account is published here in the open — deliberately, not
 * as a workaround. The project behind it holds nothing but fabricated
 * suppliers, so the password protects nothing and hiding it would buy nothing.
 *
 * Rendered only where `isDemoInstance()` is true. `NEXT_PUBLIC_DEMO_MODE` is
 * inlined at build time, so on any other build the branch that renders this is
 * removed and the panel cannot appear.
 *
 * The auth path itself is untouched: this fills in the ordinary login form and
 * calls the ordinary `login` action. The demo signs in as a real user, with a
 * real session, constrained by the same row-level security as anyone else.
 */
export function DemoSignInPanel({ email, password }: { email: string; password: string }) {
  const [isPending, startTransition] = useTransition()

  // No default is supplied for the password build arg, so an incomplete build
  // shows the reason rather than a button that fails silently on click.
  const isConfigured = password.length > 0

  function signInAsDemoUser() {
    if (!isConfigured) return
    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)
    formData.set('next', '/dashboard')
    startTransition(async () => {
      await login(formData)
    })
  }

  return (
    <section
      aria-labelledby="demo-signin-heading"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
    >
      <div className="flex items-start gap-2.5">
        <FlaskConical aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 id="demo-signin-heading" className="text-[13px] font-semibold leading-relaxed">
            Public demo · fabricated data · sign in with the credentials below
          </h2>

          <dl className="mt-3 space-y-1.5 text-[12px] leading-relaxed">
            <div className="flex items-baseline gap-2">
              <dt className="w-[4.25rem] shrink-0 text-amber-800/80">Email</dt>
              <dd className="min-w-0 break-all font-mono text-[12px] text-amber-950">{email}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="w-[4.25rem] shrink-0 text-amber-800/80">Password</dt>
              <dd className="min-w-0 break-all font-mono text-[12px] text-amber-950">
                {isConfigured ? password : <span className="font-sans italic">not set for this build</span>}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={signInAsDemoUser}
            disabled={!isConfigured || isPending}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3.5 py-2 text-[13px] font-medium text-amber-50 transition duration-200 hover:bg-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Signing in…' : 'Sign in as demo user'}
            {!isPending && <ArrowRight aria-hidden className="h-3.5 w-3.5" />}
          </button>

          {!isConfigured && (
            <p className="mt-2.5 text-[12px] leading-relaxed text-amber-800">
              This image was built without <span className="font-mono">NEXT_PUBLIC_DEMO_PASSWORD</span>,
              so one-click sign-in is unavailable.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
