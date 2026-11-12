'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ChevronRight, CircleHelp, Mail, Phone, PlayCircle, X } from 'lucide-react'
import { PAGE_HELP, helpForPath, type HelpProblem, type NextAction, type PageHelpEntry, type PageKey } from '@/content/page-help'
import { GLOSSARY } from '@/lib/glossary'
import { MARKETING_CONTACT } from '@/components/marketing/marketingContactData'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'
import { helpStore, serverHelpState } from './help-store'
import { subscribeHelpStorage, tourFinished } from './help-storage'
import { findHelpTarget } from './TourRunner'
import { useHelp } from './HelpProvider'

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'

/** Scroll to an element and pulse a teal outline round it for 2 seconds. */
function pulse(el: HTMLElement) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  el.removeAttribute('data-help-pulse')
  // Next frame, so a second click restarts the pulse.
  requestAnimationFrame(() => {
    el.setAttribute('data-help-pulse', '')
    window.setTimeout(() => el.removeAttribute('data-help-pulse'), 2000)
  })
}

/**
 * The page help panel: right side, 420px (a bottom sheet on phones), opened by
 * the "?" in the page header or the ? key. Esc closes, focus stays inside
 * while it is open and goes back to where it was when it closes.
 */
export function PageHelpPanel() {
  const state = useSyncExternalStore(helpStore.subscribe, helpStore.get, serverHelpState)
  const pathname = usePathname() ?? ''
  const { open, problem, nonce } = state.panel
  const registered = state.registered && state.registered.path === pathname ? state.registered : null
  const key: PageKey | null = registered?.page ?? findKey(pathname)
  const entry = key ? (PAGE_HELP[key] as PageHelpEntry<unknown>) : null

  // Close when the page changes underneath (a link inside the panel, say).
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    helpStore.closePanel()
  }, [pathname])

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  if (!mounted || !open) return null
  return createPortal(
    <Panel key={nonce} entryKey={key} entry={entry} data={registered?.data} problem={problem} pathname={pathname} />,
    document.body,
  )
}

function findKey(pathname: string): PageKey | null {
  const entry = helpForPath(pathname)
  if (!entry) return null
  return (Object.keys(PAGE_HELP) as PageKey[]).find((k) => PAGE_HELP[k].route === entry.route) ?? null
}

