'use client'

import { useState, type ReactNode } from 'react'
import { Tooltip as T } from 'radix-ui'
import { GLOSSARY, type GlossaryKey } from '@/lib/glossary'

/**
 * A B-BBEE word with its meaning one hover, focus or tap away. The word gets a
 * dotted underline; the tooltip shows the plain meaning and one example, both
 * from the single glossary (lib/glossary.ts). Same component everywhere.
 *
 * Opens on hover and keyboard focus (Radix), and on tap/click for touch
 * screens. Esc closes. The meaning is also in the Help centre glossary, so
 * nothing lives only in a tooltip.
 */
export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  const entry = GLOSSARY[k]
  const [open, setOpen] = useState(false)
  return (
    // Its own provider, so a Term works on any page, inside the app shell or not.
    <T.Provider delayDuration={200} skipDelayDuration={300}>
      <T.Root open={open} onOpenChange={setOpen}>
        <T.Trigger asChild>
          <button
            type="button"
            data-term={k}
            aria-label={`${typeof children === 'string' ? children : entry.term}: what does it mean?`}
            onClick={(e) => {
              // A tap on a touch screen: toggle instead of waiting for hover.
              e.preventDefault()
              setOpen((v) => !v)
            }}
            className="inline cursor-help rounded-sm p-0 align-baseline font-[inherit] text-[length:inherit] leading-[inherit] text-inherit underline decoration-current/45 decoration-dotted decoration-1 underline-offset-[3px] transition-colors duration-150 hover:decoration-teal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
          >
            {children ?? entry.term}
          </button>
        </T.Trigger>
        <T.Portal>
          <T.Content
            side="top"
            sideOffset={6}
            collisionPadding={12}
            className="reap-pop-in z-[120] w-[min(20rem,calc(100vw-2rem))] rounded-control bg-tooltip px-3.5 py-3 text-left text-body font-normal normal-case tracking-normal text-tooltip-ink shadow-pop"
          >
            <span className="block font-semibold">{entry.term}</span>
            <span className="mt-1 block">{entry.meaning}</span>
            <span className="mt-2 block text-meta opacity-80">For example: {entry.example}</span>
            <T.Arrow className="fill-tooltip" width={12} height={6} />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}
