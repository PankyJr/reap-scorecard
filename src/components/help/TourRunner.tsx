'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, MousePointerClick } from 'lucide-react'
import { helpForPath, type TourStepDef } from '@/content/page-help'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'
import { parseActiveTour, readActiveTourRaw, setTourFinished, subscribeHelpStorage, writeActiveTour, type ActiveTour } from './help-storage'
import { resolveTour } from './tours'

/** How long to wait for the step's element once its page has loaded. */
const WAIT_FOR_TARGET_MS = 3000
/** How long to let a page's loading skeleton finish before looking. */
const WAIT_FOR_PAGE_MS = 15000
/** Space between the element and the highlight box. */
const PAD = 6
const CARD_W = 360

type Phase = 'waiting' | 'shown' | 'missing'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const norm = (p: string) => p.split('?')[0].replace(/\/+$/, '') || '/'

/** The first visible element carrying data-help="… target …". */
export function findHelpTarget(target: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const nodes = document.querySelectorAll<HTMLElement>(`[data-help~="${CSS.escape(target)}"]`)
  for (const node of nodes) {
    if (node.closest('[data-help-ui]')) continue
    const r = node.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    const style = getComputedStyle(node)
    if (style.visibility === 'hidden' || style.display === 'none') continue
    return node
  }
  return null
}

const noop = () => () => {}

/**
 * The running tour. Tour state lives in session storage, so a tour survives
 * the page changes it makes itself. Each step: go to its page if needed, wait
 * for the page and then for the element (up to 3s), scroll it into view and
 * highlight it. If the element is truly not there, the step is shown in the
 * centre with an explanation. A step is never skipped; the count always says
 * "Step x of N" for the whole tour.
 */
export function TourRunner() {
  const raw = useSyncExternalStore(subscribeHelpStorage, readActiveTourRaw, () => null)
  const active = useMemo(() => parseActiveTour(raw), [raw])
  const tour = useMemo(() => (active ? resolveTour(active.id, active.path) : null), [active])
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  if (!mounted || !active || !tour || tour.steps.length === 0) return null
  const index = Math.min(Math.max(active.index, 0), tour.steps.length - 1)
  return createPortal(
    <TourStep key={`${active.id}:${index}`} active={{ ...active, index }} title={tour.title} steps={tour.steps} />,
    document.body,
  )
}

