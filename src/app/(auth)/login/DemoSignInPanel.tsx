'use client'

import { buttonStyles } from '@/components/ui/buttonStyles'

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
      className="rounded-control border border-attention/20 bg-attention-soft p-4"
    >
      <div className="flex items-start gap-2.5">
        <FlaskConical aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-attention" />
        <div className="min-w-0 flex-1">
          <h2 id="demo-signin-heading" className="text-body font-medium text-ink">
            Public demo · fabricated data
          </h2>
          <p className="mt-0.5 text-meta text-label">
            No sign-up and no credentials needed. One click opens a worked
            example: a full B-BBEE scorecard built on invented suppliers.
          </p>

          <button
            type="button"
            onClick={enterDemo}
            disabled={!isConfigured || isPending}
            className={buttonStyles({ variant: 'secondary', className: 'mt-3 w-full' })}
          >
            {isPending ? 'Opening the demo…' : 'Enter demo'}
            {!isPending && <ArrowRight aria-hidden className="h-3.5 w-3.5" />}
          </button>

          {!isConfigured && (
            <p className="mt-2.5 text-meta text-label">
              This image was built without <span className="font-mono">NEXT_PUBLIC_DEMO_PASSWORD</span>,
              so one-click entry is unavailable.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
