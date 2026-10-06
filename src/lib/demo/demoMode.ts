/**
 * Demo-instance flag.
 *
 * True only on the public demonstration deployment, which runs against a
 * dedicated Supabase project seeded with fabricated suppliers. It is never set
 * on the production Netlify deployment, so every behaviour gated on this is
 * inert there.
 *
 * `NEXT_PUBLIC_` is required because the banner renders in the browser, which
 * means the value is inlined into the bundle at BUILD time — a demo image is
 * built as a demo image and cannot be flipped by changing a runtime variable.
 *
 * The comparison is written out in full rather than read dynamically so that
 * Next.js can statically replace it during the build.
 */
export function isDemoInstance(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}

/**
 * The single seeded account on the demo instance.
 *
 * Public by design: the demo is a portfolio piece, the project it points at
 * holds nothing but fabricated suppliers, and a login form nobody can get past
 * is not a demonstration of anything.
 */
export const DEMO_USER_EMAIL = 'demo@reap-demo.invalid'

/**
 * Password for the seeded demo account, supplied at BUILD time via the
 * NEXT_PUBLIC_DEMO_PASSWORD build arg and matched to DEMO_USER_PASSWORD at
 * seed time.
 *
 * There is deliberately no default. A build that forgets to pass it renders a
 * visibly disabled sign-in button saying so, rather than a button that looks
 * fine and fails on click.
 */
export function getDemoPassword(): string {
  return process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? ''
}
