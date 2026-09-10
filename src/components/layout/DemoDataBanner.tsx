import { FlaskConical } from 'lucide-react'

import { isDemoInstance } from '@/lib/demo/demoMode'

/**
 * Permanent, non-dismissible notice on the public demonstration deployment.
 *
 * Non-dismissible on purpose: anyone landing on this URL — from a CV, a search
 * result, or a forwarded link — must be able to tell at a glance that the
 * suppliers and figures on screen are invented. A banner that can be closed
 * stops doing its job the moment somebody closes it.
 *
 * Renders nothing at all when NEXT_PUBLIC_DEMO_MODE is not "true", so the
 * production deployment is unaffected.
 */
export function DemoDataBanner() {
  if (!isDemoInstance()) return null

  return (
    <div
      role="note"
      className="flex items-start gap-2.5 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-900"
    >
      <FlaskConical aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-[13px] leading-relaxed">
        <span className="font-semibold">Demonstration instance.</span>{' '}
        Every company, supplier and figure shown here is fabricated for
        demonstration purposes. This deployment holds no REAP Solutions client
        data, and nothing on it is a real B-BBEE result.
      </p>
    </div>
  )
}