function Panel(args: { entryKey: PageKey | null; entry: PageHelpEntry<unknown> | null; data: unknown; problem: string | null; pathname: string }) {
  const { entry, entryKey } = args
  const help = useHelp()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<Element | null>(null)
  const [missingStep, setMissingStep] = useState<string | null>(null)
  const finished = useSyncExternalStore(
    subscribeHelpStorage,
    () => (entryKey ? tourFinished(`page:${entryKey}`) : false),
    () => false,
  )

  const next: NextAction | null = useMemo(() => {
    if (!entry?.next || args.data === undefined) return null
    try {
      return entry.next(args.data)
    } catch {
      return null
    }
  }, [entry, args.data])

  const close = useCallback(() => helpStore.closePanel(), [])

  // Focus: into the panel on open (or onto the asked-for question), back out on close.
  useEffect(() => {
    restoreRef.current = document.activeElement
    const panel = panelRef.current
    if (!panel) return
    if (args.problem) {
      const target = panel.querySelector<HTMLDetailsElement>(`[data-problem="${CSS.escape(args.problem)}"]`)
      if (target) {
        target.open = true
        target.scrollIntoView({ block: 'center' })
        target.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true })
        return () => (restoreRef.current as HTMLElement | null)?.focus?.({ preventScroll: true })
      }
    }
    panel.querySelector<HTMLElement>('[data-panel-heading]')?.focus({ preventScroll: true })
    return () => (restoreRef.current as HTMLElement | null)?.focus?.({ preventScroll: true })
  }, [args.problem])

  // Esc closes; Tab stays inside; a press outside closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault()
        first.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!panelRef.current || !t || panelRef.current.contains(t)) return
      // A glossary tooltip opened from inside the panel lives in its own portal.
      if (t.closest('[data-radix-popper-content-wrapper]')) return
      close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [close])

  const showStep = (target: string) => {
    const el = findHelpTarget(target)
    if (!el) {
      setMissingStep(target)
      return
    }
    setMissingStep(null)
    const r = el.getBoundingClientRect()
    // On a phone, or when the element sits under the panel, get out of the way first.
    if (window.innerWidth < 640 || r.right > window.innerWidth - 440) close()
    pulse(el)
  }

  const showMe = () => {
    if (!entryKey) return
    help.startTour(`page:${entryKey}`, args.pathname)
  }

  return (
    <>
      {/* Phones: a scrim behind the sheet. Desktop: none, so "show me where" stays visible. */}
      <div className="fixed inset-0 z-[100] bg-scrim sm:hidden" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-help-title"
        data-help-ui=""
        data-help-panel={entryKey ?? 'none'}
        className={cn(
          'reap-pop-in fixed z-[101] flex flex-col overflow-hidden bg-surface shadow-pop',
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-card',
          'sm:inset-x-auto sm:bottom-2 sm:right-2 sm:top-2 sm:max-h-none sm:w-[420px] sm:rounded-card',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-meta text-label">
              <CircleHelp className="h-3.5 w-3.5" aria-hidden /> Help for this page
            </p>
            <h2 id="page-help-title" data-panel-heading tabIndex={-1} className="mt-0.5 text-section font-semibold text-ink outline-none">
              {entry?.title ?? 'This page'}
            </h2>
          </div>
          <button type="button" onClick={close} aria-label="Close help" className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-sm text-label transition-colors duration-150 hover:bg-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 sm:h-8 sm:w-8">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
          {entry ? (
            <>
              <section aria-labelledby="help-purpose">
                <h3 id="help-purpose" className="text-caps font-semibold uppercase tracking-[0.08em] text-label">
                  What this page is for
                </h3>
                <p className="mt-1.5 text-body text-ink">{entry.purpose}</p>
              </section>

              {next ? (
                <section aria-labelledby="help-next" className="rounded-control bg-wash px-4 py-3.5" data-help-next="">
                  <h3 id="help-next" className="text-meta font-medium text-label">
                    Next
                  </h3>
                  <p className="mt-0.5 text-body text-ink">{next.text}</p>
                  <Link href={next.href} onClick={close} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-3' })}>
                    {next.label} <ArrowRight aria-hidden />
                  </Link>
                </section>
              ) : null}

              <section aria-labelledby="help-steps">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="help-steps" className="text-caps font-semibold uppercase tracking-[0.08em] text-label">
                    How to use it
                  </h3>
                  <button type="button" onClick={showMe} data-help-show-me="" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
                    <PlayCircle aria-hidden /> Show me (30 sec)
                  </button>
                </div>
                {finished ? <p className="mt-1 text-meta text-label">You have seen this tour. Show me runs it again.</p> : null}
                <ol className="mt-3 space-y-1">
                  {entry.steps.map((step, i) => (
                    <li key={step.target + i}>
                      <button
                        type="button"
                        onClick={() => showStep(step.target)}
                        className="group flex w-full items-start gap-3 rounded-control px-2 py-2 text-left transition-colors duration-150 hover:bg-wash focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
                      >
                        <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-segment text-caps font-semibold tabular-nums text-label">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body font-medium text-ink">{step.title}</span>
                          <span className="block text-meta text-label">{step.body}</span>
                          {missingStep === step.target ? (
                            <span className="mt-1 block text-meta text-attention">
                              {step.missing ?? 'This part is not on the page right now.'}
                            </span>
                          ) : null}
                        </span>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-icon opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ol>
              </section>

              {entry.terms.length > 0 ? (
                <section aria-labelledby="help-terms">
                  <h3 id="help-terms" className="text-caps font-semibold uppercase tracking-[0.08em] text-label">
                    Words on this page
                  </h3>
                  <dl className="mt-2 divide-y divide-divider">
                    {entry.terms.map((k) => (
                      <div key={k} className="py-2.5">
                        <dt className="text-body font-medium text-ink">{GLOSSARY[k].term}</dt>
                        <dd className="text-meta text-label">{GLOSSARY[k].meaning}</dd>
                        <dd className="mt-0.5 text-meta text-subtle">For example: {GLOSSARY[k].example}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              <section aria-labelledby="help-problems">
                <h3 id="help-problems" className="text-caps font-semibold uppercase tracking-[0.08em] text-label">
                  Common questions
                </h3>
                <div className="mt-2 divide-y divide-divider">
                  {entry.problems.map((p) => (
                    <ProblemItem key={p.id} problem={p} defaultOpen={p.id === args.problem} onLink={close} />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <p className="text-body text-label">There is no help written for this page yet. The Help centre covers every page and every B-BBEE word.</p>
          )}
        </div>

        <div className="border-t border-line bg-sunken px-5 py-4 text-meta text-label">
          <p className="font-medium text-ink">Still stuck?</p>
          <p className="mt-1">REAP Solutions, {MARKETING_CONTACT.hours}:</p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <a href={`mailto:${MARKETING_CONTACT.email}`} className="inline-flex items-center gap-1.5 font-medium text-teal hover:underline">
              <Mail className="h-3.5 w-3.5" aria-hidden /> {MARKETING_CONTACT.email}
            </a>
            <a href={`tel:${MARKETING_CONTACT.phone}`} className="inline-flex items-center gap-1.5 font-medium text-teal hover:underline">
              <Phone className="h-3.5 w-3.5" aria-hidden /> {MARKETING_CONTACT.phoneDisplay}
            </a>
          </p>
          <Link href="/settings/help" onClick={close} className="mt-2 inline-flex items-center gap-1 font-medium text-teal hover:underline">
            Open the full Help centre <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </>
  )
}

function ProblemItem({ problem, defaultOpen, onLink }: { problem: HelpProblem; defaultOpen: boolean; onLink: () => void }) {
  return (
    <details data-problem={problem.id} open={defaultOpen} className="group py-1">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-control px-1 py-2 text-body font-medium text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 [&::-webkit-details-marker]:hidden">
        {problem.q}
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-icon transition-transform duration-150 group-open:rotate-90" aria-hidden />
      </summary>
      <div className="px-1 pb-2 text-meta text-label">
        <p>{problem.a}</p>
        {problem.link ? (
          <Link href={problem.link.href} onClick={onLink} className="mt-1.5 inline-flex font-medium text-teal hover:underline">
            {problem.link.label}
          </Link>
        ) : null}
      </div>
    </details>
  )
}
