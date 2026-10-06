'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { GLOSSARY, type GlossaryKey } from '@/lib/glossary'

/**
 * A B-BBEE word with its plain-English meaning one tap away.
 * Renders the word followed by a small "?" button; the meaning opens below it
 * and closes on Escape or a tap elsewhere. Works with keyboard and touch.
 */
export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  const entry = GLOSSARY[k]
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setOpen(false)
        return
      }
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline">
      {children ?? entry.term}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`What does ${entry.term} mean?`}
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex h-[18px] w-[18px] translate-y-[-1px] items-center justify-center rounded-full border border-line-strong bg-surface align-middle text-[11px] font-bold text-muted hover:border-brand hover:text-brand"
      >
        ?
      </button>
      {open ? (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-full z-40 mt-2 block w-[min(20rem,80vw)] rounded-control border border-line bg-surface p-3 text-left text-sm font-normal normal-case leading-snug tracking-normal text-ink shadow-lg"
        >
          <span className="block font-semibold">{entry.term}</span>
          <span className="mt-1 block text-muted">{entry.meaning}</span>
        </span>
      ) : null}
    </span>
  )
}
