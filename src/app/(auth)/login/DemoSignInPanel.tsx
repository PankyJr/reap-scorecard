'use client'

import { ArrowRight, FlaskConical } from 'lucide-react'
import { useTransition } from 'react'

import { login } from './actions'

/**
 * One-click entry to the public demonstration instance.
 *
 * The demo exists to be opened by someone who has never seen this app, from a
 * CV or a forwarded link. Making them copy an address and a password off the
 * screen is friction with no purpose: the account is public by design, the
 * project behind it holds nothing but fabricated suppliers, and the password
 * protects nothing. So the credentials are not shown at all — the button just
 * signs them in.
 *
 * The auth path underneath is untouched. This fills in the ordinary login form
 * and calls the ordinary `login` server action: a real user, a real session,
 * and the same row-level security as anyone else. Nothing here bypasses
 * authentication, and dev-bypass and the middleware are not involved.
 *
 * Rendered only where `isDemoInstance()` is true. NEXT_PUBLIC_DEMO_MODE is
 * inlined at build time, so on any other build the branch that renders this is
 * removed and the panel cannot appear.
 */
export function DemoSignInPanel({ email, password }: { email: string; password: string }) {
  const [isPending, startTransition] = useTransition()

  // No default is supplied for the password build arg, so an incomplete build
  // says so rather than offering a button that fails on click.
  const isConfigured = password.length > 0

  function enterDemo() {
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
            Public demo · fabricated data
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-amber-800">
            No sign-up and no credentials needed. One click opens a worked
            example: a full B-BBEE scorecard built on invented suppliers.
          </p>

          <button
            type="button"
            onClick={enterDemo}
            disabled={!isConfigured || isPending}
            className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2.5 text-[13px] font-semibold text-amber-50 transition duration-200 hover:bg-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Opening the demo…' : 'Enter demo'}
            {!isPending && <ArrowRight aria-hidden className="h-3.5 w-3.5" />}
          </button>

          {!isConfigured && (
            <p className="mt-2.5 text-[12px] leading-relaxed text-amber-800">
              This image was built without <span className="font-mono">NEXT_PUBLIC_DEMO_PASSWORD</span>,
              so one-click entry is unavailable.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
