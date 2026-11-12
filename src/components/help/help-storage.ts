/**
 * Help state that only matters to this browser: finished tours, dismissed
 * tips, the dismissed getting-started checklist, and the tour in progress.
 * Everything is wrapped in try/catch: storage can be blocked (private mode,
 * strict settings) and help must still work, it just forgets.
 */

const PREFIX = 'reap-help:'

function read(key: string, store: 'local' | 'session' = 'local'): string | null {
  try {
    return (store === 'local' ? window.localStorage : window.sessionStorage).getItem(PREFIX + key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null, store: 'local' | 'session' = 'local') {
  try {
    const s = store === 'local' ? window.localStorage : window.sessionStorage
    if (value == null) s.removeItem(PREFIX + key)
    else s.setItem(PREFIX + key, value)
  } catch {
    // Storage blocked: nothing to remember.
  }
  notify()
}

const listeners = new Set<() => void>()
function notify() {
  for (const l of listeners) l()
}
/** For useSyncExternalStore: re-read when help state changes in this tab. */
export function subscribeHelpStorage(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const tourFinished = (tourId: string) => read(`tour-done:${tourId}`) === '1'
export const setTourFinished = (tourId: string, done: boolean) => write(`tour-done:${tourId}`, done ? '1' : null)

export const tipDismissed = (tipId: string) => read(`tip:${tipId}`) === '1'
export const dismissTip = (tipId: string) => write(`tip:${tipId}`, '1')

export const checklistDismissed = () => read('checklist-dismissed') === '1'
export const setChecklistDismissed = (value: boolean) => write('checklist-dismissed', value ? '1' : null)

/** Set when a report is opened, so "Download the report" can tick itself. */
export const reportOpened = () => read('report-opened') === '1'
export const markReportOpened = () => {
  if (!reportOpened()) write('report-opened', '1')
}

/** The tour in progress. Session storage: it survives page changes, not a new tab. */
export type ActiveTour = { id: string; index: number; path?: string }

/** The raw stored value: a stable string for useSyncExternalStore. */
export const readActiveTourRaw = () => read('active-tour', 'session')

export function parseActiveTour(raw: string | null): ActiveTour | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ActiveTour
    return typeof parsed?.id === 'string' && Number.isInteger(parsed.index) ? parsed : null
  } catch {
    return null
  }
}

export const readActiveTour = () => parseActiveTour(readActiveTourRaw())

export function writeActiveTour(tour: ActiveTour | null) {
  write('active-tour', tour ? JSON.stringify(tour) : null, 'session')
}