function TourStep({ active, title, steps }: { active: ActiveTour; title: string; steps: TourStepDef[] }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const step = steps[active.index]
  const total = steps.length
  const isLast = active.index === total - 1
  const onPath = norm(pathname) === norm(step.path)
  const pageTitle = helpForPath(step.path)?.title ?? 'the next page'

  const [phase, setPhase] = useState<Phase>('waiting')
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 1440, h: 900 })
  const pushed = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const goTo = useCallback(
    (index: number) => {
      if (index >= total) {
        setTourFinished(active.id, true)
        writeActiveTour(null)
        return
      }
      writeActiveTour({ ...active, index: Math.max(0, index) })
    },
    [active, total],
  )
  const end = useCallback(() => writeActiveTour(null), [])

  // 1. The step's page: go there once. If the user later leaves, offer "Go there" instead of pulling them back.
  useEffect(() => {
    if (onPath) {
      pushed.current = true
      return
    }
    if (!pushed.current) {
      pushed.current = true
      router.push(step.path)
    }
  }, [onPath, router, step.path])

  // 2. On the page: wait for loading to finish, then for the element; scroll it into view.
  useEffect(() => {
    if (!onPath) return
    let cancelled = false
    const run = async () => {
      const pageDeadline = Date.now() + WAIT_FOR_PAGE_MS
      while (!cancelled && Date.now() < pageDeadline && document.querySelector('main [aria-busy="true"]')) await sleep(100)
      const deadline = Date.now() + WAIT_FOR_TARGET_MS
      let found: HTMLElement | null = null
      while (!cancelled && !found && Date.now() < deadline) {
        found = findHelpTarget(step.target)
        if (!found) await sleep(100)
      }
      if (cancelled) return
      if (found) {
        found.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
        setEl(found)
        setPhase('shown')
      } else {
        setPhase('missing')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [onPath, step.target])

  // 3. Keep the box on the element every frame (scroll, resize, content moving).
  useEffect(() => {
    if (phase !== 'shown' || !el) return
    let node = el
    let last = ''
    let raf = 0
    const tick = () => {
      if (!node.isConnected) node = findHelpTarget(step.target) ?? node
      const r = node.getBoundingClientRect()
      const key = `${r.top}|${r.left}|${r.width}|${r.height}|${window.innerWidth}|${window.innerHeight}`
      if (key !== last) {
        last = key
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        setViewport({ w: window.innerWidth, h: window.innerHeight })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, el, step.target])

  // 4. Action steps: the user's real click on the element moves the tour on
  //    (written before any navigation the click starts).
  useEffect(() => {
    if (phase !== 'shown' || !el || !step.action) return
    const onClick = () => goTo(active.index + 1)
    el.addEventListener('click', onClick, { capture: true })
    return () => el.removeEventListener('click', onClick, { capture: true })
  }, [phase, el, step.action, goTo, active.index])

  // Keyboard: Esc ends; arrows move (not on an action step that is waiting for its click).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        end()
      } else if (e.key === 'ArrowRight' && !(step.action && phase === 'shown')) goTo(active.index + 1)
      else if (e.key === 'ArrowLeft' && active.index > 0) goTo(active.index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active.index, end, goTo, phase, step.action])

  // Focus the card when the step settles, for keyboard and screen-reader users.
  useEffect(() => {
    if (phase === 'waiting') return
    cardRef.current?.focus({ preventScroll: true })
  }, [phase])

  const waitingForClick = Boolean(step.action) && phase === 'shown'
  const state: 'navigating' | Phase = onPath ? phase : 'navigating'
  const hole =
    state === 'shown' && rect
      ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
      : null
  const phone = viewport.w < 640

  const card = (
    <div
      ref={cardRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-body"
      data-tour-card=""
      data-tour-id={active.id}
      data-tour-step={active.index + 1}
      data-tour-total={total}
      data-tour-state={state}
      data-tour-target={step.target}
      className="reap-pop-in pointer-events-auto w-full rounded-card bg-surface p-5 text-left shadow-pop outline-none sm:w-[360px]"
    >
      <p className="text-meta text-label">
        {title} · <span className="tabular-nums">Step {active.index + 1} of {total}</span>
      </p>
      <h2 id="tour-step-title" className="mt-1.5 text-section font-semibold text-ink">
        {step.title}
      </h2>
      <p id="tour-step-body" className="mt-1 text-body text-label">
        {step.body}
      </p>
      {state === 'missing' ? (
        <p className="mt-3 rounded-control bg-sunken px-3 py-2.5 text-meta text-ink" data-tour-missing="">
          {step.missing ?? 'This part is not on the page right now, so there is nothing to point at.'}
        </p>
      ) : null}
      {state === 'navigating' ? (
        <p className="mt-3 text-meta text-label" aria-live="polite">
          Opening {pageTitle}…{' '}
          <button type="button" className="font-medium text-teal hover:underline" onClick={() => router.push(step.path)}>
            Go there
          </button>
        </p>
      ) : null}
      {state === 'waiting' ? (
        <p className="mt-3 text-meta text-label" aria-live="polite">
          Finding it on the page…
        </p>
      ) : null}
      {waitingForClick ? (
        <p className="mt-3 flex items-center gap-2 text-meta font-medium text-teal">
          <MousePointerClick className="h-4 w-4 shrink-0" aria-hidden /> Click the highlighted part to continue.
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={end} className={buttonStyles({ variant: 'plain', size: 'sm', className: '-ml-2 mr-auto' })}>
          Skip tour
        </button>
        {active.index > 0 ? (
          <button type="button" onClick={() => goTo(active.index - 1)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            <ArrowLeft aria-hidden /> Back
          </button>
        ) : null}
        {waitingForClick ? null : (
          <button
            type="button"
            data-tour-next=""
            disabled={state === 'waiting' || state === 'navigating'}
            onClick={() => goTo(active.index + 1)}
            className={buttonStyles({ variant: 'primary', size: 'sm' })}
          >
            {isLast ? 'Done' : 'Next'} {isLast ? null : <ArrowRight aria-hidden />}
          </button>
        )}
      </div>
    </div>
  )

  // Where the card goes: below or above the element, else beside it, else a corner. Phones: a bottom sheet.
  let cardStyle: CSSProperties | null = null
  if (hole && !phone) {
    const below = viewport.h - (hole.top + hole.height)
    const above = hole.top
    const left = Math.min(Math.max(hole.left, 16), viewport.w - CARD_W - 16)
    if (below >= 230) cardStyle = { top: hole.top + hole.height + 12, left }
    else if (above >= 230) cardStyle = { bottom: viewport.h - hole.top + 12, left }
    else if (viewport.w - (hole.left + hole.width) >= CARD_W + 28)
      cardStyle = { top: Math.min(Math.max(hole.top, 16), viewport.h - 280), left: hole.left + hole.width + 12 }
    else if (hole.left >= CARD_W + 28) cardStyle = { top: Math.min(Math.max(hole.top, 16), viewport.h - 280), left: hole.left - CARD_W - 12 }
    else cardStyle = { right: 24, bottom: 24 }
  }

  return (
    <div data-help-ui="" data-tour-active={active.id} className="fixed inset-0 z-[110]" style={{ pointerEvents: 'none' }}>
      {hole ? (
        <>
          {/* The dim, in four pieces around the element: the element itself stays clickable on action steps. */}
          <div className="pointer-events-auto fixed bg-scrim" style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} />
          <div className="pointer-events-auto fixed bg-scrim" style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <div className="pointer-events-auto fixed bg-scrim" style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} />
          <div className="pointer-events-auto fixed bg-scrim" style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          {/* The highlight box. On an info step it also stops stray clicks on the element. */}
          <div
            data-tour-box=""
            className={cn('fixed rounded-[10px] ring-2 ring-teal ring-offset-2 ring-offset-surface', step.action ? 'pointer-events-none' : 'pointer-events-auto')}
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-scrim" />
      )}
      {phone ? (
        <div className="fixed inset-x-2 bottom-2">{card}</div>
      ) : cardStyle ? (
        <div className="fixed" style={cardStyle}>
          {card}
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center p-4">{card}</div>
      )}
    </div>
  )
}
