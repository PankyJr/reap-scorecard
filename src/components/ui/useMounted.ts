import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/**
 * False during the server render and hydration, true after. For things only
 * the browser knows (the saved theme, the keyboard's platform) without a
 * hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false)
}

/** A browser-only value, with a stand-in for the server render. */
export function useBrowserValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noop, read, () => serverValue)
}
