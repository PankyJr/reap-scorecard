/**
 * The page's help data (what the page already loaded, for "next"), and the
 * open/close requests for the help panel. A tiny external store, so a server
 * page can hand data to the client panel through <PageHelpData> without any
 * new query and without context re-renders across the app.
 */
import type { PageKey } from '@/content/page-help'

export type RegisteredHelp = { page: PageKey; data: unknown; path: string }

type State = {
  registered: RegisteredHelp | null
  panel: { open: boolean; problem: string | null; nonce: number }
}

let state: State = { registered: null, panel: { open: false, problem: null, nonce: 0 } }
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }
  for (const l of listeners) l()
}

export const helpStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  get: () => state,
  register(entry: RegisteredHelp) {
    set({ registered: entry })
  },
  unregister(path: string) {
    if (state.registered?.path === path) set({ registered: null })
  },
  openPanel(problem: string | null = null) {
    set({ panel: { open: true, problem, nonce: state.panel.nonce + 1 } })
  },
  closePanel() {
    if (state.panel.open) set({ panel: { ...state.panel, open: false } })
  },
  togglePanel() {
    if (state.panel.open) helpStore.closePanel()
    else helpStore.openPanel()
  },
}

const SERVER_STATE: State = { registered: null, panel: { open: false, problem: null, nonce: 0 } }
export const serverHelpState = () => SERVER_STATE
