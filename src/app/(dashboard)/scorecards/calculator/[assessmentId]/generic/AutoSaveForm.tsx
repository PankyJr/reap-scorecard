'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { ArrowRight, Check, Loader2, TriangleAlert } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 800

/**
 * A form that saves as you type. A short pause after typing, or leaving a
 * field, saves it in the background (`_intent=autosave`) and refreshes the
 * page's server data, so the live score and the checklist update. "Done, next
 * area" posts the form normally (`_intent=next`), which also works with no
 * JavaScript at all.
 */
export function AutoSaveForm(args: {
  action: (formData: FormData) => Promise<void> | void
  children: ReactNode
  /** Visible label of the finishing button. */
  doneLabel?: string
  className?: string
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = useRef(false)
  const inFlight = useRef<Promise<void> | null>(null)
  const [state, setState] = useState<SaveState>('idle')

  async function save() {
    const form = formRef.current
    if (!form || !dirty.current) return
    if (inFlight.current) await inFlight.current
    dirty.current = false
    const data = new FormData(form)
    data.set('_intent', 'autosave')
    setState('saving')
    const run = (async () => {
      try {
        await args.action(data)
        setState('saved')
        router.refresh()
      } catch {
        dirty.current = true
        setState('error')
      }
    })()
    inFlight.current = run
    await run
    inFlight.current = null
  }

  function schedule(delay = DEBOUNCE_MS) {
    dirty.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void save(), delay)
  }

  useEffect(() => {
    const flush = () => {
      if (timer.current) clearTimeout(timer.current)
      if (dirty.current) void save()
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
    // save reads refs only; registering once is intended
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form
      ref={formRef}
      action={args.action}
      className={args.className ?? 'space-y-6'}
      onInput={() => schedule()}
      onChange={() => schedule()}
      onBlur={(e) => {
        if (dirty.current && e.target instanceof HTMLElement && e.target.matches('input, select, textarea')) schedule(0)
      }}
      onSubmit={() => {
        if (timer.current) clearTimeout(timer.current)
        dirty.current = false
      }}
    >
      {args.children}
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <SaveStatus state={state} />
        <DoneButton label={args.doneLabel ?? 'Done, next area'} />
      </div>
    </form>
  )
}

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <p role="status" className="flex min-h-6 items-center gap-1.5 text-[15px]">
      {state === 'saving' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden />
          <span className="text-muted">Saving…</span>
        </>
      ) : state === 'saved' ? (
        <>
          <Check className="h-4 w-4 text-ok" aria-hidden />
          <span className="text-muted">All changes saved</span>
        </>
      ) : state === 'error' ? (
        <>
          <TriangleAlert className="h-4 w-4 text-bad" aria-hidden />
          <span className="text-bad">Not saved yet. Check your connection; your changes are still here.</span>
        </>
      ) : (
        <span className="text-muted">Changes save as you type.</span>
      )}
    </p>
  )
}

function DoneButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" name="_intent" value="next" disabled={pending} className={buttonStyles({ variant: 'primary' })}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {label}
      {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
    </button>
  )
}
