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
