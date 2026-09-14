'use client'

import { FlaskConical } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { isDemoInstance } from '@/lib/demo/demoMode'

/**
 * Permanent, non-dismissible notice on the public demonstration deployment.
 *
 * Non-dismissible on purpose: anyone landing on this URL — from a CV, a search
 * result, or a forwarded link — must be able to tell at a glance that the
 * suppliers and figures on screen are invented. A banner that can be closed
 * stops doing its job the moment somebody closes it.
 *
 * Sticky rather than static, and above the marketing header's stacking context,
 * because the same reasoning applies at every scroll position and on every
 * route. Static and unstacked, it was painted over by the marketing header on
 * the landing page — the one page a stranger sees first — which left the demo
 * looking like a real consultancy site with no notice at all.
 *
 * Renders nothing at all when NEXT_PUBLIC_DEMO_MODE is not "true", so the
 * production deployment is unaffected.
 */
export function DemoDataBanner() {
  const ref = useRef<HTMLDivElement>(null)

  /**
   * Publish the banner's real height as --demo-banner-height, which is what the
   * marketing header offsets itself by.
   *
   * globals.css carries measured defaults per breakpoint so the first paint is
   * already correct, but those are constants and constants go stale the moment
   * anyone edits the copy above. Measuring the rendered element keeps the two
   * in step whatever the text, the font or the viewport does.
   */
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const publish = () => {
      document.documentElement.style.setProperty(
        '--demo-banner-height',
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      )
    }

    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  if (!isDemoInstance()) return null

  return (
    <div
      ref={ref}
      role="note"
      className="sticky top-0 z-[60] flex items-start gap-2.5 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-900"
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
